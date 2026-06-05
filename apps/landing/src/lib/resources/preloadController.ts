import { useEffect, useState } from 'react'
import { buildResourceManifest, type ResourceTask } from './manifest'

// A stuck resource (hung socket, dead CDN) must never strand the intro on a
// black screen. Every task races this timeout; on timeout it's treated as a
// non-fatal skip so the gate keeps moving. This is the A1 fix: previously a
// single failed/404 image left `ready:false` forever.
const TASK_TIMEOUT_MS = 12000

type PreloadTaskDebugStatus = 'pending' | 'fulfilled' | 'rejected'

interface PreloadTaskDebugEntry {
  durationMs?: number
  endedAt?: number
  error?: string
  id: string
  label: string
  startedAt: number
  status: PreloadTaskDebugStatus
}

interface PreloadDebugHandle {
  fail: (index: number, error: unknown) => void
  finish: (index: number) => void
  report: (reason: string) => void
  stop: () => void
}

export interface WholeSitePreloadState {
  completed: number
  failed: string[]
  label: string
  ready: boolean
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

/**
 * Whole-site preload, tiered and failure-tolerant.
 *
 * The intro only gates critical work. Deferred images are intentionally left to
 * native lazy loading and section-level near-viewport warmup, so the first few
 * seconds do not concentrate a whole-site image decode/fetch storm on the main
 * thread. Every gated task is timeout-bounded and non-fatal: failures are
 * recorded and skipped rather than blocking the intro forever.
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

    const runGroup = (indexes: number[]) =>
      Promise.all(indexes.map((index) => {
        const task = tasks[index]
        return task ? runTask(task, index) : Promise.resolve()
      }))

    const criticalIndexes = tasks
      .map((task, index) => (task.tier === 'critical' ? index : -1))
      .filter((index) => index >= 0)
    const run = async () => {
      await runGroup(criticalIndexes)
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
      debug?.report(failed.length > 0 ? `critical ready with ${failed.length} skipped` : 'critical preload completed')
      debug?.stop()
    })

    return () => {
      cancelled = true
      debug?.stop()
    }
  }, [tasks])

  return state
}
