/** 章节在当前视口坐标系中的矩形快照。由 `chapterScrollMetrics` 单源读取，避免多组件重复 layout read。 */
export interface ChapterRectSnapshot {
  /** 章节 id，对应 DOM section 的 id。 */
  id: string
  /** getBoundingClientRect().top，单位 px。 */
  top: number
  /** getBoundingClientRect().bottom，单位 px。 */
  bottom: number
}

/**
 * @description 根据章节矩形快照选择当前 active chapter。
 *   业务规则以视口中心线为准：中心线落在哪个章节内，哪个章节就是当前章节；多个重叠时选中心距离最近者。
 * @dependencies 由 `useChapterScrollMetrics` 提供的批量 rect 快照
 * @performance / @caveats 函数为纯计算，不读取 DOM；必须保持纯函数形态，方便 ScrollIndicator/Nav 共用同一数据源。
 * @steps
 *   step1: 计算视口中心线 `viewportHeight / 2`
 *   step2: 找出包含中心线的章节；若没有，则回退到已越过中心线的最后一个章节
 *   step3: 多个章节同时包含中心线时，选择章节中心距离视口中心最近的一个
 */
export function pickActiveChapterId(
  rects: ChapterRectSnapshot[],
  viewportHeight: number,
  fallbackId: string
): string {
  if (rects.length === 0) return fallbackId

  const center = viewportHeight / 2
  const containing = rects.filter((rect) => rect.top <= center && rect.bottom >= center)
  if (containing.length === 0) {
    const started = rects.filter((rect) => rect.top <= center)
    return started.at(-1)?.id ?? rects[0]?.id ?? fallbackId
  }

  let best = containing[0]
  let bestDistance = Number.POSITIVE_INFINITY

  containing.forEach((rect) => {
    const distance = Math.abs((rect.top + rect.bottom) / 2 - center)

    if (distance < bestDistance) {
      best = rect
      bestDistance = distance
    }
  })

  return best?.id ?? fallbackId
}
