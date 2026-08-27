import { navChapters, progressChapters } from '../chapters/registry'

/**
 * @description 全页滚动叙事的**追踪集合**单一事实源。
 *   以前 ChapterStateProvider / ChapterThemeDriver / ScrollIndicator 各自用
 *   `nav+progress 去重` / `progressChapters` 拼出一个追踪数组 —— 三者今天恰好相等，
 *   但未来只要新增「仅 nav、无 progress」的章节就会让 activeId 与色温/轨道分叉。
 *   这里统一从 registry 派生成一份，供三处消费。
 *
 *   注意：`life` / `work-transition` 这类 interstitial 章节**刻意**不在此集合中
 *   （无 nav 也无 progress），因此滑动过它们时 active/色温会定格在前一个被追踪的章节。
 *
 * @dependencies `chapters/registry` 的 navChapters / progressChapters
 * @performance / @caveats 纯模块常量，不读 DOM；顺序 = registry 文档序（nav+progress 去重），
 *   与 ScrollIndicator 的展示分段顺序保持一致，保证 progressFills 下标对齐。
 */
export const narrativeChapterIds = [
  ...new Map([...navChapters, ...progressChapters].map((chapter) => [chapter.id, chapter.id])).values(),
]

/** 供 `useLandingScrollNarrative` 测量的 `{id}[]`。 */
export const narrativeChapters: { id: string }[] = narrativeChapterIds.map((id) => ({ id }))

/** progress 章节的 index/name，供 ScrollIndicator 展示；无 progress 的章节回退为空。 */
export const narrativeProgressById: Record<string, { index: string; name: string }> = {}
for (const chapter of progressChapters) {
  if (chapter.progress) {
    narrativeProgressById[chapter.id] = chapter.progress
  }
}
