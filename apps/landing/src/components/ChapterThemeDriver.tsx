import { useLayoutEffect } from 'react'
import { progressChapters } from '../chapters/registry'
import { useLandingScrollNarrative } from '../lib/useLandingScrollNarrative'

const sections = progressChapters.map((chapter) => ({ id: chapter.id }))
const fallbackId = sections[0]?.id ?? 'hero'

/**
 * @description 章节色温驱动器 —— 订阅 landing narrative，把滚轮所在章节段的
 *   混合色直接写入 `--bg`。它不再等 activeId 变化后补 tween，因此背景会跟随
 *   真实滚动像素连续变化。
 * @dependencies `useLandingScrollNarrative`、章节 registry、CSS token `--bg`
 * @performance / @caveats 不创建 ScrollTrigger；每次写 CSS 变量都来自共享快照。
 */
export default function ChapterThemeDriver() {
  const { theme } = useLandingScrollNarrative(sections, fallbackId)

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--bg', theme.bg)
  }, [theme.bg])

  return null
}
