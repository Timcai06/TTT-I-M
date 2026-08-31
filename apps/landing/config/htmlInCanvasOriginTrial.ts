import type { HtmlTagDescriptor, Plugin } from 'vite'

export const HTML_IN_CANVAS_ORIGIN_TRIAL_ENV = 'HTML_IN_CANVAS_ORIGIN_TRIAL_TOKEN'

const ORIGIN_TRIAL_TOKEN_PATTERN = /^[A-Za-z0-9+/_=-]{32,4096}$/

export function normalizeOriginTrialToken(rawToken: string | undefined): string | null {
  const token = rawToken?.trim()
  if (!token) return null

  if (!ORIGIN_TRIAL_TOKEN_PATTERN.test(token)) {
    throw new Error(`${HTML_IN_CANVAS_ORIGIN_TRIAL_ENV} is malformed`)
  }

  return token
}

export function createOriginTrialMeta(rawToken: string | undefined): HtmlTagDescriptor | null {
  const token = normalizeOriginTrialToken(rawToken)
  if (!token) return null

  return {
    tag: 'meta',
    attrs: {
      'http-equiv': 'origin-trial',
      content: token,
      'data-feature': 'html-in-canvas',
    },
    injectTo: 'head-prepend',
  }
}

/**
 * Injects the public, origin-bound Chrome trial token into the initial HTML.
 * Keeping this at build time makes the token available before application code
 * performs feature detection, without shipping configuration logic in a JS chunk.
 */
export function htmlInCanvasOriginTrial(rawToken: string | undefined): Plugin {
  const meta = createOriginTrialMeta(rawToken)

  return {
    name: 'html-in-canvas-origin-trial',
    enforce: 'pre',
    transformIndexHtml() {
      return meta ? [meta] : undefined
    },
  }
}
