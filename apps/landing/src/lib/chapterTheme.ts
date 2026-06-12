import { gsap } from './gsap'
import { prefersReducedMotion } from './motion'

/**
 * @description 章节色温系统 —— 每个章节定义一组「近黑但色温不同」的页面底色，
 *   随激活章节切换在 `--bg` 上做 1.4s 的颜色插值（vault 的 Toggle 滚动变体：
 *   持久状态切换，不做 scrub）。同时为波浪转场提供每章的幕布主体色，
 *   转场颜色预告目的地，让全站颜色参与叙事。
 *
 * @caveats
 *   - 所有 bg 必须保持近黑（L < 8%）：grain 的 mix-blend-overlay、粒子层与照片
 *     都假设深色底；色温只能「微倾」，不能「变亮」。
 *   - cover 必须保持深色高饱和（cream 前导边与白色章节名落在其上要可读）。
 *   - `--bg` 的声明仍然只在 @timcai/tokens（单源守卫管它）；这里只在运行时
 *     对 documentElement 内联插值，不新增 CSS 声明。
 */
export interface ChapterTheme {
  /** 页面底色（近黑色温变体），写入 documentElement 的 --bg。 */
  bg: string
  /** 波浪转场的幕布主体色（跳往该章节时使用）。 */
  cover: string
}

export const DEFAULT_THEME: ChapterTheme = { bg: '#0a0a0a', cover: '#4a130d' }

export const CHAPTER_THEMES: Record<string, ChapterTheme> = {
  hero: DEFAULT_THEME,
  /** 暖纸色倾 —— 自述与生活影像（life 不参与激活，顺势沿用 about 的暖底）。 */
  about: { bg: '#0e0b09', cover: '#4a260e' },
  /** 苔绿冷倾 —— 摄影档案的 scenery/building 气质。 */
  frame: { bg: '#090d0b', cover: '#103823' },
  /** 余烬红倾 —— 呼应 Skills 的红色流线。 */
  skills: { bg: '#100a09', cover: '#4a130d' },
  /** 纯墨 —— 全站最深处，给 Work 高潮拉对比。 */
  projects: { bg: '#060607', cover: '#131626' },
  contact: DEFAULT_THEME,
}

export function getChapterTheme(id: string): ChapterTheme {
  return CHAPTER_THEMES[id] ?? DEFAULT_THEME
}

/**
 * 把激活章节的色温插值到页面底色。重复调用同一章节是 no-op（overwrite 处理）；
 * 降动用户直接落到目标色，不做过渡。
 */
export function applyChapterTheme(id: string) {
  const theme = getChapterTheme(id)
  gsap.to(document.documentElement, {
    '--bg': theme.bg,
    duration: prefersReducedMotion() ? 0 : 1.4,
    ease: 'sine.inOut',
    overwrite: 'auto',
  })
}
