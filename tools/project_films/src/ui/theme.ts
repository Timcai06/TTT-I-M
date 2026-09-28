import { Easing, interpolate } from 'remotion'

/** The site's own palette and type (packages/tokens). */
export const INK = '#111210'
export const PAPER = '#eae7df'
export const MUTED = 'rgba(234, 231, 223, 0.5)'
export const FAINT = 'rgba(234, 231, 223, 0.22)'
export const HAIR = 'rgba(234, 231, 223, 0.14)'

export const SERIF = "'Playfair Display', 'Noto Serif SC', 'Songti SC', serif"
export const SERIF_CN = "'Noto Serif SC', 'Songti SC', serif"
export const SANS = "'Inter', 'PingFang SC', system-ui, sans-serif"
export const MONO = "'JetBrains Mono', 'SFMono-Regular', monospace"

export const FPS = 30
export const W = 1920
export const H = 1080
/** 90 BPM: one beat is 20 frames, so every cut can land on a whole frame. */
export const BEAT = 20
export const DURATION = 720

export const out = Easing.bezier(0.16, 1, 0.3, 1)
export const inOut = Easing.bezier(0.65, 0, 0.35, 1)
export const inQ = Easing.bezier(0.5, 0, 0.75, 0)

/** 0 → 1 across [a, b], clamped, eased. */
export function p(frame: number, a: number, b: number, ease: (t: number) => number = out) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
}

export function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
