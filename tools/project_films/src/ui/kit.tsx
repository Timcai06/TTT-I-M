import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { AbsoluteFill, continueRender, delayRender, Img, random, staticFile, useCurrentFrame } from 'remotion'
import { FAINT, HAIR, INK, MONO, MUTED, PAPER, p } from './theme'

/** Hold the first frame until every face the film uses has loaded. */
export function useFonts() {
  const [handle] = useState(() => delayRender('fonts'))
  useEffect(() => {
    const faces = [
      "400 40px 'Playfair Display'", "italic 400 40px 'Playfair Display'", "400 40px 'Noto Serif SC'",
      "600 40px 'Noto Serif SC'", "400 20px 'JetBrains Mono'", "400 20px 'Inter'", "500 20px 'Inter'",
    ]
    const sample = 'EduCanvas SciScope 今天想学什么这个结论有证据吗计算机眼里图片是 0123456789'
    Promise.all(faces.map((f) => document.fonts.load(f, sample)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle))
  }, [handle])
}

/** Ink ground, a soft falloff, and the site's own grain moving a little every frame. */
export function Stage({ children, accent }: { children: ReactNode; accent: string }) {
  const frame = useCurrentFrame()
  // grain changes per film frame, not per sub-frame, so motion blur does not average it away
  const ox = Math.floor(random(`gx${Math.floor(frame)}`) * 128)
  const oy = Math.floor(random(`gy${Math.floor(frame)}`) * 128)
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${accent}0f 0%, transparent 55%)`,
        }}
      />
      {children}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('noise/grain-128.png')})`,
          backgroundSize: '128px 128px',
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: 'screen',
          opacity: 0.11,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}

/** Corner microcopy in the loader's voice. */
export function Hud({ index, name, meta, accent }: { index: string; name: string; meta: string; accent: string }) {
  const frame = useCurrentFrame()
  const seconds = frame / 30
  const tc = `00:${String(Math.floor(seconds)).padStart(2, '0')}:${String(Math.floor(frame) % 30).padStart(2, '0')}`
  const a = p(frame, 4, 24)
  const label: CSSProperties = {
    position: 'absolute', fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: MUTED,
    textTransform: 'uppercase', opacity: a,
  }
  return (
    <>
      <div style={{ ...label, left: 56, top: 48 }}>
        <span style={{ color: accent }}>●</span>&nbsp;&nbsp;{index} / {name}
      </div>
      <div style={{ ...label, right: 56, top: 48 }}>{meta}</div>
      <div style={{ ...label, left: 56, bottom: 44, color: FAINT }}>{tc}</div>
      <div style={{ ...label, right: 56, bottom: 44, color: FAINT }}>Tim Cai · Work</div>
    </>
  )
}

/** Text that types in one glyph at a time from `start`, with a caret while it types. */
export function Typed({ text, start, every = 3, style, caret = true, caretColor = PAPER }: {
  text: string; start: number; every?: number; style?: CSSProperties; caret?: boolean; caretColor?: string
}) {
  const frame = useCurrentFrame()
  const chars = Array.from(text)
  const n = Math.max(0, Math.min(chars.length, Math.floor((frame - start) / every) + 1))
  const typing = frame >= start && n < chars.length
  const blink = Math.floor(frame / 8) % 2 === 0
  const showCaret = caret && frame >= start - 10 && (typing || blink) && frame < start + chars.length * every + 30
  return (
    <span style={{ whiteSpace: 'pre', ...style }}>
      {chars.slice(0, frame < start ? 0 : n).join('')}
      {showCaret ? <span style={{ display: 'inline-block', width: '0.08em', height: '1em', marginLeft: '0.06em', background: caretColor, verticalAlign: '-0.12em' }} /> : null}
    </span>
  )
}

/** A line that masks up into place. */
export function Rise({ start, children, dur = 18, style }: { start: number; children: ReactNode; dur?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const k = p(frame, start, start + dur)
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div style={{ transform: `translateY(${(1 - k) * 110}%)`, opacity: Math.min(1, k * 1.4) }}>{children}</div>
    </div>
  )
}

/** The request itself: a small glowing point in the project's accent. */
export function Dot({ x, y, accent, size = 14, opacity = 1 }: { x: number; y: number; accent: string; size?: number; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%',
        background: accent, opacity,
        boxShadow: `0 0 ${size * 1.2}px ${accent}, 0 0 ${size * 3.5}px ${accent}88`,
      }}
    />
  )
}

/** A hairline node in an architecture diagram; `lit` 0-1 fills it with the accent. */
export function Node({ x, y, w = 230, h = 92, en, cn, lit, accent, appear }: {
  x: number; y: number; w?: number; h?: number; en: string; cn: string; lit: number; accent: string; appear: number
}) {
  return (
    <div
      style={{
        position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: 14,
        border: `1px solid ${lit > 0.01 ? accent : HAIR}`,
        // opaque, so the wires pass behind the node instead of through its label
        background: '#161715',
        boxShadow: lit > 0.01 ? `0 0 ${40 * lit}px ${accent}44, inset 0 0 ${30 * lit}px ${accent}22` : 'none',
        opacity: appear, transform: `translateY(${(1 - appear) * 14}px)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', boxSizing: 'border-box',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: lit > 0.5 ? accent : MUTED }}>{en}</div>
      <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, color: PAPER, marginTop: 6, opacity: 0.55 + 0.45 * lit }}>{cn}</div>
    </div>
  )
}

/** A screenshot placed by its own pixel coordinates inside a 1920-wide frame. */
export function Shot({ src, style }: { src: string; style?: CSSProperties }) {
  return <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: 1920, ...style }} />
}

/** Polyline path drawn up to `k` (0-1) of its length. */
export function Wire({ points, k, color, width = 1.5, dashed = false }: {
  points: [number, number][]; k: number; color: string; width?: number; dashed?: boolean
}) {
  let len = 0
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={width}
      strokeDasharray={dashed ? '4 8' : `${len} ${len}`} strokeDashoffset={dashed ? 0 : len * (1 - k)}
      opacity={dashed ? k : 1} />
  )
}

/** Position along a polyline at fraction t. */
export function along(points: [number, number][], t: number): [number, number] {
  const segs: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    segs.push(l)
    total += l
  }
  let d = Math.max(0, Math.min(1, t)) * total
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? d / segs[i] : 0
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k]
    }
    d -= segs[i]
  }
  return points[points.length - 1]
}

/** The closing card: name with the accent full stop, the one-line claim, the stack. */
export function EndCard({ start, name, cn, tagline, stack, footer, accent, dotFrom, periodNudge = 0 }: {
  start: number; name: string; cn: string; tagline: string; stack: string[]; footer: string; accent: string
  dotFrom?: [number, number]; periodNudge?: number
}) {
  const frame = useCurrentFrame()
  const t = frame - start
  const nameK = p(t, 0, 22)
  const dotK = p(t, 6, 26)
  const nameX = 960
  // the full stop lands at the end of the name
  const periodX = nameX + name.length * 37.5 + 10 + periodNudge
  const periodY = 470
  const from = dotFrom ?? [periodX, periodY - 200]
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 330, width: '100%', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ fontFamily: SERIF_FALLBACK, fontSize: 150, color: PAPER, lineHeight: 1.1, transform: `translateY(${(1 - nameK) * 100}%)` }}>
          {name}<span style={{ color: 'transparent' }}>.</span>
        </div>
      </div>
      <Dot x={from[0] + (periodX - from[0]) * dotK} y={from[1] + (periodY - from[1]) * dotK} accent={accent} size={22} />
      <Rise start={start + 12} style={{ position: 'absolute', top: 530, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 36, color: PAPER, opacity: 0.9 }}>{cn}</div>
      </Rise>
      <Rise start={start + 18} style={{ position: 'absolute', top: 596, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.14em', color: MUTED, textTransform: 'uppercase' }}>{tagline}</div>
      </Rise>
      <div style={{ position: 'absolute', top: 668, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
        {stack.map((s, i) => {
          const k = p(t, 22 + i * 2, 36 + i * 2)
          return (
            <div key={s} style={{
              fontFamily: MONO, fontSize: 15, letterSpacing: '0.08em', color: PAPER, opacity: 0.75 * k,
              border: `1px solid ${HAIR}`, borderRadius: 999, padding: '7px 16px', transform: `translateY(${(1 - k) * 10}px)`,
            }}>{s}</div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: FAINT, opacity: p(t, 30, 45) }}>
        {footer}
      </div>
    </AbsoluteFill>
  )
}

const SERIF_FALLBACK = "'Playfair Display', 'Noto Serif SC', serif"
