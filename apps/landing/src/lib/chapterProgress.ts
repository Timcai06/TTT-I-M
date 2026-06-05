import type { ChapterRectSnapshot } from './activeChapter'

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
