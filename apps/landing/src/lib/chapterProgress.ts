import type { ChapterRectSnapshot } from './activeChapter'

/**
 * @description 计算右侧章节进度条每段的填充比例。
 *   与 active chapter 一样使用视口中心线作为判断基准，保证“当前章节”和“进度填充”不会各算各的。
 * @dependencies `ChapterRectSnapshot`，通常来自 `useChapterScrollMetrics`
 * @performance / @caveats 纯函数，不读取 DOM；`height` 使用 `Math.max(1, ...)` 防止极端布局下除以 0。
 * @steps
 *   step1: 取视口中心线
 *   step2: 中心线已经越过章节底部 → 进度为 1
 *   step3: 中心线尚未到达章节顶部 → 进度为 0
 *   step4: 中心线位于章节内部 → 按章节内部位置线性映射到 0..1
 */
export function computeChapterProgressFills(
  rects: ChapterRectSnapshot[],
  viewportHeight: number
): number[] {
  const center = viewportHeight / 2

  return rects.map((rect) => {
    if (rect.bottom <= center) return 1
    if (rect.top > center) return 0

    const height = Math.max(1, rect.bottom - rect.top)
    return Math.min(1, Math.max(0, (center - rect.top) / height))
  })
}
