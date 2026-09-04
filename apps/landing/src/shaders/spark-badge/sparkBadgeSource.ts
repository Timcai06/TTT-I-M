import portfolioSparkBadgeUrl from './spark-badge-portfolio.html?url'

export type SparkBadgeVariant = 'badge' | 'browser' | 'iphone' | 'studio-display'

export const SPARK_BADGE_DEFAULTS = {
  speed: 1,
  particleAmount: 1,
  rainAmount: 1,
  turbulence: 1,
  spread: 1,
} as const

export { portfolioSparkBadgeUrl }

/** Resolve the exact iframe cache key used by a Spark scene variant. */
export function resolveSparkBadgeSource(
  sourceUrl: string,
  variant: SparkBadgeVariant,
): string {
  if (variant === 'badge') return sourceUrl
  const hashIndex = sourceUrl.indexOf('#')
  const path = hashIndex === -1 ? sourceUrl : sourceUrl.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : sourceUrl.slice(hashIndex)
  return `${path}${path.includes('?') ? '&' : '?'}variant=${variant}${hash}`
}
