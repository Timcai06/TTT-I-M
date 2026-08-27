/**
 * @description 章节主题 token 的纯数据源。页面底色统一为纯黑，章节转场仍保留
 *   独立的 cover 色，使跨章节切换有辨识度但不会把页面切成不连续的色块。
 *
 *   ⚠️ 关于 `bg` 的定位：当前所有章节的 `bg` 都恒为 `#000000`，因此全页背景始终是黑。
 *   这是**预留扩展点**，不是冗余 —— 将来要做背景色时，只需改这里的 `bg` 值（或做成动态），
 *   下游 `mixTheme` 插值 + `ChapterThemeDriver` 的 ——bg scrub 已就位，会自动连续生效，
 *   无需改动任何滚动/接线逻辑。请勿把 `bg` 当作无用字段删除。
 *
 *   而 `cover` 是**活动的**：它驱动章节转场的液体幕布颜色（`--transition-cover`，
 *   见 ChapterTransition / nav / glitch-text），是我们现在实际在变的部分。
 */
export interface ChapterTheme {
  /** 页面底色，写入 documentElement 的 --bg。当前恒为黑，属预留扩展点。 */
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
