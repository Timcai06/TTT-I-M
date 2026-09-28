import { AbsoluteFill, Audio, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion'
import { Dot, Stage, useFonts } from '../ui/kit'
import { Glyphs, Plane, Scramble, WordSwap } from '../ui/motion'
import { FAINT, FPS, HAIR, INK, MONO, MUTED, PAPER, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../ui/theme'
import clips from './clips.json'
import cues from './cues.json'

/*
 * EduCanvas — the competition film (JBGS-2026-02), about 2:52 at 30 fps.
 * Brief, shot list and sources: tools/project_films/briefs/educanvas-competition.md
 *
 *   S0   0– 12 s  the question, the name
 *   S1  12– 32 s  what today's tools do, and what none of them know
 *   S2  32– 45 s  a lesson is one loop (the competition's eight steps)
 *   S3  45–110 s  the real product, real model, recorded by script: set up → ask → Canvas → graded →
 *                 mastery → reload
 *   S4 110–134 s  one Agent, one gateway, trusted facts
 *   S5 134–150 s  the evidence: tests that ran, gates that hold
 *   S6 150–172 s  the promise, the name
 */

export const PITCH_SECONDS = cues.seconds
const PURPLE = '#8e70c4'   // EduCanvas' own accent, lifted for a dark stage
const PEN = '#d77b5f'      // the product's underline
const s = (sec: number) => Math.round(sec * FPS)
type ClipName = keyof typeof clips

// ───────────────────────── narration (placeholder voice; see brief) ─────────────────────────
const NARRATION = cues.narration as [string, number][]

// ───────────────────────── the recorded product ─────────────────────────
/** Where each clip sits in the film, and where the camera looks while it plays (page px, 1920 × 1080). */
const REEL: { clip: ClipName; at: number; cam: [number, number, number, number][] }[] = [
  // [clip-local seconds, x, y, scale]; the camera is clamped to the page, so it never shows past its edge
  { clip: 'setup', at: 46, cam: [[0, 960, 540, 1], [1.2, 960, 590, 1.45], [3.2, 960, 560, 1.45], [4.6, 960, 450, 1.5], [6.8, 960, 520, 1.25], [8.2, 960, 470, 1.35], [16.5, 960, 470, 1.35], [18, 960, 540, 1]] },
  { clip: 'ask', at: 64, cam: [[0, 960, 540, 1], [1.2, 960, 546, 1.55], [6.2, 960, 546, 1.55], [7, 960, 540, 1.15]] },
  { clip: 'answer', at: 71, cam: [[0, 1010, 420, 1.3], [8, 1010, 520, 1.3]] },
  { clip: 'read', at: 79, cam: [[0, 1010, 520, 1.3], [3, 1010, 560, 1.2]] },
  { clip: 'canvas', at: 82, cam: [[0, 1010, 540, 1.1], [2.4, 1500, 300, 1.25], [4.6, 1250, 500, 1], [6, 1250, 500, 1.2]] },
  { clip: 'quiz', at: 88, cam: [[0, 1250, 500, 1.2], [1, 1200, 380, 1.45], [5, 1200, 400, 1.45]] },
  { clip: 'graded', at: 93, cam: [[0, 1200, 400, 1.45], [2.5, 1200, 560, 1.4], [6, 1250, 600, 1.3]] },
  { clip: 'progress', at: 99, cam: [[0, 1100, 540, 1], [4.1, 1500, 540, 1.35], [6, 1500, 540, 1.4]] },
  { clip: 'reload', at: 105, cam: [[0, 1100, 540, 1], [4.9, 1500, 540, 1.3], [6, 1500, 540, 1.38]] },
]

function camAt(cam: [number, number, number, number][], t: number) {
  let i = 0
  while (i < cam.length - 2 && t > cam[i + 1][0]) i++
  const [t0, x0, y0, s0] = cam[i]
  const [t1, x1, y1, s1] = cam[Math.min(i + 1, cam.length - 1)]
  const k = t1 > t0 ? inOut(Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))) : 1
  const sc = mix(s0, s1, k)
  const clamp = (v: number, half: number, size: number) => Math.min(size - half / sc, Math.max(half / sc, v))
  return { x: clamp(mix(x0, x1, k), 960, 1920), y: clamp(mix(y0, y1, k), 540, 1080), sc }
}

/** The camera on the recorded page at a film frame. */
function camFor(frame: number) {
  const current = [...REEL].reverse().find((r) => frame >= s(r.at)) ?? REEL[0]
  return camAt(current.cam, (frame - s(current.at)) / FPS)
}

// the card the page plays in: 1680 px wide at (120, 88)
const CARD = { x: 120, y: 88, k: 1680 / 1920 }

/** A point on the recorded page (1920 × 1080 px) → where it is on screen right now. */
function pageToScreen(frame: number, px: number, py: number): [number, number] {
  const c = camFor(frame)
  return [CARD.x + CARD.k * (960 + (px - c.x) * c.sc), CARD.y + CARD.k * (540 + (py - c.y) * c.sc)]
}

/** The product, as a floating card in space, the camera pushing in on whatever matters. */
function Reel({ frame }: { frame: number }) {
  const start = s(45)
  const end = s(111)
  if (frame < start - 10 || frame > end + 10) return null
  const enter = p(frame, start - 10, start + 18, out)
  const leave = p(frame, end - 16, end + 6, inQ)
  const cam = camFor(frame)
  const drift = Math.sin(frame / 90) * 1.2
  return (
    <AbsoluteFill style={{ perspective: 2200, opacity: enter * (1 - leave) }}>
      <Plane rx={mix(18, 3, enter) + leave * 20} ry={-3 + drift} z={mix(-600, 0, enter) - leave * 400}>
        <div style={{
          position: 'absolute', left: CARD.x, top: CARD.y, width: 1680, height: 945, borderRadius: 18, overflow: 'hidden',
          boxShadow: `0 70px 160px rgba(0,0,0,0.6), 0 0 0 1px ${HAIR}, 0 0 120px -40px ${PURPLE}66`, background: '#f4f0e8',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${CARD.k})` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - cam.x * cam.sc}px, ${540 - cam.y * cam.sc}px) scale(${cam.sc})` }}>
              {REEL.map((r) => (
                <Sequence key={r.clip} from={s(r.at)} durationInFrames={Math.round(clips[r.clip].seconds * FPS)} layout="none">
                  <OffthreadVideo src={staticFile(`takes/clips/${r.clip}.mp4`)} muted style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }} />
                </Sequence>
              ))}
            </div>
          </div>
        </div>
      </Plane>
    </AbsoluteFill>
  )
}

/** A label pinned to a point on the recorded page: it follows the camera, and sits on a dark chip. */
function Callout({ frame, at, dur, x, y, text, sub, side = 'left', len = 150 }: {
  frame: number; at: number; dur: number; x: number; y: number; text: string; sub?: string; side?: 'left' | 'right'; len?: number
}) {
  const a = s(at)
  const b = s(at + dur)
  if (frame < a - 2 || frame > b + 12) return null
  const k = p(frame, a, a + 14, out) * (1 - p(frame, b, b + 10, inQ))
  const w = len * p(frame, a, a + 16, out)
  const [sx, sy] = pageToScreen(frame, x, y)
  const dir = side === 'left' ? -1 : 1
  return (
    <div style={{ position: 'absolute', left: sx, top: sy, opacity: k }}>
      <div style={{ position: 'absolute', top: -0.75, left: dir < 0 ? -w : 0, width: w, height: 1.5, background: PURPLE }} />
      <div style={{ position: 'absolute', top: -7, left: -7, width: 14, height: 14, borderRadius: '50%', background: PURPLE, boxShadow: `0 0 0 5px ${PURPLE}33, 0 0 18px ${PURPLE}` }} />
      <div style={{
        position: 'absolute', top: 0, left: dir * (w + 10), whiteSpace: 'nowrap',
        transform: `translate(${dir < 0 ? '-100%' : '0'}, -50%) translateY(${(1 - k) * 10}px)`,
        background: 'rgba(17,18,16,0.86)', border: `1px solid ${HAIR}`, borderRadius: 12, padding: '12px 18px 11px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
      }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 30, color: PAPER, lineHeight: 1.15 }}>{text}</div>
        {sub ? <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', color: MUTED, marginTop: 6, textTransform: 'uppercase' }}>{sub}</div> : null}
      </div>
    </div>
  )
}

/** A fact stated on screen, not pinned to the page: centred low, on the same chip. */
function Note({ frame, at, dur, text, sub }: { frame: number; at: number; dur: number; text: string; sub?: string }) {
  const a = s(at)
  const b = s(at + dur)
  if (frame < a - 2 || frame > b + 12) return null
  const k = p(frame, a, a + 14, out) * (1 - p(frame, b, b + 10, inQ))
  return (
    <div style={{ position: 'absolute', left: 960, bottom: 118, opacity: k, transform: `translate(-50%, ${(1 - k) * 14}px)`, whiteSpace: 'nowrap', textAlign: 'center',
      background: 'rgba(17,18,16,0.9)', border: `1px solid ${HAIR}`, borderRadius: 14, padding: '16px 26px 14px', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
      <div style={{ fontFamily: SERIF_CN, fontSize: 32, color: PAPER }}>{text}</div>
      {sub ? <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.1em', color: MUTED, marginTop: 8 }}>{sub}</div> : null}
    </div>
  )
}

function SpeedBadge({ frame, at, dur, text }: { frame: number; at: number; dur: number; text: string }) {
  const k = p(frame, s(at), s(at) + 10) * (1 - p(frame, s(at + dur) - 8, s(at + dur)))
  return (
    <div style={{
      position: 'absolute', right: 150, top: 52, opacity: k, fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', color: PAPER,
      border: `1px solid ${HAIR}`, borderRadius: 999, padding: '8px 16px', background: 'rgba(17,18,16,0.6)',
    }}>{text}</div>
  )
}

function SectionLabel({ frame, from, to, index, text }: { frame: number; from: number; to: number; index: string; text: string }) {
  const k = p(frame, s(from), s(from) + 14) * (1 - p(frame, s(to) - 12, s(to)))
  return (
    <div style={{ position: 'absolute', left: 150, top: 48, opacity: k, fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color: MUTED }}>
      <span style={{ color: PURPLE }}>●</span>&nbsp;&nbsp;{index} / <Scramble text={text} start={s(from)} dur={14} seed={index} />
    </div>
  )
}

// ───────────────────────── S0 · the question ─────────────────────────
const G = { size: 108, y: 440 }
const G_TEXT = '今天想学什么？'
const G_LEFT = 960 - (G_TEXT.length * G.size) / 2

function Opening({ frame }: { frame: number }) {
  if (frame > s(12.5)) return null
  const pen = p(frame, s(3.2), s(4.2), inOut)
  const lift = p(frame, s(6.8), s(8.2), inOut)
  const name = p(frame, s(7.6), s(9.2), out)
  const leave = p(frame, s(11.2), s(12.4), inQ)
  const u0 = [G_LEFT - 6, G.y + G.size + 30]
  const u1 = [G_LEFT + 7 * G.size - 124, G.y + G.size + 24]
  return (
    <AbsoluteFill style={{ opacity: 1 - leave }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-lift * 150}px) scale(${1 - lift * 0.35})`, transformOrigin: '960px 500px', opacity: 1 - lift * 0.55 }}>
        <div style={{ position: 'absolute', left: G_LEFT, top: G.y, fontFamily: SERIF_CN, fontSize: G.size, lineHeight: 1, color: PAPER }}>
          <Glyphs text={G_TEXT} start={s(1.2)} every={5} />
        </div>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path d={`M${u0[0]},${u0[1]} C${u0[0] + 220},${u0[1] - 14} ${u1[0] - 240},${u1[1] - 12} ${u1[0]},${u1[1]}`} fill="none" stroke={PEN} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pen} />
        </svg>
      </div>
      <div style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 170, color: PAPER, lineHeight: 1, opacity: name, transform: `translateY(${(1 - name) * 40}px)`, filter: `blur(${(1 - name) * 8}px)` }}>
        EduCanvas
      </div>
      <div style={{ position: 'absolute', top: 760, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 17, letterSpacing: '0.2em', color: MUTED, opacity: p(frame, s(9), s(9.8)) }}>
        <Scramble text="以教育能力为核心的通用个人 AGENT 平台" start={s(9)} dur={18} seed="tag" />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── S1 · what tools do ─────────────────────────
const TOOLS = [
  { en: 'CHAT', cn: '通用对话', does: '给你一个答案' },
  { en: 'NOTEBOOK Q&A', cn: '资料问答', does: '帮你查资料、给出引用' },
  { en: 'RAG', cn: '检索增强', does: '找到相关的内容' },
]

function Problem({ frame }: { frame: number }) {
  const a = s(12)
  const b = s(32)
  if (frame < a || frame > b + 4) return null
  const dim = p(frame, s(17.2), s(18.4), inOut)
  const statement = p(frame, s(21), s(22), out)
  const leave = p(frame, b - 14, b, inQ)
  return (
    <AbsoluteFill style={{ opacity: 1 - leave }}>
      <div style={{ position: 'absolute', top: 250, width: '100%', display: 'flex', justifyContent: 'center', gap: 36, transform: `translateY(${-statement * 120}px) scale(${1 - statement * 0.2})`, opacity: 1 - statement * 0.55 }}>
        {TOOLS.map((tool, i) => {
          const k = spring({ frame: frame - a - 10 - i * 7, fps: FPS, config: { damping: 14, stiffness: 150 } })
          return (
            <div key={tool.en} style={{
              width: 420, height: 230, borderRadius: 18, border: `1px solid ${HAIR}`, background: '#161715', padding: 30, boxSizing: 'border-box',
              transform: `translateY(${(1 - k) * 60}px)`, opacity: Math.min(1, k * 1.4) * (1 - dim * 0.35),
            }}>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.16em', color: MUTED }}>{tool.en}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 40, color: PAPER, marginTop: 16 }}>{tool.cn}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 24, color: PAPER, opacity: 0.65, marginTop: 14 }}>✓ {tool.does}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 24, color: PEN, marginTop: 12, opacity: p(frame, s(17.4) + i * 5, s(18.2) + i * 5) }}>✕ 不知道你学会了没有</div>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center', opacity: statement }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 68, color: PAPER }}>
          <Glyphs text="让系统知道你学到哪了" start={s(21.3)} every={1.6} lift={0.35} />
        </div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 40, color: PAPER, opacity: 0.75, marginTop: 26 }}>
          <Glyphs text="而且这个判断，不是模型说的" start={s(24.4)} every={1.6} lift={0.3} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── S2 · the loop (the competition's eight steps) ─────────────────────────
const STEPS8 = ['选择学段', '判断水平', '对话讲解', 'Canvas 互动', '练习实践', '自动评价', '更新掌握度', '推荐下一步']
const R8 = { x: 960, y: 560, r: 300 }

function ring(a: number, r = R8.r): [number, number] {
  const t = ((a - 90) * Math.PI) / 180
  return [R8.x + Math.cos(t) * r, R8.y + Math.sin(t) * r]
}

function Loop8({ frame }: { frame: number }) {
  const a = s(32)
  const b = s(45)
  if (frame < a || frame > b + 4) return null
  const draw = p(frame, a + 6, a + 36, inOut)
  const lap = p(frame, s(34.5), s(43.5), inOut)
  const leave = p(frame, b - 12, b, inQ)
  const head = lap * 360
  return (
    <AbsoluteFill style={{ opacity: p(frame, a, a + 10) * (1 - leave) }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={R8.x} cy={R8.y} r={R8.r} fill="none" stroke={PAPER} strokeOpacity={0.35} strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform={`rotate(-90 ${R8.x} ${R8.y})`} />
        <circle cx={R8.x} cy={R8.y} r={R8.r} fill="none" stroke={PURPLE} strokeWidth={3} pathLength={1} strokeDasharray={`${lap} 1`} transform={`rotate(-90 ${R8.x} ${R8.y})`} />
      </svg>
      {STEPS8.map((label, i) => {
        const ang = i * 45
        const [x, y] = ring(ang)
        const [lx, ly] = ring(ang, R8.r + 70)
        const lit = head >= ang ? 1 : 0
        return (
          <div key={label}>
            <div style={{ position: 'absolute', left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: '50%', background: lit ? PURPLE : INK, border: `2px solid ${lit ? PURPLE : FAINT}`, boxShadow: lit ? `0 0 18px ${PURPLE}` : 'none', opacity: p(frame, a + 8 + i * 3, a + 18 + i * 3) }} />
            <div style={{ position: 'absolute', left: lx, top: ly, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', fontFamily: SERIF_CN, fontSize: 26, color: PAPER, opacity: p(frame, a + 10 + i * 3, a + 22 + i * 3) * (0.55 + 0.45 * lit) }}>
              <span style={{ fontFamily: MONO, fontSize: 14, color: lit ? PURPLE : MUTED, marginRight: 10 }}>0{i + 1}</span>{label}
            </div>
          </div>
        )
      })}
      <Dot x={ring(head)[0]} y={ring(head)[1]} accent={PURPLE} size={16} opacity={p(frame, s(34.2), s(34.6))} />
      <div style={{ position: 'absolute', left: R8.x, top: R8.y, transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 46, color: PAPER }}><Glyphs text="一节课，一条闭环" start={s(33.2)} every={2} lift={0.3} /></div>
        <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.18em', color: MUTED, marginTop: 14 }}><Scramble text="赛题 JBGS-2026-02 · 必须形成的闭环" start={s(34)} dur={16} seed="jbgs" /></div>
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── S4 · one Agent ─────────────────────────
const ARCH = [
  { a: 0, en: 'gateway.v1', cn: '所有入口的唯一网关' },
  { a: 60, en: 'Notebook', cn: '资料 · 对话 · 产物' },
  { a: 120, en: 'Model Gateway', cn: '模型提供方被隔离' },
  { a: 180, en: 'Trusted Services', cn: '判分 · 掌握度 · 学习事件' },
  { a: 240, en: 'PostgreSQL', cn: '业务事实源' },
  { a: 300, en: 'Web · 桌面 · TUI · 渠道', cn: '同一个 Agent' },
]
const RA = { x: 1270, y: 560, r: 290 }
function ringA(a: number, r = RA.r): [number, number] {
  const t = ((a - 90) * Math.PI) / 180
  return [RA.x + Math.cos(t) * r, RA.y + Math.sin(t) * r]
}

function Architecture({ frame }: { frame: number }) {
  const a = s(110)
  const b = s(134)
  if (frame < a || frame > b + 4) return null
  const draw = p(frame, a + 4, a + 34, inOut)
  const laps = 2.2 * Math.pow(p(frame, s(112), s(132), (t) => t), 1.4)
  const head = (laps * 360) % 360
  const leave = p(frame, b - 14, b, inQ)
  const lock = p(frame, s(126.5), s(127.5), out)   // "only the server can write" — the trusted station locks
  return (
    <AbsoluteFill style={{ opacity: p(frame, a, a + 12) * (1 - leave) }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={RA.x} cy={RA.y} r={RA.r} fill="none" stroke={PAPER} strokeOpacity={0.3} strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform={`rotate(-90 ${RA.x} ${RA.y})`} />
      </svg>
      {ARCH.map((st, i) => {
        const [x, y] = ringA(st.a)
        const [lx, ly] = ringA(st.a, RA.r + 62)
        const since = ((laps * 360 - st.a) % 360 + 360) % 360
        const lit = laps * 360 >= st.a ? Math.max(0, 1 - since / 120) : 0
        const trusted = st.a === 180
        const right = st.a > 0 && st.a < 180
        const left = st.a > 180
        return (
          <div key={st.en}>
            <div style={{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20, borderRadius: trusted ? 5 : '50%', background: trusted && lock > 0 ? PURPLE : INK, border: `2px solid ${lit > 0.05 || (trusted && lock > 0) ? PURPLE : FAINT}`, boxShadow: `0 0 ${24 * Math.max(lit, trusted ? lock : 0)}px ${PURPLE}`, opacity: p(frame, a + 14 + i * 4, a + 26 + i * 4) }} />
            <div style={{
              position: 'absolute', left: lx, top: ly, opacity: p(frame, a + 16 + i * 4, a + 30 + i * 4),
              transform: `translate(${right ? '0%' : left ? '-100%' : '-50%'}, ${st.a === 0 ? '-100%' : st.a === 180 ? '0%' : '-50%'})`, textAlign: right ? 'left' : left ? 'right' : 'center', whiteSpace: 'nowrap',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.12em', color: lit > 0.3 || (trusted && lock > 0) ? PURPLE : MUTED }}>{st.en}{trusted ? <span style={{ opacity: lock }}>  🔒 SERVER ONLY</span> : null}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 24, color: PAPER, opacity: 0.6 + 0.4 * lit, marginTop: 4 }}>{st.cn}</div>
            </div>
          </div>
        )
      })}
      <Dot x={ringA(head)[0]} y={ringA(head)[1]} accent={PURPLE} size={15} opacity={p(frame, s(112), s(112.4))} />
      <div style={{ position: 'absolute', left: RA.x, top: RA.y, transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontFamily: SERIF, fontSize: 58, color: PAPER, lineHeight: 1 }}><Glyphs text="Agent Loop" start={a + 20} every={2} lift={0.4} /></div>
        <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.18em', color: MUTED, marginTop: 14 }}><Scramble text="唯一的 AGENT RUNTIME" start={a + 28} dur={14} seed="rt" /></div>
      </div>
      <div style={{ position: 'absolute', left: 150, top: 360 }}>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.2em', color: MUTED }}>ARCHITECTURE</div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 52, color: PAPER, marginTop: 20, lineHeight: 1.25 }}>
          <Glyphs text="教育不是第二套智能体" start={a + 18} every={1.6} lift={0.3} />
        </div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 32, color: PAPER, opacity: 0.75, marginTop: 18, height: 46 }}>
          <WordSwap words={['而是同一个 Agent 的核心能力', '模型只能调用本轮获准的工具', '成绩和掌握度，只有服务端能写']} at={[a + 90, s(120.8), s(126.4)]} style={{ width: '14em' }} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── S5 · evidence ─────────────────────────
const FACTS: [number | string, string, string][] = [
  [5243, '个测试用例', '单元 · 集成 · 浏览器 E2E · 工具链'],
  [0, '失败', '采集于 2026-09-17，本机实跑'],
  [26, '个工作区', '每个都有自己的测试'],
  [14, '道 CI 门禁', '每一次提交都要通过'],
  ['3', '套浏览器矩阵', 'Chrome · 手机视口 · Firefox'],
  ['9/9', '黄金旅程', 'general 9/9 · learning 9/9'],
]

function Evidence({ frame }: { frame: number }) {
  const a = s(134)
  const b = s(150)
  if (frame < a || frame > b + 4) return null
  const leave = p(frame, b - 14, b, inQ)
  return (
    <AbsoluteFill style={{ opacity: p(frame, a, a + 12) * (1 - leave) }}>
      <div style={{ position: 'absolute', top: 170, width: '100%', textAlign: 'center', fontFamily: SERIF_CN, fontSize: 52, color: PAPER }}>
        <Glyphs text="这不是一个演示原型" start={a + 6} every={2} lift={0.3} />
      </div>
      <div style={{ position: 'absolute', top: 330, left: 210, right: 210, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 70, columnGap: 40 }}>
        {FACTS.map(([value, label, sub], i) => {
          const k = p(frame, a + 24 + i * 9, a + 60 + i * 9, out)
          const shown = typeof value === 'number' ? Math.round(value * k).toLocaleString('en-US') : value
          return (
            <div key={label} style={{ opacity: Math.min(1, k * 1.6), transform: `translateY(${(1 - k) * 24}px)` }}>
              <div style={{ fontFamily: SERIF, fontSize: 96, color: i === 1 ? PURPLE : PAPER, lineHeight: 1 }}>{shown}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 28, color: PAPER, marginTop: 12 }}>{label}</div>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.1em', color: MUTED, marginTop: 8 }}>{sub}</div>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 13, letterSpacing: '0.12em', color: FAINT }}>
        来源：EduCanvas《测试覆盖指标（2026-09-17 采集）》· 采集提交 fb6d006f
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── S6 · the promise, the name ─────────────────────────
function Close({ frame }: { frame: number }) {
  const a = s(150)
  if (frame < a) return null
  const promise = p(frame, s(151.5), s(152.5))
  const toName = p(frame, s(161), s(162.5), inOut)
  const periodK = spring({ frame: frame - s(164), fps: FPS, config: { damping: 9, stiffness: 140, mass: 0.7 } })
  const nameSize = 168
  const px = 960 + 382 + 14
  const py = 400 + nameSize * 0.78
  return (
    <AbsoluteFill style={{ opacity: p(frame, a, a + 12) }}>
      <div style={{ position: 'absolute', top: 400, width: '100%', textAlign: 'center', opacity: promise * (1 - toName), transform: `translateY(${-toName * 40}px)` }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 46, color: PAPER, lineHeight: 1.6 }}>
          <Glyphs text="在缺少专业 AI 教师的地方" start={s(152)} every={1.4} lift={0.3} />
        </div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 46, color: PAPER, lineHeight: 1.6 }}>
          <Glyphs text="学生依然能独立完成一节" start={s(154.4)} every={1.4} lift={0.3} />
        </div>
        <div style={{ fontFamily: SERIF_CN, fontSize: 46, color: PURPLE, lineHeight: 1.6 }}>
          <Glyphs text="准确、有趣、可操作、有反馈的 AI 课" start={s(156.6)} every={1.4} lift={0.3} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 400, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: nameSize, lineHeight: 1, color: PAPER, opacity: toName }}>
        <Glyphs text="EduCanvas" start={s(161.2)} every={2} lift={0.5} />
        <span style={{ color: 'transparent' }}>.</span>
      </div>
      {frame >= s(162) ? <Dot x={px} y={frame < s(164) ? mix(900, py - 70, p(frame, s(162), s(164), inOut)) : py - 70 * (1 - periodK)} accent={PURPLE} size={24} /> : null}
      <div style={{ position: 'absolute', top: 640, width: '100%', textAlign: 'center', opacity: p(frame, s(165), s(166)) }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 30, color: PAPER, opacity: 0.85 }}>多模态 K12 人工智能通识课教学助手对话智能体</div>
        <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', color: MUTED, marginTop: 18 }}>JBGS-2026-02 · github.com/Timcai06/EduCanvas</div>
      </div>
      <AbsoluteFill style={{ background: INK, opacity: p(frame, s(PITCH_SECONDS - 1.2), s(PITCH_SECONDS)) }} />
    </AbsoluteFill>
  )
}

// ───────────────────────── the film ─────────────────────────
function Film({ preview }: { preview: boolean }) {
  const frame = useCurrentFrame()
  return (
    <>
      <Opening frame={frame} />
      <Problem frame={frame} />
      <Loop8 frame={frame} />
      <Reel frame={frame} />
      <SectionLabel frame={frame} from={45} to={110} index="03" text="真实产品 · 真实模型 · 脚本录制" />
      <Callout frame={frame} at={48} dur={3.4} x={745} y={600} text="学段自适应" sub="Grade-aware" side="left" />
      <Callout frame={frame} at={53.8} dur={5.2} x={1190} y={470} text="短诊断，找到起点" sub="Diagnostic" side="right" />
      <Callout frame={frame} at={65.5} dur={4.6} x={660} y={555} text="提一个真实的问题" sub="Ask" side="left" len={120} />
      <SpeedBadge frame={frame} at={71} dur={8} text={`真实模型 DEEPSEEK · 画面 ×${clips.answer.speed.toFixed(0)} 加速`} />
      <Callout frame={frame} at={72.5} dur={6} x={712} y={300} text="按小学高年级程度讲解" sub="Real model · streamed" side="left" len={120} />
      <Callout frame={frame} at={87.4} dur={3.4} x={830} y={300} text="练习在 Canvas 里打开" sub="Canvas" side="left" len={120} />
      <Callout frame={frame} at={94.3} dur={4.6} x={1010} y={389} text="判分在服务端完成" sub="Server-side grading" side="right" />
      <Note frame={frame} at={96.3} dur={3.6} text="判分前，页面源码里搜索正确答案字段：0 处" sub="correctOptionId · correctCategoryId · gradingKey" />
      <Callout frame={frame} at={103.3} dur={1.5} x={1490} y={340} text="掌握度由可信学习事件更新" sub="Mastery · 74%" side="left" />
      <Note frame={frame} at={105.2} dur={2.2} text="刷新页面" sub="RELOAD" />
      <Callout frame={frame} at={109.2} dur={1.5} x={1490} y={340} text="刷新之后，依然在" sub="Persisted on the server" side="left" />
      <Architecture frame={frame} />
      <Evidence frame={frame} />
      <Close frame={frame} />
      {preview && NARRATION.map(([key, at]) => (
        <Sequence key={key} from={s(at)} layout="none">
          <Audio src={staticFile(`voice/${key}.wav`)} />
        </Sequence>
      ))}
    </>
  )
}

function Frame({ preview = false }: { preview?: boolean }) {
  useFonts()
  const frame = useCurrentFrame()
  return (
    <Stage accent={PURPLE}>
      <AbsoluteFill><Film preview={preview} /></AbsoluteFill>
      <AbsoluteFill style={{ background: INK, opacity: 1 - p(frame, 0, 8), pointerEvents: 'none' }} />
    </Stage>
  )
}

export const Pitch: React.FC = () => <Frame />
/** The studio preview, with the placeholder narration audible. */
export const PitchPreview: React.FC = () => <Frame preview />
export const PitchSub: React.FC = () => {
  const sub = useCurrentFrame()
  return <Freeze frame={sub / 4}><Frame /></Freeze>
}
