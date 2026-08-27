/**
 * @description 章节主题 token 的纯数据源。页面底色统一为纯黑，章节转场仍保留
 *   独立的 cover 色，使跨章节切换有辨识度但不会把页面切成不连续的色块。
 */
export interface ChapterTheme {
  /** 页面底色，写入 documentElement 的 --bg。 */
  bg: string
  /** 波浪转场的幕布主体色，同时作为后续章节星团的主题 tint 来源。 */
  cover: string
}

export const DEFAULT_THEME: ChapterTheme = { bg: '#000000', cover: '#4a130d' }

export const CHAPTER_THEMES: Record<string, ChapterTheme> = {
  hero: DEFAULT_THEME,
  about: { bg: '#000000', cover: '#4a260e' },
  frame: { bg: '#000000', cover: '#103823' },
  skills: { bg: '#000000', cover: '#4a130d' },
  projects: { bg: '#000000', cover: '#131626' },
  contact: DEFAULT_THEME,
}

export function getChapterTheme(id: string): ChapterTheme {
  return CHAPTER_THEMES[id] ?? DEFAULT_THEME
}
