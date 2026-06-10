import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ScrollTrigger } from './gsap'
import { onChaptersReady } from './chaptersReady'
import type { ChapterRectSnapshot } from './activeChapter'

interface ChapterLike {
  /** 章节 DOM id；必须能通过 document.getElementById 找到真实 section/footer */
  id: string
}

/**
 * @description 章节滚动测量快照，供 active chapter 和进度轨共用，避免多个组件各自读布局
 */
interface ChapterScrollSnapshot {
  /** 每个章节相对 viewport 的 top/bottom 边界 */
  rects: ChapterRectSnapshot[]
  /** 当前 viewport 高度，用于下游按同一帧基准计算进度 */
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

/**
 * @description 读取当前注册章节的 DOMRect，形成单一滚动布局快照
 * @dependencies 依赖 chapterIds 和真实 DOM section id
 * @performance 这是布局读取热点，只由一个 ScrollTrigger/rAF 统一触发，不允许各组件重复 getBoundingClientRect
 */
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

/**
 * @description 通知所有 useSyncExternalStore 订阅者读取最新章节快照
 */
function emit() {
  subscribers.forEach((subscriber) => subscriber())
}

/**
 * @description 在同一帧内更新章节位置和 viewport 高度快照
 * @dependencies 依赖 readRects 和 window.innerHeight
 * @performance 只在 ScrollTrigger update/refresh 或 resize 后执行，集中承担 B5 滚动单源测量成本
 */
function updateSnapshot() {
  frame = 0
  snapshot = {
    rects: readRects(),
    viewportHeight: window.innerHeight,
  }
  emit()
}

/**
 * @description 合并同一帧内的滚动/刷新/resize 请求，避免重复布局读取
 */
function scheduleUpdate() {
  window.cancelAnimationFrame(frame)
  frame = window.requestAnimationFrame(updateSnapshot)
}

/**
 * @description 懒创建全局章节测量 ScrollTrigger，等待章节 DOM ready 后再开始读布局
 * @dependencies 依赖 onChaptersReady 和 GSAP ScrollTrigger
 * @caveats 只有存在订阅者时才创建 trigger；无订阅者时 teardownIfIdle 会释放
 */
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

/**
 * @description 没有任何订阅者时释放 ScrollTrigger、resize listener 和待执行 rAF
 * @performance 保证进度条/active chapter 不在页面空闲或热更新后留下常驻滚动循环
 */
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

/**
 * @description useSyncExternalStore 的订阅入口，首次订阅时启动章节测量，取消最后一个订阅时停机
 */
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
