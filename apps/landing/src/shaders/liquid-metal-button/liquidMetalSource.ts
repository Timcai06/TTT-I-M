import liquidMetalButtonUrl from './liquid-metal-button.html?url'

let sourceRequest: Promise<string> | null = null

/**
 * Loads the source-authored shader document as an asset rather than embedding
 * its 38 KB text in the application JavaScript graph. The shared promise
 * deduplicates the Work CTA and SciScope play-button requests; failures reset
 * the cache so a later viewport entry can retry.
 */
export function preloadLiquidMetalButtonSource(): Promise<string> {
  sourceRequest ??= fetch(liquidMetalButtonUrl).then((response) => {
    if (!response.ok) throw new Error(`Liquid Metal source failed: ${response.status}`)
    return response.text()
  }).catch((error: unknown) => {
    sourceRequest = null
    throw error
  })
  return sourceRequest
}
