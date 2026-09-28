import { AbsoluteFill, Freeze, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion'
import { Dot, Hud, Stage, useFonts } from '../ui/kit'
import { Glyphs, Plane, Scramble, WordSwap } from '../ui/motion'
import { FAINT, FPS, HAIR, INK, MONO, MUTED, PAPER, SANS, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../ui/theme'
import pixels from './pixels.json'

const ACCENT = '#8192d8'
const PEN = '#d77b5f'   // the product's own underline colour

/*
 * EduCanvas — 24 s at 90 BPM (a beat is 20 frames). One protagonist: the dot.
 *   A   0– 84  the dot is a caret: the greeting lands glyph by glyph; the dot draws its underline
 *   B  80–206  the real home screen arrives out of depth; the dot is the caret of the question;
 *              send, a shockwave, the screen falls away and the dot rises
 *   C 200–380  the dot draws a ring: the Agent Loop. Six stations around it, lap after lap;
 *              education snaps on as three segments; the dot leaves on a tangent and opens a portal
 *   D 372–560  the answer: a picture is a table of numbers — the numbers decode, colour ripples
 *              out from the centre, the grid stands up as a relief of a face, flattens, becomes a photo
 *   E 556–660  focus mode: quiet; the dot waits in the next empty field
 *   F 660–720  the name lands; the dot is its full stop
 */

// Screenshots are shown at native size, centred: plane coordinates = image coordinates + 17 px.
const OY = 17
const HOME = { heading: { x: 1025, y: 342 + OY }, inputL: 545, inputR: 1370, inputT: 445 + OY, inputB: 528 + OY, textX: 627, textY: 487 + OY, send: { x: 1336, y: 487 + OY } }
const CODE = { x: 985, y: 684 + OY, lines: [659, 685, 712].map((y) => y + OY), left: 628 }
const FOCUS_CARET = { x: 765, y: 548 }   // the empty field on the floating focus card
const QUESTION = '计算机眼里，图片是什么？'
const RING = { x: 1200, y: 548, r: 300 }

const clampI = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Zoom a 1920 × 1080 plane so plane point (fx, fy) sits at the centre of the frame, scaled by s. */
function zoomTo(fx: number, fy: number, s: number) {
  return `translate(${960 - fx * s}px, ${540 - fy * s}px) scale(${s})`
}

// ───────────────────────── A · the greeting ─────────────────────────
const G = { size: 104, left: 960 - (7 * 104) / 2, y: 470 }

function Greeting({ frame }: { frame: number }) {
  if (frame > 96) return null
  const hand = p(frame, 62, 86, inOut)
  // where the greeting's "今天想学什么？" sits on the real screen (the full-width ？ is narrow
  // on the page, so the glyph box centre sits right of the visual centre)
  const tx = HOME.heading.x + 22
  const ty = HOME.heading.y
  const s = mix(1, 46 / G.size, hand)
  const cx = mix(960, tx, hand)
  const cy = mix(G.y + G.size / 2, ty, hand)
  const pen = p(frame, 46, 66, inOut)
  const u0 = [G.left - 6, G.y + G.size + 30]
  const u1 = [G.left + 7 * G.size - 120, G.y + G.size + 24]
  const d = `M${u0[0]},${u0[1]} C${u0[0] + 220},${u0[1] - 14} ${u1[0] - 240},${u1[1] - 12} ${u1[0]},${u1[1]}`
  return (
    <AbsoluteFill style={{ opacity: 1 - p(frame, 80, 88) }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `960px ${G.y + G.size / 2}px`, transform: `translate(${cx - 960}px, ${cy - (G.y + G.size / 2)}px) scale(${s})` }}>
        <div style={{ position: 'absolute', left: G.left, top: G.y, fontFamily: SERIF_CN, fontSize: G.size, lineHeight: 1, color: PAPER, width: 7 * G.size + 40 }}>
          <Glyphs text="今天想学什么？" start={12} every={4} />
        </div>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path d={d} fill="none" stroke={PEN} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pen} />
        </svg>
      </div>
    </AbsoluteFill>
  )
}

/** The dot in A: pulse, caret, pen. Returns its screen position. */
function dotA(frame: number): [number, number, number] {
  const pulse = 1 + 0.25 * Math.max(0, Math.sin((frame / 20) * Math.PI * 2)) * (1 - p(frame, 10, 14))
  if (frame < 10) return [960, 540, pulse]
  const typed = Math.min(7, Math.max(0, Math.floor((frame - 12) / 4) + 1))
  const caret: [number, number] = [G.left + typed * G.size + 16, G.y + G.size * 0.82]
  const toCaret = p(frame, 8, 14, inOut)
  if (frame < 44) return [mix(960, caret[0], toCaret), mix(540, caret[1], toCaret), 1]
  // swoop to the start of the underline, then draw it
  const u0: [number, number] = [G.left - 6, G.y + G.size + 30]
  const u1: [number, number] = [G.left + 7 * G.size - 120, G.y + G.size + 24]
  const swoop = p(frame, 40, 47, inOut)
  if (frame < 47) return [mix(caret[0], u0[0], swoop), mix(caret[1], u0[1], swoop) + Math.sin(swoop * Math.PI) * 60, 1]
  const pen = p(frame, 46, 66, inOut)
  const x = mix(u0[0], u1[0], pen)
  const y = mix(u0[1], u1[1], pen) - Math.sin(pen * Math.PI) * 12
  return [x, y, 1]
}

// ───────────────────────── B · the real screen ─────────────────────────
function Home({ frame }: { frame: number }) {
  if (frame < 60 || frame > 212) return null
  const arrive = p(frame, 58, 86, out)
  const push = p(frame, 100, 176, inOut)
  const s = mix(1, 1.45, push)
  const fx = mix(960, (HOME.inputL + HOME.inputR) / 2, push)
  const fy = mix(540, HOME.textY, push)
  const enter = 180
  const fall = p(frame, 184, 206, inQ)
  const flash = p(frame, enter, enter + 3) * (1 - p(frame, enter + 3, enter + 20))
  const wave = p(frame, enter, enter + 22, out)
  const typedStart = 116
  return (
    <AbsoluteFill style={{ perspective: 1600, opacity: arrive * (1 - fall) }}>
      <Plane rx={mix(16, 0, arrive) + fall * 62 + Math.sin(frame / 40) * 1.2 * (1 - fall)} ry={mix(-8, 0, arrive) + Math.sin(frame / 55) * 1.5}
        z={mix(-700, 0, arrive) - fall * 300} y={fall * 260} origin="50% 100%">
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: zoomTo(fx, fy, s) }}>
          <Img src={staticFile('site/projects/educanvas/home.webp')} style={{ position: 'absolute', left: 0, top: OY, width: 1920 }} />
          {/* the placeholder, covered; the question, typed; the caret is the dot */}
          <div style={{ position: 'absolute', left: HOME.textX - 8, top: HOME.textY - 22, width: 660, height: 44, background: '#1f1c1b', opacity: p(frame, typedStart - 8, typedStart - 4) }} />
          <div style={{ position: 'absolute', left: HOME.textX, top: HOME.textY - 14, fontFamily: SANS, fontSize: 21, lineHeight: '28px', color: PAPER, opacity: 1 - p(frame, enter + 2, enter + 10), whiteSpace: 'pre' }}>
            {Array.from(QUESTION).slice(0, Math.max(0, Math.min(QUESTION.length, Math.floor((frame - typedStart) / 4) + 1))).join('')}
          </div>
          <div style={{ position: 'absolute', left: HOME.inputL, top: HOME.inputT, width: HOME.inputR - HOME.inputL, height: HOME.inputB - HOME.inputT, borderRadius: 42, border: `2px solid ${ACCENT}`, opacity: flash, boxShadow: `0 0 60px ${ACCENT}` }} />
          <div style={{ position: 'absolute', left: HOME.send.x - 200 * wave, top: HOME.send.y - 200 * wave, width: 400 * wave, height: 400 * wave, borderRadius: '50%', border: `2px solid ${ACCENT}`, opacity: (1 - wave) * (frame >= enter ? 0.8 : 0) }} />
        </div>
      </Plane>
    </AbsoluteFill>
  )
}

/** Where the question's caret is, on screen, while B runs (mirrors Home's camera). */
function caretB(frame: number): [number, number] {
  const push = p(frame, 100, 176, inOut)
  const s = mix(1, 1.45, push)
  const fx = mix(960, (HOME.inputL + HOME.inputR) / 2, push)
  const fy = mix(540, HOME.textY, push)
  const n = Math.max(0, Math.min(QUESTION.length, Math.floor((frame - 116) / 4) + 1))
  const px = HOME.textX + (frame < 116 ? 0 : n * 21) + 6
  const py = HOME.textY
  return [960 + (px - fx) * s, 540 + (py - fy) * s]
}

// ───────────────────────── C · the loop ─────────────────────────
const STATIONS = [
  { a: 0, en: 'gateway.v1', cn: '可信网关' },
  { a: 60, en: 'Notebook', cn: '长期上下文' },
  { a: 120, en: 'Model Gateway', cn: 'Provider Adapter' },
  { a: 180, en: 'Worker', cn: '异步工作' },
  { a: 240, en: 'PostgreSQL', cn: '事实 · 事件' },
  { a: 300, en: 'Entry', cn: 'Web / API / 多入口' },
]
const EDU = [{ a0: 136, a1: 164, en: 'Profile' }, { a0: 196, a1: 224, en: 'Skills' }, { a0: 256, a1: 284, en: 'Tools' }]

function polar(a: number, r = RING.r): [number, number] {
  const t = ((a - 90) * Math.PI) / 180
  return [RING.x + Math.cos(t) * r, RING.y + Math.sin(t) * r]
}

function arc(a0: number, a1: number, r: number) {
  const [x0, y0] = polar(a0, r)
  const [x1, y1] = polar(a1, r)
  return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`
}

/** Laps around the ring: accelerating, three and a bit. */
function laps(frame: number) {
  return 3.25 * Math.pow(p(frame, 240, 350, (t) => t), 1.7)
}

function Loop({ frame }: { frame: number }) {
  const fps = FPS
  if (frame < 196 || frame > 384) return null
  const draw = p(frame, 206, 232, inOut)
  const lap = laps(frame)
  const head = lap * 360
  const leave = p(frame, 352, 372, inQ)
  return (
    <AbsoluteFill style={{ opacity: p(frame, 196, 204) * (1 - leave) }}>
      {/* light that follows the dot */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${polar(head % 360)[0]}px ${polar(head % 360)[1]}px, ${ACCENT}2a 0%, transparent 22%)`, opacity: p(frame, 240, 260) }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={HAIR} strokeWidth={1.5} />
        <path d={arc(0, 359.9, RING.r)} fill="none" stroke={PAPER} strokeOpacity={0.5} strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        {/* the comet: a bright arc behind the dot */}
        {frame >= 240 ? (
          <path d={arc(Math.max(0, head % 360 - 70), Math.max(0.1, head % 360), RING.r)} fill="none" stroke={ACCENT} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
        ) : null}
        {/* education snaps on as an outer segment set */}
        {EDU.map((e, i) => {
          const s = spring({ frame: frame - (300 + i * 8), fps, config: { damping: 11, stiffness: 180, mass: 0.6 } })
          const r = mix(RING.r + 220, RING.r + 34, s)
          return (
            <g key={e.en} opacity={frame >= 300 + i * 8 ? Math.min(1, s * 1.5) : 0}>
              <path d={arc(e.a0, e.a1, r)} fill="none" stroke={ACCENT} strokeWidth={10} strokeLinecap="round" />
            </g>
          )
        })}
      </svg>
      {EDU.map((e, i) => {
        const s = spring({ frame: frame - (300 + i * 8), fps, config: { damping: 11, stiffness: 180, mass: 0.6 } })
        const [x, y] = polar((e.a0 + e.a1) / 2, mix(RING.r + 300, RING.r + 88, s))
        return (
          <div key={e.en} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: ACCENT, textTransform: 'uppercase', opacity: frame >= 300 + i * 8 ? Math.min(1, s) : 0 }}>{e.en}</div>
        )
      })}
      {/* stations */}
      {STATIONS.map((st, i) => {
        const appear = p(frame, 222 + i * 4, 236 + i * 4)
        const [x, y] = polar(st.a)
        // lit each time the head passes
        const since = ((head - st.a) % 360 + 360) % 360
        const passed = head >= st.a
        const lit = passed ? Math.max(0, 1 - since / 110) : 0
        const [lx, ly] = polar(st.a, RING.r + (st.a > 90 && st.a < 270 ? 64 : 58))
        const right = st.a > 0 && st.a < 180
        const left = st.a > 180
        return (
          <div key={st.en}>
            <div style={{ position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: '50%', background: INK, border: `2px solid ${lit > 0.05 ? ACCENT : FAINT}`, boxShadow: `0 0 ${30 * lit}px ${ACCENT}`, opacity: appear }} />
            <div style={{
              position: 'absolute', left: lx, top: ly, opacity: appear,
              transform: `translate(${right ? '0%' : left ? '-100%' : '-50%'}, ${st.a === 0 ? '-100%' : st.a === 180 ? '0%' : '-50%'})`,
              textAlign: right ? 'left' : left ? 'right' : 'center', whiteSpace: 'nowrap',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: lit > 0.3 ? ACCENT : MUTED }}>{st.en}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 22, color: PAPER, opacity: 0.6 + 0.4 * lit, marginTop: 4 }}>{st.cn}</div>
            </div>
          </div>
        )
      })}
      {/* the centre */}
      <div style={{ position: 'absolute', left: RING.x, top: RING.y, transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontFamily: SERIF, fontSize: 64, color: PAPER, lineHeight: 1 }}><Glyphs text="Agent Loop" start={226} every={2} lift={0.4} /></div>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color: MUTED, marginTop: 16 }}><Scramble text={`LAP ${Math.min(3, Math.floor(lap) + 1)} · PLAN → ACT → OBSERVE`} start={240} dur={14} seed="lap" /></div>
      </div>
      {/* kinetic caption */}
      <div style={{ position: 'absolute', left: 150, top: 380, opacity: p(frame, 232, 244) }}>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.2em', color: MUTED }}>ONE AGENT RUNTIME</div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 64, color: PAPER, marginTop: 22, height: 84 }}>
          <WordSwap words={['通用协作', '知识与创作', '可信的学习']} at={[236, 270, 304]} style={{ width: '5.2em' }} />
        </div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 40, color: PAPER, opacity: 0.7, marginTop: 10 }}>共用一个 Agent Loop</div>
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: ACCENT, marginTop: 30, opacity: p(frame, 306, 318) }}>+ 教育能力按需加入</div>
      </div>
    </AbsoluteFill>
  )
}

function dotC(frame: number): [number, number, number] {
  if (frame < 206) {
    const k = p(frame, 196, 206, inOut)
    const [tx, ty] = polar(0)
    return [mix(960, tx, k), mix(540, ty, k), 1]
  }
  if (frame < 240) return [...polar(p(frame, 206, 232, inOut) * 360), 1] as [number, number, number]
  if (frame < 350) return [...polar((laps(frame) * 360) % 360), 1.1] as [number, number, number]
  // off on a tangent, toward the centre of the frame, growing into a portal
  const [x0, y0] = polar((laps(350) * 360) % 360)
  const k = p(frame, 350, 366, inOut)
  return [mix(x0, 960, k), mix(y0, 540, k), 1 + k * 1.5]
}

// ───────────────────────── D · the answer ─────────────────────────
const G32 = pixels.g32 as number[][]
const G64 = pixels.g64 as number[][]

function Answer({ frame }: { frame: number }) {
  if (frame < 362 || frame > 566) return null
  const portal = interpolate(frame, [362, 384], [0, 1300], { ...clampI, easing: inQ })
  const settle = p(frame, 366, 400, out)
  const push = p(frame, 398, 440, inOut)
  const s = mix(1, 2.3, push)
  const fx = mix(960, CODE.x, push)
  const fy = mix(540, CODE.y, push)
  const glow = p(frame, 436, 446) * (1 - p(frame, 452, 464))
  const planeOut = p(frame, 450, 468)
  return (
    <AbsoluteFill style={{ clipPath: `circle(${portal}px at 960px 540px)`, perspective: 1600 }}>
      <AbsoluteFill style={{ opacity: 1 - planeOut }}>
        <Plane rx={mix(12, 0, settle)} z={mix(-240, 0, settle)}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: zoomTo(fx, fy, s) }}>
            <Img src={staticFile('site/projects/educanvas/learning-response.webp')} style={{ position: 'absolute', left: 0, top: OY, width: 1920 }} />
            {CODE.lines.map((y, i) => (
              <div key={y} style={{ position: 'absolute', left: CODE.left - 6, top: y - 12, width: [118, 118, 162][i], height: 24, borderRadius: 4, background: ACCENT, opacity: glow * 0.35, boxShadow: `0 0 20px ${ACCENT}` }} />
            ))}
          </div>
        </Plane>
      </AbsoluteFill>
      <Relief frame={frame} />
    </AbsoluteFill>
  )
}

function Relief({ frame }: { frame: number }) {
  if (frame < 448) return null
  const cellW = 60
  const cellH = 60
  const tilt = interpolate(frame, [452, 530], [42, 0], { ...clampI, easing: inOut })
  const spin = interpolate(frame, [452, 530], [-9, 0], { ...clampI, easing: inOut })
  const zoom = interpolate(frame, [452, 530], [0.86, 1], { ...clampI, easing: inOut })
  const relief = p(frame, 482, 500, out) * (1 - p(frame, 512, 532, inOut))
  const fine = p(frame, 526, 538, inOut)
  const photo = p(frame, 536, 556, inOut)
  const tick = Math.floor(frame / 2)
  return (
    <AbsoluteFill style={{ perspective: 1400, opacity: p(frame, 448, 462) }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${tilt}deg) rotateZ(${spin}deg) scale(${zoom})`, opacity: 1 - fine }}>
        {G32.map(([r, g, b], i) => {
          const col = i % 32
          const row = Math.floor(i / 32)
          const d = Math.hypot((col - 15.5) / 16, (row - 8.5) / 9) / 1.41
          const appear = p(frame, 448 + d * 14, 456 + d * 14)
          const fill = p(frame, 474 + d * 20, 484 + d * 20)
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
          const decoded = frame > 470 + d * 10
          const txt = decoded ? `${r},${g},${b}` : `${(i * 7 + tick * 13) % 256},${(i * 11 + tick * 5) % 256},${(i * 3 + tick * 17) % 256}`
          return (
            <div key={i} style={{
              position: 'absolute', left: col * cellW, top: row * cellH, width: cellW, height: cellH,
              transform: `translateZ(${lum * 150 * relief}px)`,
              background: `rgba(${r},${g},${b},${fill})`, outline: `1px solid rgba(17,18,16,${0.3 + 0.4 * (1 - fill)})`,
              opacity: appear, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: fill > 0.5 ? 'rgba(17,18,16,0.5)' : decoded ? 'rgba(234,231,223,0.62)' : 'rgba(129,146,216,0.7)', opacity: 1 - p(frame, 494, 510) }}>{txt}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: fine * (1 - photo) }}>
        {G64.map(([r, g, b], i) => (
          <div key={i} style={{ position: 'absolute', left: (i % 64) * 30, top: Math.floor(i / 64) * 30, width: 30.5, height: 30.5, background: `rgb(${r},${g},${b})` }} />
        ))}
      </div>
      <Img src={staticFile(`site/${pixels.src}`)} style={{
        position: 'absolute', left: 0, width: 1920, top: -(pixels.crop[1] / pixels.crop[2]) * 1920, opacity: photo,
        transform: `scale(${1 + p(frame, 536, 640, (t) => t) * 0.05})`, transformOrigin: '50% 40%',
      }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(17,18,16,0.88) 100%)', opacity: p(frame, 484, 500) }} />
      <div style={{ position: 'absolute', left: 120, bottom: 150, fontFamily: SERIF_CN, fontSize: 54, color: PAPER }}>
        <Glyphs text="在计算机眼里，图片是一张数字表格" start={488} every={1.5} lift={0.3} />
      </div>
      <div style={{ position: 'absolute', left: 122, bottom: 108, fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: MUTED }}>
        <Scramble text="AGENT 生成的结构化学习内容 · 每一格都是一组 [R, G, B]" start={500} dur={22} seed="cap" />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── E · focus ─────────────────────────
function Focus({ frame }: { frame: number }) {
  if (frame < 550 || frame > 672) return null
  const inK = p(frame, 552, 580, inOut)
  const drift = p(frame, 552, 672, (t) => t)
  const out_ = p(frame, 652, 668, inQ)
  return (
    <AbsoluteFill style={{ perspective: 1800, opacity: inK * (1 - out_) }}>
      <Plane rx={mix(10, 3, inK)} ry={mix(-7, 3, drift)} z={mix(-380, -150, drift)}>
        <div style={{
          position: 'absolute', left: 150, top: 90, width: 1620, height: 882, borderRadius: 22, overflow: 'hidden',
          border: `1px solid ${HAIR}`, boxShadow: '0 60px 140px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.4)',
        }}>
          <Img src={staticFile('site/projects/educanvas/focus-mode.webp')} style={{ position: 'absolute', left: 0, top: 0, width: 1620, filter: `blur(${(1 - inK) * 6}px)` }} />
        </div>
      </Plane>
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(17,18,16,0.72) 0%, transparent 46%)' }} />
      <div style={{ position: 'absolute', left: 120, bottom: 200, fontFamily: SERIF_CN, fontSize: 56, color: PAPER }}>
        <Glyphs text="安静地学下去" start={574} every={3} lift={0.35} />
      </div>
      <div style={{ position: 'absolute', left: 122, bottom: 158, fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: MUTED }}>
        <Scramble text="FOCUS MODE · 沉浸式学习 · 过程可追溯" start={586} dur={16} seed="focus" />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── F · the name ─────────────────────────
const NAME = 'EduCanvas'
const NAME_SIZE = 156

function End({ frame }: { frame: number }) {
  if (frame < 660) return null
  const ring = p(frame, 660, 700, inOut)
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={960} cy={500} r={420} fill="none" stroke={ACCENT} strokeOpacity={0.14} strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(-90 960 500)" />
      </svg>
      <div style={{ position: 'absolute', top: 360, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: NAME_SIZE, lineHeight: 1, color: PAPER }}>
        <Glyphs text={NAME} start={662} every={2} lift={0.5} />
        <span style={{ color: 'transparent' }}>.</span>
      </div>
      <div style={{ position: 'absolute', top: 562, width: '100%', textAlign: 'center', fontFamily: SERIF_CN, fontSize: 36, color: PAPER, opacity: 0.9 }}>
        <Glyphs text="教育能力驱动的通用个人 Agent 平台" start={676} every={0.8} lift={0.3} />
      </div>
      <div style={{ position: 'absolute', top: 628, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.16em', color: MUTED }}>
        <Scramble text="ONE AGENT RUNTIME ACROSS KNOWLEDGE, CREATION AND TRUSTED LEARNING" start={684} dur={20} seed="tag" />
      </div>
      <div style={{ position: 'absolute', top: 694, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
        {['Next.js', 'TypeScript', 'PostgreSQL', 'Drizzle', 'Docker'].map((s, i) => {
          const k = p(frame, 692 + i * 2, 704 + i * 2)
          return <div key={s} style={{ fontFamily: MONO, fontSize: 15, color: PAPER, opacity: 0.75 * k, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '7px 16px', transform: `translateY(${(1 - k) * 12}px)` }}>{s}</div>
        })}
      </div>
    </AbsoluteFill>
  )
}

/** The full stop of the name, measured at render time from the laid-out glyphs. */
function periodPoint(): [number, number] {
  // Playfair Display at 156 px: "EduCanvas" is ~700 px wide; the full stop sits on the baseline.
  return [960 + 351 + 12, 360 + NAME_SIZE * 0.78]
}

// ───────────────────────── the dot, all the way through ─────────────────────────
function TheDot({ frame }: { frame: number }) {
  const fps = FPS
  let x = 960
  let y = 540
  let size = 14
  let op = 1
  if (frame < 72) {
    const [ax, ay, s] = dotA(frame)
    x = ax; y = ay; size = 14 * s
  } else if (frame < 180) {
    // from the underline's end into the input: it becomes the question's caret
    const [ax, ay] = dotA(66)
    const [cx, cy] = caretB(frame)
    const k = p(frame, 72, 104, inOut)
    x = mix(ax, cx, k); y = mix(ay, cy, k) - Math.sin(k * Math.PI) * 80
    size = mix(14, 9, k)
    op = frame >= 104 && frame < 116 ? (Math.floor(frame / 6) % 2 ? 0.35 : 1) : 1
  } else if (frame < 196) {
    const [cx, cy] = caretB(179)
    const k = p(frame, 180, 196, inOut)
    x = mix(cx, 960, k); y = mix(cy, 540, k) - Math.sin(k * Math.PI) * 140
    size = mix(9, 16, k)
  } else if (frame < 366) {
    const [cx, cy, s] = dotC(frame)
    x = cx; y = cy; size = 14 * s
  } else if (frame < 556) {
    op = 0
  } else if (frame < 666) {
    const k = p(frame, 560, 590, inOut)
    const [fxp, fyp] = [FOCUS_CARET.x, FOCUS_CARET.y]
    x = mix(960, fxp, k); y = mix(540, fyp, k)
    size = 10
    op = p(frame, 562, 572) * (frame > 596 ? (Math.floor(frame / 12) % 2 ? 0.3 : 1) : 1)
  } else {
    // flies to the name and lands as its full stop, with a little bounce
    const [px, py] = periodPoint()
    const s = spring({ frame: frame - 680, fps, config: { damping: 9, stiffness: 140, mass: 0.7 } })
    const k = p(frame, 666, 682, inOut)
    x = mix(FOCUS_CARET.x, px, frame < 680 ? k : 1)
    y = frame < 680 ? mix(FOCUS_CARET.y, py - 60, k) : py - 60 * (1 - s)
    size = 22
  }
  return <Dot x={x} y={y} accent={ACCENT} size={size} opacity={op} />
}

function Film() {
  const frame = useCurrentFrame()
  return (
    <>
      <Home frame={frame} />
      <Greeting frame={frame} />
      <Loop frame={frame} />
      <Answer frame={frame} />
      <Focus frame={frame} />
      <End frame={frame} />
      <TheDot frame={frame} />
    </>
  )
}

function Frame() {
  useFonts()
  const frame = useCurrentFrame()
  return (
    <Stage accent={ACCENT}>
      <AbsoluteFill><Film /></AbsoluteFill>
      <Hud index="01" name="EduCanvas" meta="Agent Runtime · 2026" accent={ACCENT} />
      <AbsoluteFill style={{ background: INK, opacity: 1 - p(frame, 0, 6), pointerEvents: 'none' }} />
    </Stage>
  )
}

/** 30 fps, for scrubbing in the studio and for stills. */
export const EduCanvas: React.FC = () => <Frame />

/**
 * The same film rendered four times per film frame (120 fps). Every component still reads a
 * 30 fps clock, now fractional; ffmpeg then averages sub-frames into a 180° shutter
 * (see render.sh). Remotion's CameraMotionBlur stacks layers with plus-lighter, which shifted
 * this film's colour towards red; averaging real frames afterwards does not.
 */
export const EduCanvasSub: React.FC = () => {
  const sub = useCurrentFrame()
  return <Freeze frame={sub / 4}><Frame /></Freeze>
}
