export const FRAME_SCROLL_TIMING = {
  distanceRatio: 0.52,
  minimumViewports: 3.75,
  maximumViewports: 6,
  exitBreathViewports: 0.35,
} as const

/**
 * Maps a wide horizontal archive onto a finite vertical reading window.
 * The rail still traverses its complete pixel distance; only the amount of
 * wheel travel required to do so is compressed and capped.
 */
export function computeFrameScrollDuration(horizontalDistance: number, viewportHeight: number): number {
  const safeDistance = Math.max(1, horizontalDistance)
  const safeViewport = Math.max(1, viewportHeight)
  const mappedDistance = safeDistance * FRAME_SCROLL_TIMING.distanceRatio
  const minimumDistance = safeViewport * FRAME_SCROLL_TIMING.minimumViewports
  const maximumDistance = safeViewport * FRAME_SCROLL_TIMING.maximumViewports
  const boundedDistance = Math.min(maximumDistance, Math.max(minimumDistance, mappedDistance))

  return Math.ceil(boundedDistance + safeViewport * FRAME_SCROLL_TIMING.exitBreathViewports)
}
