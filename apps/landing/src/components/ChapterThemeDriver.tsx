import { useEffect } from 'react'
import { useChapterState } from '../lib/chapterState'
import { applyChapterTheme } from '../lib/chapterTheme'

/**
 * @description 章节色温驱动器 —— 订阅共享章节状态，激活章节变化时把对应色温
 *   插值到页面底色。渲染为 null：它只是把「章节状态 → 主题」的桥接放进
 *   ChapterStateProvider 的订阅树里，复用唯一的 ScrollTrigger 度量源，
 *   不新建任何滚动监听。
 * @dependencies useChapterState（共享章节状态）、applyChapterTheme（GSAP 颜色插值）
 */
export default function ChapterThemeDriver() {
  const { activeId } = useChapterState()

  useEffect(() => {
    applyChapterTheme(activeId)
  }, [activeId])

  return null
}
