import { useEffect, useState } from 'react'
import { buildResourceManifest, type ResourceTask } from './manifest'

// A stuck resource (hung socket, dead CDN) must never strand the intro on a
// black screen. Every task races this timeout; on timeout it's treated as a
// non-fatal skip so the gate keeps moving. This is the A1 fix: previously a
// single failed/404 image left `ready:false` forever.
const TASK_TIMEOUT_MS = 12000

type PreloadTaskDebugStatus = 'pending' | 'fulfilled' | 'rejected'

/**
 * 单个预加载任务的调试快照。
 * 仅在 DEV 暴露到 `window.__portfolioPreloadDebug`，用于定位 loader 卡住或资源超时。
 */
interface PreloadTaskDebugEntry {
  /** 任务耗时，单位 ms；任务结束后写入。 */
  durationMs?: number
  /** performance.now() 时间戳；任务结束后写入。 */
  endedAt?: number
  /** rejected/timeout 时的错误文案。 */
  error?: string
  /** ResourceTask 的稳定 id。 */
  id: string
  /** Loader 左下角展示的资源阶段标签。 */
  label: string
  /** performance.now() 起始时间。 */
  startedAt: number
  /** 当前任务状态；rejected 在本预加载器中表示“非致命跳过”。 */
  status: PreloadTaskDebugStatus
}

/**
 * @description DEV 调试句柄。把预加载任务状态同步到全局窗口对象，便于在浏览器控制台排查真实进度。
 * @dependencies `performance.now`、`console.table`、`window.__portfolioPreloadDebug`
 * @performance / @caveats 仅 DEV 创建；生产环境不会挂载全局对象，也不会启动 stall report timers。
 */
interface PreloadDebugHandle {
  fail: (index: number, error: unknown) => void
  finish: (index: number) => void
  report: (reason: string) => void
  stop: () => void
}

/**
 * 全站预加载状态。Loader 使用该状态驱动真实进度条，而不是播放假的 fixed-duration 进度。
 */
export interface WholeSitePreloadState {
  /** 已完成或已跳过的任务数量。 */
  completed: number
  /** 非致命失败任务 id 列表；失败不会阻塞 ready。 */
  failed: string[]
  /** 当前完成任务的展示标签。 */
  label: string
  /** 是否已完成 critical + deferred 全部门控任务。 */
  ready: boolean
  /** manifest 总任务数。 */
  total: number
}

const STALL_REPORT_DELAYS = [3000, 8000, 15000, 30000]

declare global {
  interface Window {
    __portfolioPreloadDebug?: {
      startedAt: number
      tasks: PreloadTaskDebugEntry[]
      snapshot: () => {
        failed: PreloadTaskDebugEntry[]
        fulfilled: PreloadTaskDebugEntry[]
        pending: PreloadTaskDebugEntry[]
      }
    }
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * @description 为单个资源任务增加硬超时，防止 hung socket、坏 CDN 或图片 decode 卡住 Loader。
 * @dependencies 浏览器 `window.setTimeout`
 * @performance / @caveats 超时后 reject，由上层 `runTask` 记录为非致命失败；不要在这里吞错，
 *   否则 debug 面板无法区分真实成功和跳过。
 */
function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    promise.then(
      () => { window.clearTimeout(timer); resolve() },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    )
  })
}

/**
 * @description 创建 DEV-only 预加载调试器。
 *   定时输出 pending / fulfilled / skipped 表格，并提供 `window.__portfolioPreloadDebug.snapshot()` 手动读取。
 * @dependencies `ResourceTask` manifest、浏览器 console API、`import.meta.env.DEV`
 * @performance / @caveats stall report timers 必须在 hook cleanup 和 ready 后 stop，避免热更新时重复输出。
 * @steps
 *   step1: 根据 manifest 初始化每个任务的 pending entry
 *   step2: 暴露 snapshot 到 window，便于人工排查
 *   step3: 注册多档 stall report timer
 *   step4: 返回 finish/fail/report/stop 方法供 preload 流程调用
 */
function createPreloadDebug(tasks: ResourceTask[]): PreloadDebugHandle | undefined {
  if (!import.meta.env.DEV || typeof window === 'undefined') return undefined

  const startedAt = performance.now()
  const entries: PreloadTaskDebugEntry[] = tasks.map((task) => ({
    id: task.id,
    label: task.label,
    startedAt,
    status: 'pending',
  }))

  const snapshot = () => ({
    failed: entries.filter((entry) => entry.status === 'rejected'),
    fulfilled: entries.filter((entry) => entry.status === 'fulfilled'),
    pending: entries.filter((entry) => entry.status === 'pending'),
  })

  window.__portfolioPreloadDebug = { startedAt, tasks: entries, snapshot }

  const report = (reason: string) => {
    const { failed, fulfilled, pending } = snapshot()
    const elapsed = Math.round(performance.now() - startedAt)
    console.groupCollapsed(
      `[resources] ${reason}: ${fulfilled.length}/${entries.length} fulfilled, ${failed.length} skipped, ${pending.length} pending after ${elapsed}ms`
    )
    if (pending.length > 0) {
      console.info('Pending preload tasks')
      console.table(pending.map(({ id, label, startedAt: taskStartedAt, status }) => ({
        id,
        label,
        pendingMs: Math.round(performance.now() - taskStartedAt),
        status,
      })))
    }
    if (failed.length > 0) {
      console.info('Skipped (non-fatal) preload tasks')
      console.table(failed.map(({ durationMs, error, id, label, status }) => ({
        durationMs,
        error,
        id,
        label,
        status,
      })))
    }
    console.info('Inspect manually with window.__portfolioPreloadDebug.snapshot()')
    console.groupEnd()
  }

  const timers = STALL_REPORT_DELAYS.map((delay) =>
    window.setTimeout(() => report(`still preparing at ${delay}ms`), delay)
  )

  return {
    fail(index, error) {
      const entry = entries[index]
      if (!entry) return
      entry.status = 'rejected'
      entry.endedAt = performance.now()
      entry.durationMs = Math.round(entry.endedAt - entry.startedAt)
      entry.error = errorMessage(error)
    },
    finish(index) {
      const entry = entries[index]
      if (!entry) return
      entry.status = 'fulfilled'
      entry.endedAt = performance.now()
      entry.durationMs = Math.round(entry.endedAt - entry.startedAt)
    },
    report,
    stop() {
      timers.forEach((timer) => window.clearTimeout(timer))
    },
  }
}

const DEFERRED_CONCURRENCY = 6

/**
 * @description 全站资源预加载 hook。Loader 用它门控完整 landing manifest：
 *   先加载 critical runtime 资源，再按并发队列加载 deferred 图片/模块，确保快速滚入 Frame 时不出现空图。
 * @dependencies
 *   - `buildResourceManifest` 生成资源任务列表
 *   - `withTimeout` 为每个任务提供硬超时
 *   - DEV 环境下的 `createPreloadDebug`
 * @performance / @caveats
 *   - deferred 并发固定为 6，避免大量图片同时 fetch/decode 形成 CPU/GPU decode 风暴。
 *   - 任何单任务失败都只记录到 `failed`，不会让 intro 永久卡住；这是 Loader A1 黑屏修复的关键边界。
 *   - `tasks` 用 `useState(buildResourceManifest)` 固定一次，避免组件重渲染时重建 manifest 并重跑预加载。
 * @steps
 *   step1: 初始化 manifest 和可视化 preload state
 *   step2: critical indexes 全并发执行，保证核心 runtime 先就绪
 *   step3: deferred indexes 按 `DEFERRED_CONCURRENCY` 分片执行
 *   step4: 每个任务完成/跳过后更新 completed/label/failed
 *   step5: 全部结束后标记 ready=true，并关闭 DEV debug timers
 */
export function useWholeSitePreload(): WholeSitePreloadState {
  const [tasks] = useState(buildResourceManifest)
  const [state, setState] = useState<WholeSitePreloadState>(() => ({
    completed: 0,
    failed: [],
    label: 'Preparing',
    ready: false,
    total: tasks.length,
  }))

  useEffect(() => {
    let cancelled = false
    let completed = 0
    const failed: string[] = []
    const debug = createPreloadDebug(tasks)

    const runTask = async (task: ResourceTask, index: number) => {
      try {
        await withTimeout(task.load(), TASK_TIMEOUT_MS)
        debug?.finish(index)
      } catch (error) {
        // Non-fatal: a missing/slow resource is skipped, never a black screen.
        debug?.fail(index, error)
        if (!failed.includes(task.id)) failed.push(task.id)
        if (import.meta.env.DEV) {
          console.warn(`[resources] non-fatal skip: ${task.id}`, error)
        }
      } finally {
        completed += 1
        if (!cancelled) {
          setState((current) => ({ ...current, completed, failed: [...failed], label: task.label }))
        }
      }
    }

    const runGroup = async (indexes: number[], concurrency = indexes.length) => {
      let cursor = 0
      const workers = Array.from({ length: Math.max(1, Math.min(concurrency, indexes.length)) }, async () => {
        while (!cancelled) {
          const index = indexes[cursor]
          cursor += 1
          if (index === undefined) return

          const task = tasks[index]
          if (task) await runTask(task, index)
        }
      })

      await Promise.all(workers)
    }

    const criticalIndexes = tasks
      .map((task, index) => (task.tier === 'critical' ? index : -1))
      .filter((index) => index >= 0)
    const deferredIndexes = tasks
      .map((task, index) => (task.tier === 'deferred' ? index : -1))
      .filter((index) => index >= 0)
    const run = async () => {
      await runGroup(criticalIndexes)
      await runGroup(deferredIndexes, DEFERRED_CONCURRENCY)
    }

    void run().then(() => {
      if (cancelled) return
      setState({
        completed,
        failed: [...failed],
        label: 'Ready',
        ready: true,
        total: tasks.length,
      })
      debug?.report(failed.length > 0 ? `landing ready with ${failed.length} skipped` : 'whole-site preload completed')
      debug?.stop()
    })

    return () => {
      cancelled = true
      debug?.stop()
    }
  }, [tasks])

  return state
}
