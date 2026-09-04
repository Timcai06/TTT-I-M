import liquidMetalButtonUrl from './liquid-metal-button.html?url'
import interMediumUrl from '@fontsource/inter/files/inter-latin-500-normal.woff2?url'
import { createSharedResource } from '../../lib/resources/sharedResource'

const SOURCE_TIMEOUT_MS = 8_000
const INTER_FONT_PLACEHOLDER = '__PORTFOLIO_INTER_500_URL__'

/**
 * Loads the source-authored shader document as an asset rather than embedding
 * its 38 KB text in the application JavaScript graph. The shared promise
 * deduplicates the Work CTA and SciScope play-button requests; failures reset
 * the cache so a later viewport entry can retry.
 */
const sourceResource = createSharedResource(async (signal) => {
  const deadlineController = new AbortController()
  const abortFromShared = () => deadlineController.abort(
    signal.reason instanceof Error ? signal.reason : new Error('Liquid Metal source request aborted'),
  )
  const timeout = window.setTimeout(() => {
    // The shared request owns cancellation. A local controller composes the
    // source deadline with its last-consumer signal without weakening either.
    deadlineController.abort(new Error(`Liquid Metal source timed out after ${SOURCE_TIMEOUT_MS}ms`))
  }, SOURCE_TIMEOUT_MS)
  signal.addEventListener('abort', abortFromShared, { once: true })
  try {
    const response = await fetch(liquidMetalButtonUrl, { signal: deadlineController.signal })
    if (!response.ok) throw new Error(`Liquid Metal source failed: ${response.status}`)
    const source = await response.text()
    if (!source.includes(INTER_FONT_PLACEHOLDER)) {
      throw new Error('Liquid Metal source is missing its self-hosted font placeholder')
    }
    return source.replaceAll(INTER_FONT_PLACEHOLDER, interMediumUrl)
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', abortFromShared)
  }
})

export function preloadLiquidMetalButtonSource(signal?: AbortSignal): Promise<string> {
  return sourceResource.load(signal)
}
