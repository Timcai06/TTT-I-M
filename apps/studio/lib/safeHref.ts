export interface SafeHref {
  href: string
  external: boolean
}

const WEB_PROTOCOLS = new Set(['http:', 'https:'])
const NON_WEB_PROTOCOLS = new Set(['mailto:', 'tel:'])

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint <= 31 || codePoint === 127) return true
  }
  return false
}

function parseAbsoluteWebHref(href: string): SafeHref | null {
  try {
    const url = new URL(href.startsWith('//') ? `https:${href}` : href)
    if (!WEB_PROTOCOLS.has(url.protocol) || url.username || url.password) return null
    return { href, external: true }
  } catch {
    return null
  }
}

/** Allow normal site-relative links and explicit HTTP(S), mail, or telephone links. */
export function resolveSafeHref(value: string | undefined): SafeHref | null {
  if (value === undefined) return null
  const href = value.trim()
  if (!href || containsControlCharacter(href)) return null
  if (href.startsWith('//')) return parseAbsoluteWebHref(href)
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('./') || href.startsWith('../')) {
    return { href, external: false }
  }

  const scheme = href.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase()
  if (!scheme) return { href, external: false }
  if (WEB_PROTOCOLS.has(`${scheme}:`)) return parseAbsoluteWebHref(href)
  if (NON_WEB_PROTOCOLS.has(`${scheme}:`)) return { href, external: false }
  return null
}

export function requireWebNavigationHref(value: string): string {
  const resolved = resolveSafeHref(value)
  if (!resolved || (!resolved.external && !resolved.href.startsWith('/'))) {
    throw new Error('Navigation origin must be a root-relative path or an HTTP(S) URL.')
  }
  return resolved.href
}
