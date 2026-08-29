export function resolveSafeAssetUrl(source: string, origin: string): URL | null {
  try {
    const url = new URL(source, origin)
    const safeProtocol = url.protocol === 'http:' || url.protocol === 'https:'
    if (!safeProtocol || url.origin !== origin) return null
    return url
  } catch {
    return null
  }
}

/** Open only same-origin HTTP(S) assets supplied by the content layer. */
export function openSafeAsset(source: string): boolean {
  const url = resolveSafeAssetUrl(source, window.location.origin)
  if (!url) return false

  window.open(url.href, '_blank', 'noopener,noreferrer')
  return true
}
