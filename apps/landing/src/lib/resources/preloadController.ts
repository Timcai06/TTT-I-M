import { useEffect, useState } from 'react'
import { requestScrollRefresh } from '../scroll/requestRefresh'
import { buildResourceManifest, type ResourceTask } from './manifest'
import { runTaskWithDeadline } from './taskDeadline'

// A stuck resource (hung socket, dead CDN) must never strand the intro on a
// black screen. Every task receives a child AbortSignal; a deadline cancels
// the underlying loader before becoming a non-fatal skip.
const TASK_TIMEOUT_MS = 12000

type PreloadTaskDebugStatus = 'pending' | 'fulfilled' | 'rejected'

/**
 * 单个预加载任务的调试快照。
 * 暴露为只读快照到 `window.__portfolioPreloadDebug`，用于定位 loader 卡住或资源超时。
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
 * @description 预加载诊断句柄。任务快照在所有构建中可读，stall console 报告仅在 DEV 启用。
 * @dependencies `performance.now`、`console.table`、`window.__portfolioPreloadDebug`
 * @performance / @caveats 生产环境只保留轻量内存快照，不启动 timer 或 console 报告。
 */
interface PreloadDebugHandle {
  fail: (index: number, error: unknown) => void
  finish: (index: number) => void
  report: (reason: string) => void
  stop: () => void
}

/**
 * 全站预加载状态。Loader 使用该状态驱动真实进度条，而不是播放假的 fixed-duration 进度。
 *
 * 闸门语义：`criticalReady` 只标记 SYSTEM 阶段结束；`renderReady` 才是 intro
 * 的退场闸门。后者表示 bounded landing manifest 已完成或按非致命容错跳过，
 * 包括当前设备实际选择的图片候选及其 decode。
 */
export interface WholeSitePreloadState {
  /** 已完成或已跳过的任务数量（critical + visual 全量）。 */
  completed: number
  /** critical 层已完成或已跳过的任务数量；进度条显示它。 */
  criticalCompleted: number
  /** critical 层是否全部结束 —— SYSTEM → ARCHIVE 的阶段标记。 */
  criticalReady: boolean
  /** critical 层任务总数。 */
  criticalTotal: number
  /** 非致命失败任务 id 列表；失败不会阻塞 ready。 */
  failed: string[]
  /** 当前完成任务的展示标签。 */
  label: string
  /** 是否已完成 critical + visual 全部任务 —— intro 的 render-ready 退场闸门。 */
  renderReady: boolean
  /** manifest 总任务数。 */
  total: number
}

const STALL_REPORT_DELAYS = [3000, 8000, 15000, 30000]

declare global {
  interface Window {
    __portfolioPreloadDebug?: {
      readonly startedAt: number
      readonly tasks: readonly Readonly<PreloadTaskDebugEntry>[]
      snapshot: () => {
        readonly failed: readonly Readonly<PreloadTaskDebugEntry>[]
        readonly fulfilled: readonly Readonly<PreloadTaskDebugEntry>[]
        readonly pending: readonly Readonly<PreloadTaskDebugEntry>[]
      }
    }
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * @description 创建预加载诊断器。所有构建都提供确定性的任务快照；DEV 额外定时输出
 *   pending / fulfilled / skipped 表格。
 * @dependencies `ResourceTask` manifest、浏览器 console API、`import.meta.env.DEV`
 * @performance / @caveats stall report timers 只在 DEV 创建，并在 hook cleanup/ready 后 stop。
 * @steps
 *   step1: 根据 manifest 初始化每个任务的 pending entry
 *   step2: 暴露 snapshot 到 window，便于人工排查
 *   step3: 注册多档 stall report timer
 *   step4: 返回 finish/fail/report/stop 方法供 preload 流程调用
 */
function createPreloadDebug(tasks: ResourceTask[]): PreloadDebugHandle | undefined {
  if (typeof window === 'undefined') return undefined

  const startedAt = performance.now()
  const entries: PreloadTaskDebugEntry[] = tasks.map((task) => ({
    id: task.id,
    label: task.label,
    startedAt,
    status: 'pending',
  }))

  const publicEntries = (status?: PreloadTaskDebugStatus) => Object.freeze(
    entries
      .filter((entry) => status === undefined || entry.status === status)
      .map((entry) => Object.freeze({ ...entry })),
  )
  const snapshot = () => Object.freeze({
    failed: publicEntries('rejected'),
    fulfilled: publicEntries('fulfilled'),
    pending: publicEntries('pending'),
  })

  window.__portfolioPreloadDebug = Object.freeze({
    startedAt,
    get tasks() { return publicEntries() },
    snapshot,
  })

  const report = (reason: string) => {
    if (!import.meta.env.DEV) return
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

  const timers = import.meta.env.DEV
    ? STALL_REPORT_DELAYS.map((delay) =>
        window.setTimeout(() => report(`still preparing at ${delay}ms`), delay)
      )
    : []

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

const VISUAL_CONCURRENCY = 8

/**
 * @description 图片解码任务完成后让 React/浏览器跨过两个绘制机会，再做一次最终
 * ScrollTrigger 全局测量。超时兜底覆盖后台标签页的 rAF 节流，避免 Loader 被布局
 * settle 永久卡住。
 */
function settleRenderLayout(signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false
    let firstFrame = 0
    let secondFrame = 0
    const cleanup = () => {
      window.clearTimeout(timeout)
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      signal.removeEventListener('abort', onAbort)
    }
    const finish = (refresh: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      if (refresh) requestScrollRefresh(true)
      resolve()
    }
    const onAbort = () => finish(false)
    const timeout = window.setTimeout(() => finish(true), 250)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    firstFrame = window.requestAnimationFrame(() => {
      firstFrame = 0
      secondFrame = window.requestAnimationFrame(() => finish(true))
    })
  })
}

/**
 * @description 全站资源预加载 hook。Loader 用 `renderReady` 门控 intro 退场；
 *   critical 先准备运行时，visual 随后按受控并发下载并解码当前设备会展示的资源。
 * @dependencies
 *   - `buildResourceManifest` 生成资源任务列表
 *   - `runTaskWithDeadline` 为每个任务提供可传播的取消和硬超时
 *   - DEV 环境下的 `createPreloadDebug`
 * @performance / @caveats
 *   - visual 并发固定为 8，在网络利用率和图片解码压力之间取平衡。
 *   - 任何单任务失败都只记录到 `failed`，不会让 intro 永久卡住；这是 Loader A1 黑屏修复的关键边界。
 *   - `tasks` 用 `useState(buildResourceManifest)` 固定一次，避免组件重渲染时重建 manifest 并重跑预加载。
 * @steps
 *   step1: 初始化 manifest 和可视化 preload state
 *   step2: critical indexes 全并发执行，结束即 criticalReady=true（切换到 ARCHIVE 阶段）
 *   step3: visual indexes 按 `VISUAL_CONCURRENCY` 分片执行并等待完成
 *   step4: 每个任务完成/跳过后更新 completed/criticalCompleted/label/failed
 *   step5: 全部结束后标记 renderReady=true（允许 intro 退场），并关闭 DEV debug timers
 */
export function useWholeSitePreload(): WholeSitePreloadState {
  const [tasks] = useState(buildResourceManifest)
  const [state, setState] = useState<WholeSitePreloadState>(() => ({
    completed: 0,
    criticalCompleted: 0,
    criticalReady: false,
    criticalTotal: tasks.filter((task) => task.tier === 'critical').length,
    failed: [],
    label: 'Preparing',
    renderReady: false,
    total: tasks.length,
  }))

  useEffect(() => {
    let cancelled = false
    let completed = 0
    let criticalCompleted = 0
    const failed: string[] = []
    const debug = createPreloadDebug(tasks)
    const lifecycle = new AbortController()

    const runTask = async (task: ResourceTask, index: number) => {
      try {
        await runTaskWithDeadline(task.load, TASK_TIMEOUT_MS, lifecycle.signal)
        debug?.finish(index)
      } catch (error) {
        if (lifecycle.signal.aborted) return
        // Non-fatal: a missing/slow resource is skipped, never a black screen.
        debug?.fail(index, error)
        if (!failed.includes(task.id)) failed.push(task.id)
        if (import.meta.env.DEV) {
          console.warn(`[resources] non-fatal skip: ${task.id}`, error)
        }
      } finally {
        completed += 1
        if (task.tier === 'critical') criticalCompleted += 1
        if (!cancelled) {
          setState((current) => ({
            ...current,
            completed,
            criticalCompleted,
            failed: [...failed],
            label: task.label,
          }))
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
    const visualIndexes = tasks
      .map((task, index) => (task.tier === 'visual' ? index : -1))
      .filter((index) => index >= 0)
    const run = async () => {
      await runGroup(criticalIndexes)
      // Runtime core is ready. Keep the intro mounted while the bounded visual
      // set is fetched and decoded; this removes the fast-scroll race entirely.
      if (!cancelled) {
        setState((current) => ({ ...current, criticalReady: true, label: 'Visual archive' }))
      }
      await runGroup(visualIndexes, VISUAL_CONCURRENCY)
      if (!cancelled) await settleRenderLayout(lifecycle.signal)
    }

    void run().then(() => {
      if (cancelled) return
      setState({
        completed,
        criticalCompleted,
        criticalReady: true,
        criticalTotal: criticalIndexes.length,
        failed: [...failed],
        label: 'Ready',
        renderReady: true,
        total: tasks.length,
      })
      debug?.report(failed.length > 0 ? `landing ready with ${failed.length} skipped` : 'whole-site preload completed')
      debug?.stop()
    })

    return () => {
      cancelled = true
      lifecycle.abort(new Error('Whole-site preload unmounted'))
      debug?.stop()
    }
  }, [tasks])

  return state
}
