import { useEffect, useState } from 'react'
import { preloadLazyChapters } from '../chapters/registry'
import { archiveImages } from '../data/frames'
import { photos } from '../data/life'
import { projects } from '../data/projects'

interface PreloadTask {
  id: string
  label: string
  load: () => Promise<void>
}

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

const HERO_TEXTURE = '/portrait/tim.jpg'
const FONT_READY_DEV_TIMEOUT_MS = 6000
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function srcSetUrls(srcSet: string) {
  return srcSet
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
}

function collectImageUrls() {
  const frameUrls = archiveImages.flatMap((image) => [
    image.src,
    ...srcSetUrls(image.srcSet),
  ])

  const projectUrls = projects.flatMap((project) =>
    project.media?.shots.flatMap((shot) => [shot.src]) ?? []
  )

  return unique([
    HERO_TEXTURE,
    '/portrait/about_me.jpg',
    ...photos.map((photo) => photo.src),
    ...projectUrls,
    ...frameUrls,
  ])
}

function loadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const complete = () => {
      if (settled) return
      settled = true
      resolve()
      if (typeof image.decode === 'function') {
        void image.decode().catch((error) => {
          if (import.meta.env.DEV) {
            console.warn(`[sitePreload] image loaded but decode() rejected for ${src}`, error)
          }
        })
      }
    }
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.onload = complete
    image.onerror = () => reject(new Error(`Failed to preload image: ${src}`))
    image.src = src

    if (image.complete) {
      image.onload = null
      image.onerror = null
      if (image.naturalWidth <= 0) {
        reject(new Error(`Failed to preload image: ${src}`))
        return
      }
      complete()
    }
  })
}

function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (import.meta.env.DEV) {
    return Promise.race([
      document.fonts.ready.then(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          console.warn(`[sitePreload] document.fonts.ready exceeded ${FONT_READY_DEV_TIMEOUT_MS}ms in dev; continuing with current font fallback.`)
          resolve()
        }, FONT_READY_DEV_TIMEOUT_MS)
      }),
    ])
  }
  return document.fonts.ready.then(() => undefined)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function createPreloadDebug(tasks: PreloadTask[]): PreloadDebugHandle | undefined {
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

  window.__portfolioPreloadDebug = {
    startedAt,
    tasks: entries,
    snapshot,
  }

  const report = (reason: string) => {
    const { failed, fulfilled, pending } = snapshot()
    const elapsed = Math.round(performance.now() - startedAt)
    console.groupCollapsed(
      `[sitePreload] ${reason}: ${fulfilled.length}/${entries.length} fulfilled, ${failed.length} rejected, ${pending.length} pending after ${elapsed}ms`
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
      console.info('Rejected preload tasks')
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
    window.setTimeout(() => report(`still blocking intro at ${delay}ms`), delay)
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

async function loadHeroTexture() {
  const THREE = await import('three')
  const texture = await new THREE.TextureLoader().loadAsync(HERO_TEXTURE)
  texture.dispose()
}

function createWholeSitePreloadTasks(): PreloadTask[] {
  const imageTasks = collectImageUrls().map((src) => ({
    id: `image:${src}`,
    label: src,
    load: () => loadImage(src),
  }))

  return [
    { id: 'chunks:chapters', label: 'chapters', load: preloadLazyChapters },
    { id: 'chunks:pretext', label: 'Pretext', load: () => import('@chenglou/pretext').then(() => undefined) },
    { id: 'chunks:text-particles', label: 'TextParticles', load: () => import('../components/TextParticles').then(() => undefined) },
    { id: 'texture:hero', label: 'hero texture', load: loadHeroTexture },
    { id: 'fonts:document', label: 'fonts', load: loadFonts },
    ...imageTasks,
  ]
}

export function useWholeSitePreload(): WholeSitePreloadState {
  const [tasks] = useState(createWholeSitePreloadTasks)
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
    const debug = createPreloadDebug(tasks)

    const running = tasks.map(async (task, index) => {
      try {
        await task.load()
        debug?.finish(index)
        completed += 1
        if (!cancelled) {
          setState((current) => ({
            ...current,
            completed,
            label: task.label,
          }))
        }
      } catch (error) {
        debug?.fail(index, error)
        if (!cancelled) {
          setState((current) => ({
            ...current,
            failed: current.failed.includes(task.id)
              ? current.failed
              : [...current.failed, task.id],
            label: task.label,
          }))
        }
        throw error
      }
    })

    void Promise.allSettled(running).then((results) => {
      if (cancelled) return

      const failed = results
        .map((result, index) => result.status === 'rejected' ? tasks[index]?.id : undefined)
        .filter((id): id is string => Boolean(id))

      if (failed.length > 0) {
        if (import.meta.env.DEV) {
          console.warn('[sitePreload] blocking intro because resources failed:', failed)
        }
        debug?.report('blocking intro because resources failed')
        setState((current) => ({
          ...current,
          failed,
          ready: false,
        }))
        return
      }

      setState({
        completed: tasks.length,
        failed: [],
        label: 'Ready',
        ready: true,
        total: tasks.length,
      })
      debug?.report('all preload tasks completed')
      debug?.stop()
    })

    return () => {
      cancelled = true
      debug?.stop()
    }
  }, [tasks])

  return state
}
