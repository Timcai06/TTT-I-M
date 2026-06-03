export interface ChapterRectSnapshot {
  id: string
  top: number
  bottom: number
}

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
