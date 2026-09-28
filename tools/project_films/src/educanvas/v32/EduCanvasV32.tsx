import { useEffect, useState } from 'react'
import { AbsoluteFill, Freeze, Img, continueRender, delayRender, random, spring, staticFile, useCurrentFrame } from 'remotion'
import { Dot, useFonts } from '../../ui/kit'
import { Glyphs } from '../../ui/motion'
import { FPS, INK, MONO, MUTED, PAPER, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../../ui/theme'

/*
 * EduCanvas v3.2 — two materials. The machine sees numbers; EduCanvas teaches by making.
 * 960 frames, 32 s at 90 BPM (a beat is 20 frames). The 3D plates are Blender (tools/project_films/blender,
 * by Codex); this file is the question, the type, the card states and the name.
 *
 *   问    0– 89  light      a question types itself, then breaks into pixels that fall to one point
 *   P1   90–149  numbers    that point is a pixel engraved 198
 *   P2  150–269  numbers    the field of numbers wakes                  「在计算机眼里，」
 *   P3  270–389  numbers    the crane up: a face                         「一张照片，是一张数字表格。」
 *   T1  390–449  → paper    the columns flatten; the face is a halftone card on paper; the dark lifts
 *   P10 450–599  paper      a flashcard flips, a thread grows a mind map, a quiz card
 *                                                                        「EduCanvas 把讲解，变成亲手做的练习。」
 *   P11 600–689  paper      the pen ticks the right answer               「答对了，系统记下来。」
 *   P12 690–809  paper      six knowledge cards on one thread, each raised by what the student knows
 *                                                                        「学会了什么，系统都知道。」
 *   P13 810–869  paper      a point walks the thread to the one not yet learned
 *                                                                        「下一步，学这个。」
 *   名  870–959  paper      the page clears; the point is the full stop of the name
 */

export const V32_FRAMES = 960
const PURPLE = '#8e70c4'
const PEN = '#d77b5f'
const PAPER_BG = '#efe9dd'      // the paper world's white (Codex's brief)
const INK_BLUE = '#1d2440'      // the paper world's deep card blue: its type colour
const DARK_END = 390            // numbers until here, paper after T1
const LIGHT_FROM = 449

// ───────────────────────── the Blender plates ─────────────────────────
/**
 * 'still'  approval stills stand in for their shots; shots without a still yet show a labelled placeholder
 * 'test'   Codex's motion test: every 4th frame at half size, out/blender/motion-test-v32/<frame>.png
 * 'final'  the rendered 1920 × 1080 sequences, out/blender/<shot>/<film frame>.png
 */
const PLATES = 'still' as 'still' | 'test' | 'final'
type Shot = { id: string; from: number; to: number; still?: string; paper?: boolean }
const SHOTS: Shot[] = [
  { id: 'P1', from: 90, to: 149, still: 'stills-v31/P1/0170' },
  { id: 'P2', from: 150, to: 269, still: 'stills/P2/0200' },
  { id: 'P3', from: 270, to: 389, still: 'stills-v31/P3/0430' },
  { id: 'T1', from: 390, to: 449 },
  { id: 'P10', from: 450, to: 599, paper: true },
  { id: 'P11', from: 600, to: 689, paper: true },
  { id: 'P12', from: 690, to: 809, paper: true },
  { id: 'P13', from: 810, to: 869, paper: true },
]
const PLATE_FROM = 90
const PLATE_TO = 869
const pad4 = (n: number) => String(n).padStart(4, '0')
const full = { position: 'absolute', inset: 0, width: 1920, height: 1080 } as const

/** Until Codex's stills land: the shot's name on the right material, so the cut can be timed. */
function Placeholder({ shot, frame }: { shot: Shot; frame: number }) {
  const k = shot.id === 'T1' ? p(frame, shot.from, shot.to, (t) => t) : shot.paper ? 1 : 0
  const bg = `rgb(${[17, 18, 16].map((v, i) => Math.round(mix(v, [239, 233, 221][i], k))).join(',')})`
  return (
    <div style={{ ...full, background: bg }}>
      <div style={{ position: 'absolute', right: 150, top: 120, fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: k > 0.5 ? '#9a9180' : MUTED }}>
        PLATE {shot.id} · {shot.from}–{shot.to}
      </div>
    </div>
  )
}

function Plate({ frame }: { frame: number }) {
  if (frame < PLATE_FROM - 8) return null
  const f = Math.min(PLATE_TO, Math.max(PLATE_FROM, Math.floor(frame)))
  const shot = SHOTS.find((s) => f >= s.from && f <= s.to) ?? SHOTS[SHOTS.length - 1]
  if (PLATES === 'test') return <Img src={staticFile(`blender/motion-test-v32/${pad4(Math.floor(f / 4) * 4)}.png`)} style={full} />
  if (PLATES === 'final') return <Img src={staticFile(`blender/${shot.id}/${pad4(f)}.png`)} style={full} />
  return (
    <>
      {SHOTS.map((s, i) => {
        const next = SHOTS[i + 1]
        const vis = p(frame, s.from - 8, s.from) * (next && frame >= next.from ? 0 : 1)
        if (vis <= 0) return null
        if (!s.still) return <div key={s.id} style={{ ...full, opacity: vis }}><Placeholder shot={s} frame={frame} /></div>
        const k = p(frame, s.from, s.to + 40, (t) => t)
        return <Img key={s.id} src={staticFile(`blender/${s.still}.png`)} style={{ ...full, opacity: vis, transform: `scale(${1 + 0.03 * k})`, transformOrigin: '60% 45%' }} />
      })}
    </>
  )
}

// ───────────────────────── 问 · the question types itself, then falls apart ─────────────────────────
const Q = { text: 'AI 是怎么认出一张照片的？', size: 84, top: 470, typeFrom: 6, every: 3, breakAt: 58 }
const Q_CHARS = Array.from(Q.text)
// glyph advances: CJK is one em; the Latin 'AI' and the space are narrower
const ADV = Q_CHARS.map((c) => (/[　-鿿＀-￯]/.test(c) ? 1 : c === ' ' ? 0.3 : 0.62))
const Q_LEFT = 960 - (ADV.reduce((a, b) => a + b, 0) * Q.size) / 2
// P1's first frame shows its pixel here (v3 motion test, frame 0). Update from Codex's report on frame 90.
const PIXEL = { x: 1280, y: 452 }
const CELLS = 6 // each glyph breaks into a 6 × 6 grid of its own pixels

function Question({ frame }: { frame: number }) {
  if (frame > 94) return null
  const typed = Math.floor((frame - Q.typeFrom) / Q.every) + 1
  const doneTyping = Q.typeFrom + Q_CHARS.length * Q.every
  const cell = Q.size / CELLS
  let x = Q_LEFT
  const glyphs = Q_CHARS.map((ch, i) => {
    const g = { ch, gx: x, w: ADV[i] * Q.size }
    x += g.w
    return g
  })
  const last = glyphs[Math.max(0, Math.min(typed, glyphs.length) - 1)]
  const caretOn = frame < Q.breakAt && (frame < doneTyping || Math.floor(frame / 10) % 2 === 0)
  return (
    <AbsoluteFill>
      {glyphs.map((g, i) => {
        if (i >= typed || g.ch === ' ') return null
        const born = Q.typeFrom + i * Q.every
        const land = p(frame, born, born + 6, out)
        const pieces = []
        for (let r = 0; r < CELLS; r++) {
          for (let c = 0; c < CELLS; c++) {
            if (c * cell >= g.w) continue
            const seed = `${i}-${r}-${c}`
            // the break runs left to right; each piece drops, warms to the pen's orange, and is drawn to the point
            const t0 = Q.breakAt + i * 0.8 + random(seed) * 4
            const broken = frame >= t0
            // a real drop first, then the point draws everything in from wherever it has fallen to
            const pullFrom = 72 + random(`${seed}p`) * 4
            const fall = Math.max(0, Math.min(frame, pullFrom) - t0) / FPS
            const pull = p(frame, pullFrom, 89, inOut)
            const fx = g.gx + c * cell + (random(`${seed}x`) - 0.5) * 220 * fall
            const fy = Q.top + r * cell + 1900 * fall * fall - 120 * fall * random(`${seed}y`)
            const warm = broken ? p(frame, t0, t0 + 8) : 0
            pieces.push(
              <div key={seed} style={{
                position: 'absolute', left: mix(fx, PIXEL.x - cell / 2, pull), top: mix(fy, PIXEL.y - cell / 2, pull),
                width: cell, height: cell, overflow: 'hidden', transform: `scale(${broken ? mix(1, 0.15, pull) : 1})`,
                opacity: broken ? 1 - 0.5 * pull : land, filter: broken ? `drop-shadow(0 0 ${6 * warm}px ${PEN})` : 'none',
              }}>
                <div style={{
                  position: 'absolute', left: -c * cell, top: -r * cell, width: g.w, height: Q.size,
                  fontFamily: SERIF_CN, fontSize: Q.size, lineHeight: 1, color: warmColor(warm),
                  transform: broken ? 'none' : `translateY(${(1 - land) * -0.25 * Q.size}px)`,
                }}>{g.ch}</div>
              </div>,
            )
          }
        }
        return <div key={i}>{pieces}</div>
      })}
      {caretOn && typed > 0 ? <div style={{ position: 'absolute', left: last.gx + last.w + 6, top: Q.top + 6, width: 3, height: Q.size - 10, background: PEN }} /> : null}
      {/* the pieces arrive as one point: the pixel P1 opens on */}
      <Dot x={PIXEL.x} y={PIXEL.y} accent={PEN} size={10} opacity={p(frame, 82, 90) * (1 - p(frame, 90, 94))} />
    </AbsoluteFill>
  )
}

/** Paper white warming to the pen's orange as a piece breaks off. */
function warmColor(k: number) {
  const a = [234, 231, 223]
  const b = [215, 123, 95]
  return `rgb(${a.map((v, i) => Math.round(mix(v, b[i], k))).join(',')})`
}

// ───────────────────────── type: one line per shot, lower-left ─────────────────────────
// light on the numbers, ink on the paper
function Line({ frame, text, at, off, top, ink = false }: { frame: number; text: string; at: number; off: number; top: number; ink?: boolean }) {
  if (frame < at - 1 || frame > off + 16) return null
  const leave = p(frame, off, off + 14, inQ)
  return (
    <div style={{
      position: 'absolute', left: 150, top, fontFamily: SERIF_CN, fontSize: 72, lineHeight: 1.2, whiteSpace: 'nowrap',
      color: ink ? INK_BLUE : PAPER, opacity: 1 - leave, transform: `translateY(${-leave * 18}px)`, filter: `blur(${leave * 6}px)`,
      textShadow: ink ? '0 1px 18px rgba(239,233,221,0.9)' : '0 2px 30px rgba(0,0,0,0.65)',
    }}>
      <Glyphs text={text} start={at} every={2} lift={0.28} />
    </div>
  )
}

/** A pool under the type: dark on the numbers, a paper-white wash on the paper. */
function TypeShade({ frame }: { frame: number }) {
  const dark = p(frame, 190, 205) * (1 - p(frame, DARK_END - 8, DARK_END + 8))
  const light = p(frame, LIGHT_FROM, LIGHT_FROM + 16) * (1 - p(frame, 862, 872))
  return (
    <>
      <AbsoluteFill style={{ opacity: dark, background: 'radial-gradient(ellipse 60% 45% at 18% 88%, rgba(0,0,0,0.72), transparent 70%)' }} />
      <AbsoluteFill style={{ opacity: light, background: 'radial-gradient(ellipse 60% 45% at 18% 88%, rgba(239,233,221,0.8), transparent 70%)' }} />
    </>
  )
}

// ───────────────────────── P12–P13 · the card states ─────────────────────────
// The six knowledge points and states of the real EduCanvas lesson recorded for the competition film.
const CARDS: Record<string, { state: '优势' | '在学' | '待学习' }> = {
  1: { state: '优势' }, 2: { state: '优势' }, 3: { state: '在学' }, 4: { state: '优势' }, 5: { state: '待学习' }, 6: { state: '优势' },
}
const STATE_COLOR = { 优势: PEN, 在学: '#6f7fd0', 待学习: '#8a8272' }
const NEXT = '5'
type Labels = Record<string, Record<string, [number, number, boolean]>>

/** Card centres exported by the plate script, per film frame (P12, P13). Missing files are fine. */
function useLabels() {
  const [labels, setLabels] = useState<Labels | null>(null)
  const [handle] = useState(() => delayRender('card labels'))
  useEffect(() => {
    Promise.all(['P12', 'P13'].map((s) => fetch(staticFile(`blender/${s}/labels.json`)).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))))
      .then((parts) => { setLabels(Object.assign({}, ...parts)); continueRender(handle) })
  }, [handle])
  return labels
}

/** A small printed tag under each card: what the system knows about it. */
function CardStates({ frame, labels }: { frame: number; labels: Labels | null }) {
  if (!labels || frame < 712 || frame > 866) return null
  const at = labels[String(Math.floor(frame))]
  if (!at) return null
  return (
    <AbsoluteFill>
      {Object.entries(CARDS).map(([id, c], i) => {
        const pos = at[id]
        if (!pos || !pos[2]) return null
        const next = id === NEXT
        const inK = p(frame, 716 + i * 5, 730 + i * 5, out)
        const outK = next ? p(frame, 852, 864, inQ) : p(frame, 806, 818, inQ)
        const k = inK * (1 - outK)
        if (k <= 0) return null
        const isNext = next && frame >= 826
        const color = isNext ? PURPLE : STATE_COLOR[c.state]
        return (
          <div key={id} style={{
            position: 'absolute', left: pos[0], top: pos[1] + 92, opacity: k, transform: `translate(-50%, ${(1 - inK) * 8}px)`,
            fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color, whiteSpace: 'nowrap',
            border: `1px solid ${color}`, borderRadius: 999, padding: '4px 12px', background: 'rgba(239,233,221,0.85)',
          }}>{isNext ? '下一步' : c.state}</div>
        )
      })}
    </AbsoluteFill>
  )
}

// ───────────────────────── 名 · the page clears; the point is the full stop ─────────────────────────
const STOP = { x: 1350, y: 560, size: 24 }        // P13's last frame, where Codex's brief puts the point
const NAME = { size: 150 }
// Playfair Display: ascent 1.082 em; with line-height 1 the baseline sits 0.9155 em below the box top
const NAME_TOP = STOP.y + STOP.size / 2 - 0.9155 * NAME.size

function Name({ frame }: { frame: number }) {
  if (frame < 862) return null
  const clear = p(frame, 862, 880, out)
  const start = 876
  const pop = spring({ frame: frame - (start + 16), fps: FPS, config: { damping: 7, stiffness: 180, mass: 0.6 } })
  const hop = frame < start + 16 ? 1 : 1 + 0.45 * Math.sin(Math.PI * Math.min(1, (frame - start - 16) / 10)) * (1 - pop * 0.6)
  return (
    <AbsoluteFill>
      {/* the desk clears to a clean sheet, leaving only the point */}
      <AbsoluteFill style={{ background: PAPER_BG, opacity: clear }} />
      <div style={{ position: 'absolute', right: 1920 - (STOP.x - STOP.size / 2 - 8), top: NAME_TOP }}>
        <div style={{ fontFamily: SERIF, fontSize: NAME.size, lineHeight: 1, color: INK_BLUE, whiteSpace: 'nowrap' }}>
          <Glyphs text="EduCanvas" start={start} every={2} lift={0.4} />
        </div>
        <div style={{ position: 'absolute', left: 6, top: NAME.size + 34, whiteSpace: 'nowrap', opacity: p(frame, start + 30, start + 48), transform: `translateY(${(1 - p(frame, start + 30, start + 52, out)) * 12}px)` }}>
          <div style={{ fontFamily: SERIF_CN, fontSize: 34, color: INK_BLUE, opacity: 0.88 }}>教育能力驱动的通用个人 Agent 平台</div>
          <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color: '#8a8272', marginTop: 16 }}>机器看到的是数字 · EduCanvas 教人亲手去做</div>
        </div>
      </div>
      <div style={{ opacity: p(frame, 862, 870) }}>
        <Dot x={STOP.x} y={STOP.y} accent={PURPLE} size={STOP.size * hop} />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── the stage: dark for the numbers, paper for the rest ─────────────────────────
function Ground({ frame, children }: { frame: number; children: React.ReactNode }) {
  const paper = p(frame, DARK_END, LIGHT_FROM, (t) => t)
  // grain lifts the blacks on the numbers and darkens the fibres on the paper
  const ox = Math.floor(random(`gx${Math.floor(frame)}`) * 128)
  const oy = Math.floor(random(`gy${Math.floor(frame)}`) * 128)
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      {children}
      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,${mix(0.55, 0.14, paper)}) 100%)` }} />
      <AbsoluteFill style={{
        pointerEvents: 'none', backgroundImage: `url(${staticFile('site/noise/grain-128.png')})`, backgroundSize: '128px 128px',
        backgroundPosition: `${ox}px ${oy}px`, mixBlendMode: paper > 0.5 ? 'multiply' : 'screen', opacity: mix(0.11, 0.08, paper),
      }} />
    </AbsoluteFill>
  )
}

function Film() {
  const frame = useCurrentFrame()
  const labels = useLabels()
  return (
    <>
      <Plate frame={frame} />
      <Question frame={frame} />
      <TypeShade frame={frame} />
      <Line frame={frame} text="在计算机眼里，" at={200} off={376} top={742} />
      <Line frame={frame} text="一张照片，是一张数字表格。" at={296} off={376} top={842} />
      <Line frame={frame} text="EduCanvas 把讲解，变成亲手做的练习。" at={470} off={590} top={842} ink />
      <Line frame={frame} text="答对了，系统记下来。" at={620} off={682} top={842} ink />
      <CardStates frame={frame} labels={labels} />
      <Line frame={frame} text="学会了什么，系统都知道。" at={706} off={802} top={842} ink />
      <Line frame={frame} text="下一步，学这个。" at={816} off={862} top={842} ink />
      <Name frame={frame} />
    </>
  )
}

function Frame() {
  useFonts()
  const frame = useCurrentFrame()
  return <Ground frame={frame}><Film /></Ground>
}

export const EduCanvasV32: React.FC = () => <Frame />
export const EduCanvasV32Sub: React.FC = () => {
  const sub = useCurrentFrame()
  return <Freeze frame={sub / 4}><Frame /></Freeze>
}
