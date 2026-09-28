import type { CSSProperties, ReactNode } from 'react'
import { random, spring, useCurrentFrame } from 'remotion'
import { FPS, p } from './theme'

/** Glyphs that land one by one with weight: they drop, overshoot a hair, and come into focus. */
export function Glyphs({ text, start, every = 4, style, glyphStyle, lift = 0.55 }: {
  text: string; start: number; every?: number; style?: CSSProperties; glyphStyle?: (i: number) => CSSProperties; lift?: number
}) {
  const frame = useCurrentFrame()
  const fps = FPS
  return (
    <span style={{ whiteSpace: 'pre', display: 'inline-block', ...style }}>
      {Array.from(text).map((ch, i) => {
        const f = frame - start - i * every
        const s = spring({ frame: f, fps, config: { damping: 13, mass: 0.7, stiffness: 170 } })
        const vis = f >= 0 ? 1 : 0
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: vis * Math.min(1, s * 1.6),
            transform: `translateY(${(1 - s) * -lift}em) scale(${1 + (1 - s) * 0.25})`,
            filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
            ...(glyphStyle ? glyphStyle(i) : {}),
          }}>{ch}</span>
        )
      })}
    </span>
  )
}

const NOISE = '01#%&*+=<>/\\[]{}アカサ'

/** Text that decodes from noise, left to right. */
export function Scramble({ text, start, dur = 18, style, seed = 's' }: { text: string; start: number; dur?: number; style?: CSSProperties; seed?: string }) {
  const frame = useCurrentFrame()
  const chars = Array.from(text)
  const k = p(frame, start, start + dur, (t) => t)
  const settled = Math.floor(k * chars.length)
  const tick = Math.floor(frame / 2)
  return (
    <span style={{ whiteSpace: 'pre', ...style }}>
      {chars.map((c, i) => {
        if (frame < start) return <span key={i} style={{ opacity: 0 }}>{c}</span>
        if (i < settled || c === ' ') return <span key={i}>{c}</span>
        const r = Math.floor(random(`${seed}${i}${tick}`) * NOISE.length)
        return <span key={i} style={{ opacity: 0.55 }}>{NOISE[r]}</span>
      })}
    </span>
  )
}

/** One word slot that swaps its word in place: the old one lifts out, the new one rises in. */
export function WordSwap({ words, at, style, dur = 10 }: { words: string[]; at: number[]; style?: CSSProperties; dur?: number }) {
  const frame = useCurrentFrame()
  return (
    <span style={{ display: 'inline-block', position: 'relative', overflow: 'hidden', verticalAlign: 'bottom', ...style }}>
      {words.map((w, i) => {
        const inK = i === 0 ? p(frame, at[0], at[0] + dur) : p(frame, at[i], at[i] + dur)
        const outK = i + 1 < words.length ? p(frame, at[i + 1], at[i + 1] + dur) : 0
        const y = (1 - inK) * 100 - outK * 100
        return (
          <span key={w} style={{
            display: 'inline-block', position: i === 0 ? 'relative' : 'absolute', left: 0, top: 0,
            transform: `translateY(${y}%)`, opacity: Math.min(inK, 1 - outK), whiteSpace: 'nowrap',
          }}>{w}</span>
        )
      })}
    </span>
  )
}

/** A flat plane in a 3D stage (the stage supplies the perspective). */
export function Plane({ children, rx = 0, ry = 0, rz = 0, z = 0, x = 0, y = 0, origin = '50% 50%', style }: {
  children: ReactNode; rx?: number; ry?: number; rz?: number; z?: number; x?: number; y?: number; origin?: string; style?: CSSProperties
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: origin,
      transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
      ...style,
    }}>
      {children}
    </div>
  )
}
