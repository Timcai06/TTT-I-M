import { useMemo } from 'react'
import { pickActiveChapterId } from './activeChapter'
import { useChapterScrollMetrics } from './chapterScrollMetrics'

interface ChapterLike {
  id: string
}

export function useActiveChapter(chapters: ChapterLike[], fallbackId: string) {
  const { rects, viewportHeight } = useChapterScrollMetrics(chapters)
  return useMemo(() => (
    rects.length === 0 || viewportHeight <= 0
      ? fallbackId
      : pickActiveChapterId(rects, viewportHeight, fallbackId)
  ), [fallbackId, rects, viewportHeight])
}
