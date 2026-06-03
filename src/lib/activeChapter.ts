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
  const candidates = containing.length > 0 ? containing : rects

  let best = candidates[0]
  let bestDistance = Number.POSITIVE_INFINITY

  candidates.forEach((rect) => {
    const distance =
      rect.top <= center && rect.bottom >= center
        ? Math.abs((rect.top + rect.bottom) / 2 - center)
        : Math.min(Math.abs(rect.top - center), Math.abs(rect.bottom - center))

    if (distance < bestDistance) {
      best = rect
      bestDistance = distance
    }
  })

  return best?.id ?? fallbackId
}
