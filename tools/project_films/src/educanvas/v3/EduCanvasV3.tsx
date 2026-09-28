import { AbsoluteFill, Freeze, Img, spring, staticFile, useCurrentFrame } from 'remotion'
import { Dot, Stage, useFonts } from '../../ui/kit'
import { Glyphs, Plane } from '../../ui/motion'
import { FPS, HAIR, INK, MONO, MUTED, PAPER, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../../ui/theme'

/*
 * EduCanvas v3 — one lesson: a photo is a table of numbers. 26 s at 90 BPM (a beat is 20 frames).
 * Brief: tools/project_films/briefs/educanvas-v3.md. The 3D is Blender (tools/project_films/blender,
 * rendered by Codex); this file lays type, the product and the full stop over it.
 *
 *   P1   0– 89  one pixel breathes in the dark; the camera finds the number engraved on it
 *   P2  90–269  the field of numbers wakes as the camera skims it       「在计算机眼里，」
 *   P3 270–389  one continuous crane up: the numbers are a face           「一张照片，是一张数字表格。」
 *   P4 390–539  the features rise and glow                                「AI 先找特征，再做判断。」
 *       540–629  the product rises out of the field: EduCanvas' own answer, underlined
 *                                                                          「学会了，系统也知道。」
 *   P5 630–719  the field goes dark, one pixel remains; from above it is a point
 *       700–779  the name lands on that point: its full stop. The last plate frame holds.
 */

export const V3_FRAMES = 780
const PURPLE = '#8e70c4'
const PEN = '#d77b5f'

// ───────────────────────── the Blender plates ─────────────────────────
/**
 * 'still'  the five approval stills stand in for their shots (a slow push so the timing reads)
 * 'test'   Codex's motion test: every 4th frame at half size, out/blender/motion-test/<film frame>.png
 * 'final'  the rendered 1920 × 1080 sequences, out/blender/P1…P5/<film frame>.png
 */
const PLATES = 'test' as 'still' | 'test' | 'final'
const SHOTS = [
  { id: 'P1', from: 0, to: 89, still: 80 },
  { id: 'P2', from: 90, to: 269, still: 200 },
  { id: 'P3', from: 270, to: 389, still: 380 },
  { id: 'P4', from: 390, to: 629, still: 470 },
  { id: 'P5', from: 630, to: 719, still: 715 },
] as const
const pad4 = (n: number) => String(n).padStart(4, '0')

function Plate({ frame }: { frame: number }) {
  const f = Math.min(719, Math.floor(frame))
  if (PLATES === 'test') {
    return <Img src={staticFile(`blender/motion-test/${pad4(Math.floor(f / 4) * 4)}.png`)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080 }} />
  }
  if (PLATES === 'final') {
    const shot = SHOTS.find((s) => f >= s.from && f <= s.to) ?? SHOTS[4]
    return <Img src={staticFile(`blender/${shot.id}/${pad4(f)}.png`)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080 }} />
  }
  // stills: each holds its shot with a slow push, and dissolves into the next over 8 frames
  return (
    <>
      {SHOTS.map((s, i) => {
        const next = SHOTS[i + 1]
        // the incoming still dissolves in on top; the outgoing one stays until it is covered
        const vis = (i === 0 ? 1 : p(frame, s.from - 8, s.from)) * (next && frame >= next.from ? 0 : 1)
        if (vis <= 0) return null
        const k = p(frame, s.from, s.to + 60, (t) => t)
        return (
          <Img key={s.id} src={staticFile(`blender/stills/${s.id}/${pad4(s.still)}.png`)} style={{
            position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: vis,
            transform: `scale(${1 + 0.035 * k})`, transformOrigin: '60% 45%',
          }} />
        )
      })}
    </>
  )
}

// ───────────────────────── type: one line per shot, lower-left ─────────────────────────
const TYPE = { left: 150, size: 72 }

function Line({ frame, text, at, off, top, size = TYPE.size, color = PAPER }: {
  frame: number; text: string; at: number; off: number; top: number; size?: number; color?: string
}) {
  if (frame < at - 1 || frame > off + 16) return null
  const leave = p(frame, off, off + 14, inQ)
  return (
    <div style={{
      position: 'absolute', left: TYPE.left, top, fontFamily: SERIF_CN, fontSize: size, lineHeight: 1.2, color,
      opacity: 1 - leave, transform: `translateY(${-leave * 18}px)`, filter: `blur(${leave * 6}px)`,
      textShadow: '0 2px 30px rgba(0,0,0,0.65)', whiteSpace: 'nowrap',
    }}>
      <Glyphs text={text} start={at} every={2} lift={0.28} />
    </div>
  )
}

/** A soft dark pool under the type, so a line never fights the plate behind it. */
function TypeShade({ frame }: { frame: number }) {
  const k = p(frame, 150, 170) * (1 - p(frame, 690, 705))
  return <AbsoluteFill style={{ opacity: k, background: 'radial-gradient(ellipse 60% 45% at 18% 88%, rgba(0,0,0,0.72), transparent 70%)' }} />
}

// ───────────────────────── 540–629 · the product rises out of the field ─────────────────────────
// learning-response.webp is EduCanvas answering this very lesson; plane coordinates = image pixels.
const UI = { focus: [1040, 560] as const, close: [820, 790] as const, underline: { x0: 862, x1: 994, y: 797 } }
// the card floats upper right, so the lower-left third stays free for the line of type
const CARD = { x: 540, y: 64, w: 1260, h: 709 }

function Product({ frame }: { frame: number }) {
  if (frame < 530 || frame > 660) return null
  const rise = p(frame, 536, 566, out)
  const fall = p(frame, 628, 652, inQ)
  // the card arrives showing the whole answer, then the camera pushes in on its last sentence
  const push = p(frame, 568, 598, inOut)
  const s = mix(1.45, 3.0, push)
  const fx = mix(UI.focus[0], UI.close[0], push)
  const fy = mix(UI.focus[1], UI.close[1], push)
  const pen = p(frame, 594, 608, inOut)
  const chip = spring({ frame: frame - 606, fps: FPS, config: { damping: 15, stiffness: 170 } })
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      {/* the field dims behind it */}
      <AbsoluteFill style={{ background: INK, opacity: 0.55 * rise * (1 - fall) }} />
      <Plane rx={mix(34, 7, rise) + fall * 30} ry={mix(-6, -2, rise)} z={mix(-700, 0, rise) - fall * 500} y={mix(260, 0, rise) + fall * 120}
        style={{ opacity: Math.min(1, rise * 1.6) * (1 - fall) }}>
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, overflow: 'hidden', borderRadius: 20, background: '#16140f', boxShadow: `0 60px 160px rgba(0,0,0,0.7), 0 0 0 1px ${HAIR}, 0 0 140px -30px ${PURPLE}88` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1046, transformOrigin: '0 0', transform: `scale(${CARD.w / 1920}) translate(${960 - fx * s}px, ${540 - fy * s}px) scale(${s})` }}>
            <Img src={staticFile('site/projects/educanvas/learning-response.webp')} style={{ position: 'absolute', left: 0, top: 0, width: 1920 }} />
            {/* the product's own pen, under the sentence the film has been saying */}
            <svg width={1920} height={1046} style={{ position: 'absolute', inset: 0 }}>
              <path d={`M${UI.underline.x0},${UI.underline.y} C${UI.underline.x0 + 50},${UI.underline.y - 5} ${UI.underline.x1 - 50},${UI.underline.y - 3} ${UI.underline.x1},${UI.underline.y + 1}`}
                fill="none" stroke={PEN} strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pen} />
            </svg>
          </div>
          <div style={{
            position: 'absolute', right: 28, bottom: 28, transformOrigin: '100% 100%', transform: `scale(${0.6 + 0.4 * chip})`, opacity: Math.min(1, chip * 1.5),
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px 12px 14px', borderRadius: 999, whiteSpace: 'nowrap',
            background: 'rgba(38, 34, 44, 0.92)', border: `1px solid ${PURPLE}66`, boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 40px -10px ${PURPLE}`,
          }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: PURPLE, color: INK, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700 }}>✓</span>
            <span style={{ fontFamily: SERIF_CN, fontSize: 26, color: PAPER }}>回答正确</span>
            <span style={{ fontFamily: MONO, fontSize: 18, color: MUTED, letterSpacing: '0.06em' }}>掌握度 {Math.round(74 * p(frame, 604, 624, out))}%</span>
          </div>
        </div>
      </Plane>
    </AbsoluteFill>
  )
}

// ───────────────────────── 700–779 · the name lands on the last pixel ─────────────────────────
const STOP = { x: 1350, y: 560, size: 24 }        // where P5 leaves its pixel (measured by the plate script)
const NAME = { size: 150 }
// Playfair Display: ascent 1.082 em; with line-height 1 the baseline sits 0.9155 em below the box top
const NAME_TOP = STOP.y + STOP.size / 2 - 0.9155 * NAME.size

function Name({ frame }: { frame: number }) {
  if (frame < 690) return null
  const pop = spring({ frame: frame - 706, fps: FPS, config: { damping: 7, stiffness: 180, mass: 0.6 } })
  const hop = frame < 706 ? 1 : 1 + 0.45 * Math.sin(Math.PI * Math.min(1, (frame - 706) / 10)) * (1 - pop * 0.6)
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', right: 1920 - (STOP.x - STOP.size / 2 - 8), top: NAME_TOP }}>
        <div style={{ fontFamily: SERIF, fontSize: NAME.size, lineHeight: 1, color: PAPER, whiteSpace: 'nowrap' }}>
          <Glyphs text="EduCanvas" start={690} every={2} lift={0.4} />
        </div>
        <div style={{ position: 'absolute', left: 6, top: NAME.size + 34, whiteSpace: 'nowrap', opacity: p(frame, 722, 740), transform: `translateY(${(1 - p(frame, 722, 744, out)) * 12}px)` }}>
          <div style={{ fontFamily: SERIF_CN, fontSize: 34, color: PAPER, opacity: 0.88 }}>教育能力驱动的通用个人 Agent 平台</div>
          <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color: MUTED, marginTop: 16 }}>一张照片 · 一堂课 · 一个知道你学到哪了的老师</div>
        </div>
      </div>
      {/* the plate's square pixel becomes the round full stop */}
      <div style={{ opacity: p(frame, 696, 704) }}>
        <Dot x={STOP.x} y={STOP.y} accent={PURPLE} size={STOP.size * hop} />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── the film ─────────────────────────
function Film() {
  const frame = useCurrentFrame()
  return (
    <>
      <Plate frame={frame} />
      <TypeShade frame={frame} />
      <Line frame={frame} text="在计算机眼里，" at={160} off={372} top={742} />
      <Line frame={frame} text="一张照片，是一张数字表格。" at={290} off={372} top={842} />
      <Line frame={frame} text="AI 先找特征，再做判断。" at={410} off={524} top={842} />
      <Product frame={frame} />
      <Line frame={frame} text="学会了，系统也知道。" at={574} off={622} top={842} />
      <Name frame={frame} />
    </>
  )
}

function Frame() {
  useFonts()
  const frame = useCurrentFrame()
  return (
    <Stage accent={PURPLE}>
      <AbsoluteFill><Film /></AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: 1 - p(frame, 0, 18), pointerEvents: 'none' }} />
    </Stage>
  )
}

export const EduCanvasV3: React.FC = () => <Frame />
export const EduCanvasV3Sub: React.FC = () => {
  const sub = useCurrentFrame()
  return <Freeze frame={sub / 4}><Frame /></Freeze>
}
