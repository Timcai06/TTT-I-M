/**
 * @description 章节主题 token 的纯数据源。页面背景、章节转场和 Particle Continuum
 *   都从这里读取同一组颜色，避免同一章节在不同系统里出现两套主题色。
 */
export interface ChapterTheme {
  /** 页面底色（近黑色温变体），写入 documentElement 的 --bg。 */
  bg: string
  /** 波浪转场的幕布主体色，同时作为后续章节星团的主题 tint 来源。 */
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
