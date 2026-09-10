import { useEffect, useState } from 'react'
import { requestScrollRefresh } from '../scroll/requestRefresh'
import { buildResourceManifest, type ResourceTask } from './manifest'
import { isReadingFallbackReady } from './preloadReadiness'
import { runTaskWithDeadline } from './taskDeadline'

// A stuck resource (hung socket, dead CDN) must never strand the intro on a
// black screen. Every task receives a child AbortSignal; a deadline cancels
// the underlying loader and exposes retry UI instead of silently opening an incomplete site.
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
  /** 当前任务状态；rejected 在本预加载器中表示“准备失败，等待重试”。 */
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
 * 闸门语义：`criticalReady` 只标记 SYSTEM 阶段结束；`renderReady` 表示
 * bounded landing manifest 已全部成功。只有空间 renderer 单项失败且其余
 * 正文与布局任务全部成功时，`readingFallbackReady` 才允许退到阅读模式。
 */
export interface WholeSitePreloadState {
  preparationFinished: boolean
  /** 已结束的任务数量（critical + visual 全量）。 */
  completed: number
  /** critical 层已结束的任务数量；进度条显示它。 */
  criticalCompleted: number
  /** critical 层是否全部结束 —— SYSTEM → ARCHIVE 的阶段标记。 */
  criticalReady: boolean
  /** critical 层任务总数。 */
  criticalTotal: number
  /** 失败任务 id 列表；失败阻止正常退场，并显示重新加载入口。 */
  failed: string[]
  /** 当前完成任务的展示标签。 */
  label: string
  /** 是否已完成 critical + visual 全部任务 —— intro 的 render-ready 退场闸门。 */
  renderReady: boolean
  /** 空间不可用但完整正文与布局均可用，可明确退到阅读模式。 */
  readingFallbackReady: boolean
  /** manifest 总任务数。 */
  total: number
  /** Weighted equivalents of completed/failed/total, plus live sub-task progress.
   *  The intro bar reads these instead of the counts: ~55 fast image fetches and
   *  one 22.9 MB model are not the same fraction of the wait. */
  completedWeight: number
  failedWeight: number
  totalWeight: number
  partialWeight: number
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
 *   pending / fulfilled / failed 表格。
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
      `[resources] ${reason}: ${fulfilled.length}/${entries.length} fulfilled, ${failed.length} failed, ${pending.length} pending after ${elapsed}ms`
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
      console.info('Failed preload tasks')
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
 *   - 任何单任务失败都记录到 `failed`，完成后显示重试入口；不能把失败伪装为就绪。
 *   - `tasks` 用 `useState(buildResourceManifest)` 固定一次，避免组件重渲染时重建 manifest 并重跑预加载。
 * @steps
 *   step1: 初始化 manifest 和可视化 preload state
 *   step2: critical indexes 全并发执行，结束即 criticalReady=true（切换到 ARCHIVE 阶段）
 *   step3: visual indexes 按 `VISUAL_CONCURRENCY` 分片执行并等待完成
 *   step4: 每个任务完成/跳过后更新 completed/criticalCompleted/label/failed
 *   step5: 全部成功后才标记 renderReady（允许 intro 退场），并关闭 DEV debug timers
 */
export function useWholeSitePreload(): WholeSitePreloadState {
  const [tasks] = useState(buildResourceManifest)
  const [state, setState] = useState<WholeSitePreloadState>(() => ({
    preparationFinished: false,
    completed: 0,
    criticalCompleted: 0,
    criticalReady: false,
    criticalTotal: tasks.filter((task) => task.tier === 'critical').length,
    failed: [],
    label: 'Preparing',
    renderReady: false,
    readingFallbackReady: false,
    total: tasks.length,
    completedWeight: 0,
    failedWeight: 0,
    totalWeight: tasks.reduce((sum, task) => sum + (task.weight ?? 1), 0),
    partialWeight: 0,
  }))

  useEffect(() => {
    let cancelled = false
    let completed = 0
    let criticalCompleted = 0
    let completedWeight = 0
    let failedWeight = 0
    const totalWeight = tasks.reduce((sum, task) => sum + (task.weight ?? 1), 0)
    const running = new Set<ResourceTask>()
    const failed: string[] = []
    // Sub-task progress for anything big enough that "finished" is too coarse a
    // signal. Only the room model reports it today; the loop is generic so the
    // controller never has to know which task that is.
    const livePartialWeight = () => {
      let partial = 0
      for (const task of running) if (task.progress) {
        const value = task.progress()
        if (Number.isFinite(value)) partial += (task.weight ?? 1) * Math.max(0, Math.min(1, value))
      }
      return partial
    }
    let partialFrame = 0
    let lastPartial = 0
    const pumpPartial = () => {
      partialFrame = 0
      if (cancelled) return
      const partial = livePartialWeight()
      // Only repaint on a move the bar can actually show, so a 22.9 MB stream
      // does not re-render React on every chunk.
      if (Math.abs(partial - lastPartial) > totalWeight * .002) {
        lastPartial = partial
        setState((current) => ({ ...current, partialWeight: partial }))
      }
      let pending = false
      for (const task of running) if (task.progress) pending = true
      if (pending) partialFrame = requestAnimationFrame(pumpPartial)
    }
    const debug = createPreloadDebug(tasks)
    const lifecycle = new AbortController()

    // A critical task is what the first paint and the six chapters are made of, so
    // a single transient network hiccup must not end the run — that is exactly the
    // case where a reader hit the retry panel and a plain refresh then worked.
    const CRITICAL_ATTEMPTS = 3
    const runTask = async (task: ResourceTask, index: number) => {
      running.add(task)
      if (task.progress) pumpPartial()
      try {
        const attempts = task.tier === 'critical' ? CRITICAL_ATTEMPTS : 1
        let lastError: unknown
        for (let attempt = 0; attempt < attempts; attempt++) {
          try {
            await runTaskWithDeadline(task.load, task.timeoutMs ?? TASK_TIMEOUT_MS, lifecycle.signal)
            lastError = undefined
            break
          } catch (error) {
            lastError = error
            if (lifecycle.signal.aborted || attempt === attempts - 1) break
            await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)))
            if (lifecycle.signal.aborted) break
          }
        }
        if (lastError) throw lastError
        debug?.finish(index)
      } catch (error) {
        if (lifecycle.signal.aborted) { running.delete(task); return }
        // Non-fatal: a missing/slow resource is failed, never a black screen.
        debug?.fail(index, error)
        if (!failed.includes(task.id)) { failed.push(task.id); failedWeight += task.weight ?? 1 }
        if (import.meta.env.DEV) {
          console.warn(`[resources] preparation failed: ${task.id}`, error)
        }
      } finally {
        running.delete(task)
        completed += 1
        completedWeight += task.weight ?? 1
        if (task.tier === 'critical') criticalCompleted += 1
        if (!cancelled) {
          setState((current) => ({
            ...current,
            completed,
            criticalCompleted,
            completedWeight,
            failedWeight,
            totalWeight,
            partialWeight: livePartialWeight(),
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

    const optionalTaskIds = new Set(tasks.filter((task) => task.optional).map((task) => task.id))
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
      const readingFallbackReady = isReadingFallbackReady({ completed, total: tasks.length, failed, optional: optionalTaskIds })
      cancelAnimationFrame(partialFrame)
      setState({
        completedWeight,
        failedWeight,
        totalWeight,
        partialWeight: 0,
        preparationFinished: true,
        completed,
        criticalCompleted,
        criticalReady: true,
        criticalTotal: criticalIndexes.length,
        failed: [...failed],
        label: failed.length > 0 ? 'Preparation incomplete' : 'Ready',
        renderReady: failed.length === 0,
        readingFallbackReady,
        total: tasks.length,
      })
      debug?.report(failed.length > 0 ? `preparation failed for ${failed.length} tasks` : 'whole-site preload completed')
      debug?.stop()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(partialFrame)
      lifecycle.abort(new Error('Whole-site preload unmounted'))
      debug?.stop()
    }
  }, [tasks])

  return state
}
