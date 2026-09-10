import { Buffer } from 'node:buffer'
import { TextDecoder } from 'node:util'
import type { HtmlTagDescriptor, Plugin } from 'vite'

export const HTML_IN_CANVAS_ORIGIN_TRIAL_ENV = 'HTML_IN_CANVAS_ORIGIN_TRIAL_TOKEN'
export const HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV = 'HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN'
// Same canonical origin documented in apps/landing/index.html (og:url).
export const HTML_IN_CANVAS_CANONICAL_ORIGIN = 'https://www.crt-dsg.com'
const FEATURE = 'HTMLInCanvas'
// Chromium trial_token.cc: version(1), signature(64), big-endian length(4), JSON.
const PAYLOAD_OFFSET = 69
const MAX_TOKEN_SIZE = 6144
const MAX_PAYLOAD_SIZE = 4096

export interface OriginTrialOptions {
  expectedOrigin?: string
  deploymentEnvironment?: string
  /** Actual Preview URL as an HTTPS origin, when provided by the deploy host. */
  deploymentOrigin?: string
  /** Injectable clock in milliseconds for deterministic expiry checks. */
  now?: number
}

export interface OriginTrialPayload {
  version: 2 | 3
  origin: string
  feature: string
  expiry: number
  isSubdomain: boolean
  isThirdParty: boolean
  usage: '' | 'subset'
}

function invalid(reason: string): never {
  // Never include token bytes, JSON values or parser exceptions in diagnostics.
  throw new Error(`${HTML_IN_CANVAS_ORIGIN_TRIAL_ENV}: ${reason}; public payload check only, signature not verified`)
}

function originUrl(value: unknown, field: string): URL {
  if (typeof value !== 'string' || !/^https:\/\/[^/?#\\\s]+\/?$/.test(value)) invalid(`${field} must be an HTTPS origin`)
  let url: URL
  try { url = new URL(value) } catch { return invalid(`${field} must be an HTTPS origin`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    invalid(`${field} must be an HTTPS origin without credentials, path, query or fragment`)
  }
  return url
}

export function normalizeOriginTrialToken(rawToken: string | undefined): string | null {
  if (rawToken === undefined) return null
  if (rawToken.length > MAX_TOKEN_SIZE + 128) invalid('encoded token exceeds size limit')
  const token = rawToken.trim()
  if (!token) return null
  if (token.length > MAX_TOKEN_SIZE) invalid('encoded token exceeds size limit')
  // Strict standard Base64, including padding; Buffer decoding alone is lenient.
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(token)) {
    invalid('malformed Base64 encoding')
  }
  if (Buffer.from(token, 'base64').toString('base64') !== token) invalid('noncanonical Base64 encoding')
  return token
}

/** Reads public metadata only. Synthetic signatures also pass this parser. */
export function parseOriginTrialPayload(token: string): OriginTrialPayload {
  const normalized = normalizeOriginTrialToken(token)
  if (!normalized) invalid('token is empty')
  const bytes = Buffer.from(normalized, 'base64')
  if (bytes.length < PAYLOAD_OFFSET) invalid('truncated token header')
  const version = bytes[0]
  if (version !== 2 && version !== 3) invalid('unsupported token version (expected v2 or v3)')
  const length = bytes.readUInt32BE(65)
  if (length === 0 || length > MAX_PAYLOAD_SIZE) invalid('payload exceeds size limits')
  if (length !== bytes.length - PAYLOAD_OFFSET) invalid('payload length does not match header')
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(PAYLOAD_OFFSET)))
  } catch { return invalid('payload is not valid UTF-8 JSON') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('payload must be a JSON object')
  const data = value as Record<string, unknown>
  const origin = originUrl(data.origin, 'payload origin').origin
  if (typeof data.feature !== 'string' || !data.feature) invalid('feature must be a nonempty string')
  if (typeof data.expiry !== 'number' || !Number.isInteger(data.expiry) || data.expiry <= 0 || data.expiry > 2147483647) {
    invalid('expiry must be a positive signed 32-bit Unix timestamp')
  }
  if (data.isSubdomain !== undefined && typeof data.isSubdomain !== 'boolean') invalid('isSubdomain must be boolean')
  if (data.isThirdParty !== undefined && typeof data.isThirdParty !== 'boolean') invalid('isThirdParty must be boolean')
  if (data.usage !== undefined && data.usage !== '' && data.usage !== 'subset') invalid('usage must be empty or subset')
  return {
    version, origin, feature: data.feature, expiry: data.expiry,
    isSubdomain: data.isSubdomain === true,
    // Chromium interprets these fields only for v3.
    isThirdParty: version === 3 && data.isThirdParty === true,
    usage: version === 3 && data.usage === 'subset' ? 'subset' : '',
  }
}

export function createOriginTrialMeta(rawToken: string | undefined, options: OriginTrialOptions = {}): HtmlTagDescriptor | null {
  // No implicit production target for local or Preview builds, even in Vite production mode.
  if (!rawToken?.trim()) return null
  let expectedOrigin = options.expectedOrigin
  const preview = options.deploymentEnvironment === 'preview'
  if (preview) {
    if (!options.deploymentOrigin) return null
    const actual = originUrl(options.deploymentOrigin, 'Preview deployment origin')
    if (expectedOrigin !== undefined && originUrl(expectedOrigin, HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV).origin !== actual.origin) return null
    expectedOrigin = actual.origin
  } else if (expectedOrigin === undefined) {
    if (options.deploymentEnvironment !== 'production') return null
    expectedOrigin = HTML_IN_CANVAS_CANONICAL_ORIGIN
  }
  const token = normalizeOriginTrialToken(rawToken)
  if (!token) return null
  const payload = parseOriginTrialPayload(token)
  if (payload.feature !== FEATURE) invalid('feature must be HTMLInCanvas')
  if (payload.isThirdParty) invalid('third-party tokens cannot be injected as first-party meta')
  if (payload.usage === 'subset') invalid('subset-restricted tokens are outside this first-party deployment policy')
  const expected = originUrl(expectedOrigin, HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN_ENV)
  const registered = new URL(payload.origin)
  const matchesSubdomain = payload.isSubdomain
    && expected.protocol === registered.protocol && expected.port === registered.port
    && expected.hostname.endsWith(`.${registered.hostname}`)
  if (expected.origin !== registered.origin && !matchesSubdomain) {
    // A Preview inheriting a production token is deliberately unenhanced.
    if (preview && options.expectedOrigin === undefined) return null
    invalid('token origin does not match configured target origin')
  }
  const now = options.now ?? Date.now()
  if (!Number.isFinite(now)) invalid('validation clock must be finite')
  if (payload.expiry * 1000 <= now) invalid('token expiry has passed; renew registration and rebuild before deployment')
  return {
    tag: 'meta',
    attrs: { 'http-equiv': 'origin-trial', content: token, 'data-feature': 'html-in-canvas' },
    injectTo: 'head-prepend',
  }
}

/** Initial HTML precedes app capability detection; no runtime capability override. */
export function htmlInCanvasOriginTrial(rawToken: string | undefined, options: OriginTrialOptions = {}): Plugin {
  const meta = createOriginTrialMeta(rawToken, options)
  return {
    name: 'html-in-canvas-origin-trial',
    enforce: 'pre',
    configResolved(config) {
      if (rawToken?.trim() && !meta) config.logger.warn('HTML-in-Canvas token injection disabled for this non-target deployment; using runtime DOM fallback')
    },
    transformIndexHtml() { return meta ? [meta] : undefined },
  }
}
