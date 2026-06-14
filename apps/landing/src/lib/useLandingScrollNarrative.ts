import { useMemo } from 'react'
import { resolveLandingScrollNarrative, type LandingScrollNarrative } from './landingScrollNarrative.ts'
import { useChapterScrollMetrics } from './chapterScrollMetrics.ts'

interface ChapterLike {
  id: string
}

/**
 * @description React 入口：把单一章节测量源转换成全页滚动叙事状态。
 *   Provider、右侧进度条、背景色温和 Continuum 都应使用这个 hook，
 *   避免各自用 activeId / progress / theme 创建分叉事实。
 * @dependencies `useChapterScrollMetrics`、`resolveLandingScrollNarrative`
 * @performance / @caveats hook 本身不读取 DOM；布局读取仍集中在 `chapterScrollMetrics` 的单 ScrollTrigger。
 */
export function useLandingScrollNarrative(
  chapters: ChapterLike[],
  fallbackId: string
): LandingScrollNarrative {
  const { rects, viewportHeight } = useChapterScrollMetrics(chapters)

  return useMemo(() => (
    resolveLandingScrollNarrative(rects, viewportHeight, fallbackId)
  ), [fallbackId, rects, viewportHeight])
}
