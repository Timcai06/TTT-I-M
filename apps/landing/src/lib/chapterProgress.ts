import type { ChapterRectSnapshot } from './activeChapter'

export function getChapterProgressSegmentEnd(
  rect: ChapterRectSnapshot,
  next: ChapterRectSnapshot | undefined,
  viewportHeight: number
) {
  if (!next || next.top <= rect.top) return rect.bottom - viewportHeight

  const nextBottomArrival = next.bottom - viewportHeight
  return nextBottomArrival > rect.top ? Math.min(next.top, nextBottomArrival) : next.top
}

/**
 * @description 计算右侧章节进度条每段的填充比例。
 *   使用视口顶部像素线作为滚动游标：每一像素滚动都会线性推进对应章节段，
 *   不再等视口中心进入后才更新，保证右侧轨道像真实页面滚动尺一样丝滑。
 * @dependencies `ChapterRectSnapshot`，通常来自 `useChapterScrollMetrics`
 * @performance / @caveats 纯函数，不读取 DOM；`height` 使用 `Math.max(1, ...)` 防止极端布局下除以 0。
 * @steps
 *   step1: 取视口顶部线（0px）作为像素级滚动游标
 *   step2: 每段终点优先取下一进度章节能实际抵达的边界；短章节用 bottom-viewportHeight
 *          兜住，避免 footer/contact 永远到不了 top 时上一段无法填满
 *   step3: 最后一段终点取 section bottom - viewportHeight，滚到底部时正好填满
 *   step4: 游标位于段内 → 按「当前章节 top → 段终点」线性映射到 0..1
 */
export function computeChapterProgressFills(
  rects: ChapterRectSnapshot[],
  viewportHeight: number
): number[] {
  const scrollLine = 0

  return rects.map((rect, index) => {
    const next = rects[index + 1]
    const segmentEnd = getChapterProgressSegmentEnd(rect, next, viewportHeight)

    if (segmentEnd <= scrollLine) return 1
    if (rect.top > scrollLine) return 0

    const distance = Math.max(1, segmentEnd - rect.top)
    return Math.min(1, Math.max(0, (scrollLine - rect.top) / distance))
  })
}
