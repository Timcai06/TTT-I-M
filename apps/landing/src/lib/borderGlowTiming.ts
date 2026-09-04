export interface BorderGlowSweepSample {
  angle: number
  complete: boolean
  proximity: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3
const easeInCubic = (value: number) => value ** 3

/** One deterministic clock for the complete 4s border sweep choreography. */
export function sampleBorderGlowSweep(elapsedMs: number): BorderGlowSweepSample {
  const elapsed = Math.max(0, elapsedMs)
  const proximity = elapsed <= 500
    ? easeOutCubic(clamp01(elapsed / 500)) * 100
    : elapsed < 2_500
      ? 100
      : (1 - easeInCubic(clamp01((elapsed - 2_500) / 1_500))) * 100

  const angleProgress = elapsed <= 1_500
    ? 0.5 * easeInCubic(clamp01(elapsed / 1_500))
    : 0.5 + 0.5 * easeOutCubic(clamp01((elapsed - 1_500) / 2_250))

  return {
    angle: 110 + (465 - 110) * angleProgress,
    complete: elapsed >= 4_000,
    proximity,
  }
}
