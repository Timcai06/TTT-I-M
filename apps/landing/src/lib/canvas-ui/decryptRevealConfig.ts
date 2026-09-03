import type { DecryptRevealOptions } from './vendor/DecryptReveal/DecryptRevealVanilla'

/** Canvas UI demo defaults; only the cipher and page colors follow portfolio tokens. */
export const DECRYPT_REVEAL_CONFIG = {
  radius: 400,
  softness: 0.5,
  cell: 10,
  aspect: 0.75,
  colored: 1,
  color: '#d6c5a8',
  brightness: 1,
  legibility: 1,
  contrast: 1,
  exposure: 1,
  scramble: 0.1,
  scrambleSpeed: 6,
  edgeWidth: 0.2,
  edgeFlicker: 1,
  edgeGlow: 2,
  edgeTint: 0.75,
  aberration: 10,
  passthrough: 0.15,
  threshold: 0.025,
  background: '#0a0a0a',
  smoothing: 0.2,
} as const satisfies DecryptRevealOptions
