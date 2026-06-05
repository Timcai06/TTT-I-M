import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ScrollTrigger } from './gsap'
import { onChaptersReady } from './chaptersReady'
import type { ChapterRectSnapshot } from './activeChapter'

interface ChapterLike {
  id: string
}

interface ChapterScrollSnapshot {
  rects: ChapterRectSnapshot[]
  viewportHeight: number
}

const emptySnapshot: ChapterScrollSnapshot = {
  rects: [],
  viewportHeight: 0,
}

let chapterIds: string[] = []
let frame = 0
let snapshot = emptySnapshot
let trigger: ScrollTrigger | null = null
let cancelReady: (() => void) | null = null

const subscribers = new Set<() => void>()

function readRects(): ChapterRectSnapshot[] {
  return chapterIds.map((id) => {
    const el = document.getElementById(id)
    const rect = el?.getBoundingClientRect()
    return {
      id,
      top: rect?.top ?? Number.POSITIVE_INFINITY,
      bottom: rect?.bottom ?? Number.POSITIVE_INFINITY,
    }
  })
}

function emit() {
  subscribers.forEach((subscriber) => subscriber())
}

function updateSnapshot() {
  frame = 0
  snapshot = {
    rects: readRects(),
    viewportHeight: window.innerHeight,
  }
  emit()
}

function scheduleUpdate() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(updateSnapshot)
}

function ensureTrigger() {
  if (trigger || cancelReady || typeof window === 'undefined') return

  cancelReady = onChaptersReady(() => {
    updateSnapshot()
    trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      invalidateOnRefresh: true,
      onUpdate: scheduleUpdate,
      onRefresh: scheduleUpdate,
    })
    window.addEventListener('resize', scheduleUpdate)
  })
}

function teardownIfIdle() {
  if (subscribers.size > 0) return

  window.cancelAnimationFrame(frame)
  frame = 0
  trigger?.kill()
  trigger = null
  cancelReady?.()
  cancelReady = null
  window.removeEventListener('resize', scheduleUpdate)
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  ensureTrigger()
  scheduleUpdate()

  return () => {
    subscribers.delete(callback)
    teardownIfIdle()
  }
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return emptySnapshot
}

export function useChapterScrollMetrics(chapters: ChapterLike[]) {
  const ids = useMemo(() => chapters.map((chapter) => chapter.id), [chapters])

  useEffect(() => {
    chapterIds = ids
    scheduleUpdate()
  }, [ids])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
