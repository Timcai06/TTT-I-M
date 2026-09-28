import { AbsoluteFill, Freeze, Img, interpolate, random, spring, staticFile, useCurrentFrame } from 'remotion'
import { Dot, Hud, Stage, useFonts } from '../ui/kit'
import { Glyphs, Plane, Scramble } from '../ui/motion'
import { FAINT, FPS, HAIR, INK, MONO, MUTED, PAPER, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../ui/theme'

const ACCENT = '#8ecfce'

/*
 * SciScope — 24 s at 90 BPM (a beat is 20 frames). One protagonist: the evidence thread.
 *   A   0– 84  "这个结论，有证据吗？" lands; the question mark's dot becomes the thread's head
 *   B  80–206  the real Go TUI arrives out of depth; /verify and a Chinese claim; the claim lifts off
 *   C 200–384  the library as a field of 159,187 points; two retrieval beams sweep it; hits fly out
 *              and fuse into one ranking (RRF); the thread dives to the top hit
 *   D 380–564  the paper opens; the agent's phases tick down the left; the thread crosses languages
 *              from 降低血压 to the English sentence; SUPPORTED is stamped
 *   E 560–664  the workflow as a track: claim → terms → papers → score → output, the token changing at
 *              every station
 *   F 660–720  the name; the thread's head is its full stop
 *
 * The counts are the project's own (content/projects.ts). The claim, the evidence sentence and the
 * paper/chunk ids are illustrative: replace them with a real SciScope session before publishing.
 */

const CLAIM = '得舒饮食能降低血压吗？'
const clampI = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// ───────────────────────── A · the question ─────────────────────────
const Q = { size: 100, text: '这个结论，有证据吗？', y: 450 }
const Q_LEFT = 960 - (Q.text.length * Q.size) / 2
// the full-width ？ sits in the last glyph box; its dot is low and a little left of centre
const Q_DOT: [number, number] = [Q_LEFT + (Q.text.length - 1) * Q.size + Q.size * 0.36, Q.y + Q.size * 0.9]

function Question({ frame }: { frame: number }) {
  if (frame > 96) return null
  const leave = p(frame, 64, 84, inQ)
  return (
    <AbsoluteFill style={{ opacity: 1 - leave }}>
      <div style={{ position: 'absolute', left: Q_LEFT, top: Q.y, fontFamily: SERIF_CN, fontSize: Q.size, lineHeight: 1, color: PAPER, transform: `translateY(${-leave * 40}px)`, filter: `blur(${leave * 6}px)` }}>
        <Glyphs text={Q.text} start={8} every={4} glyphStyle={(i) => (i === Q.text.length - 1 ? { color: frame > 52 ? 'transparent' : PAPER } : {})} />
      </div>
      <div style={{ position: 'absolute', top: Q.y + 150, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: MUTED }}>
        <Scramble text="每个回答，都要能顺着证据查回原文" start={50} dur={18} seed="q" />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── B · the terminal ─────────────────────────
// /projects/sciscope/tui-product.webp is 1600 × 1000; shown at 1.2× (1920 wide), lifted 60 px.
const TUI_Y = 746 * 1.2 - 60

function Terminal({ frame }: { frame: number }) {
  if (frame < 82 || frame > 214) return null
  const arrive = p(frame, 84, 112, out)
  const push = p(frame, 104, 176, inOut)
  const s = mix(1, 1.22, push)
  const enter = 170
  const leave = p(frame, 188, 210, inQ)
  const typed = Math.max(0, Math.min(CLAIM.length, Math.floor((frame - 120) / 4) + 1))
  const line = (i: number) => p(frame, enter + 4 + i * 6, enter + 12 + i * 6)
  return (
    <AbsoluteFill style={{ perspective: 1700, opacity: arrive * (1 - leave) }}>
      <Plane rx={mix(-14, 0, arrive) + leave * 30 + Math.sin(frame / 45) * 1} ry={mix(10, 0, arrive) + Math.sin(frame / 60) * 1.4} z={mix(-800, 0, arrive) - leave * 500}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `80px ${TUI_Y}px`, transform: `scale(${s})` }}>
          <Img src={staticFile('site/projects/sciscope/tui-product.webp')} style={{ position: 'absolute', left: 0, top: -60, width: 1920 }} />
          <div style={{ position: 'absolute', left: 64, top: TUI_Y - 26, width: 960, height: 52, background: '#222222', opacity: p(frame, 104, 108) }} />
          <div style={{ position: 'absolute', left: 100, top: TUI_Y - 18, fontFamily: MONO, fontSize: 26, color: PAPER, whiteSpace: 'pre', opacity: 1 - p(frame, enter + 16, enter + 22) }}>
            <span style={{ color: ACCENT }}>{'/verify '.slice(0, Math.max(0, Math.min(8, Math.floor((frame - 108) / 2) + 1)))}</span>
            {frame >= 120 ? Array.from(CLAIM).slice(0, typed).join('') : ''}
          </div>
          <div style={{ position: 'absolute', left: 100, top: TUI_Y + 50, fontFamily: MONO, fontSize: 21, color: MUTED, lineHeight: 1.9 }}>
            <div style={{ opacity: line(0) }}><span style={{ color: ACCENT }}>◆ plan</span>&nbsp;&nbsp;论断 → 检索词：DASH diet · blood pressure · RCT</div>
            <div style={{ opacity: line(1) }}><span style={{ color: ACCENT }}>◆ tool_call</span>&nbsp;&nbsp;verify_claim(lang=zh→en)</div>
          </div>
        </div>
      </Plane>
    </AbsoluteFill>
  )
}

/** The claim, lifted off the terminal: it floats up and stays with us until the paper. */
function FloatingClaim({ frame }: { frame: number }) {
  if (frame < 184 || frame > 568) return null
  const lift = p(frame, 184, 212, inOut)
  const park = p(frame, 380, 410, inOut)   // settles at the top of the answer
  const x = mix(mix(120, 120, lift), 820, park)
  const y = mix(mix(TUI_Y - 12, 100, lift), 250, park)
  const size = mix(mix(26, 30, lift), 46, park)
  return (
    <div style={{ position: 'absolute', left: x, top: y, fontFamily: park > 0.5 ? SERIF_CN : MONO, fontSize: size, color: PAPER, whiteSpace: 'nowrap', opacity: 1 - p(frame, 548, 566) }}>
      <span style={{ fontFamily: MONO, fontSize: size * 0.55, color: ACCENT, letterSpacing: '0.1em', marginRight: 16, opacity: 1 - park }}>CLAIM</span>
      得舒饮食能<span style={{ borderBottom: `2px solid ${ACCENT}`, paddingBottom: 3, boxShadow: park > 0.9 ? `0 8px 30px -12px ${ACCENT}` : 'none' }}>降低血压</span>{park < 0.5 ? '吗？' : ''}
    </div>
  )
}

// ───────────────────────── C · the library ─────────────────────────
const FIELD_N = 2200
const FIELD = Array.from({ length: FIELD_N }, (_, i) => ({
  x: random(`fx${i}`) * 1700 + 110,
  y: random(`fy${i}`) * 560 + 300,
  s: 1 + random(`fs${i}`) * 2.2,
}))
// retrieval hits: indexes into the field, and which retriever found them
const HITS = [
  { i: 101, by: 'both', rank: 1 }, { i: 530, by: 'both', rank: 2 }, { i: 877, by: 'both', rank: 3 },
  { i: 212, by: 'vec', rank: 4 }, { i: 1044, by: 'fts', rank: 5 },
  { i: 640, by: 'fts', rank: 0 }, { i: 318, by: 'vec', rank: 0 }, { i: 1201, by: 'fts', rank: 0 }, { i: 95, by: 'vec', rank: 0 },
]
const LABELS = ['#88,410 · c3', '#12,907 · c1', '#140,233 · c7', '#101,846 · c2', '#61,018 · c2']
const RRF = ['0.0328', '0.0318', '0.0310', '0.0161', '0.0156']

function Count({ value, frame, start, dur }: { value: number; frame: number; start: number; dur: number }) {
  return <>{Math.round(value * p(frame, start, start + dur, out)).toLocaleString('en-US')}</>
}

function Library({ frame }: { frame: number }) {
  if (frame < 204 || frame > 392) return null
  const on = p(frame, 206, 224)
  const tilt = interpolate(frame, [200, 300], [58, 48], { ...clampI, easing: inOut })
  const beamL = p(frame, 250, 292, inOut)    // FTS sweeps left → right
  const beamR = p(frame, 256, 298, inOut)    // pgvector sweeps right → left
  const gather = p(frame, 300, 336, inOut)
  const leave = p(frame, 372, 390, inQ)
  const litBy = (x: number, by: string) => {
    const fts = x < mix(-200, 2100, beamL) ? 1 : 0
    const vec = x > mix(2100, -200, beamR) ? 1 : 0
    return (by === 'fts' || by === 'both' ? fts : 0) || (by === 'vec' || by === 'both' ? vec : 0)
  }
  const fieldY = (y: number) => 540 + (y - 580) * Math.cos((tilt * Math.PI) / 180)
  const fieldScale = (y: number) => 0.7 + 0.5 * ((y - 300) / 560)
  return (
    <AbsoluteFill style={{ opacity: on * (1 - leave) }}>
      {/* counts */}
      <div style={{ position: 'absolute', top: 150, left: 360, right: 0, display: 'flex', justifyContent: 'center', gap: 120, opacity: 1 - gather * 0.6 }}>
        {[[159187, '篇论文 · PAPERS', 212], [367773, '个片段 · CHUNKS', 218]].map(([v, l, st]) => (
          <div key={l as string} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 96, color: PAPER, lineHeight: 1 }}><Count value={v as number} frame={frame} start={st as number} dur={40} /></div>
            <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.16em', color: MUTED, marginTop: 14 }}>{l}</div>
          </div>
        ))}
      </div>
      {/* the field: every point a paper, the plane tilted away from us */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 1 - gather * 0.75 }}>
        {FIELD.map((pt, i) => {
          const appear = p(frame, 214 + (pt.x / 1920) * 30, 224 + (pt.x / 1920) * 30)
          const sy = fieldY(pt.y)
          const sx = 960 + (pt.x - 960) * fieldScale(pt.y)
          return <circle key={i} cx={sx} cy={sy} r={pt.s * fieldScale(pt.y) * 0.9} fill={PAPER} opacity={0.26 * appear} />
        })}
        {/* the two beams */}
        <rect x={mix(-200, 2100, beamL) - 140} y={260} width={140} height={700} fill="url(#beamL)" opacity={beamL > 0 && beamL < 1 ? 1 : 0} />
        <rect x={mix(2100, -200, beamR)} y={260} width={140} height={700} fill="url(#beamR)" opacity={beamR > 0 && beamR < 1 ? 1 : 0} />
        <defs>
          <linearGradient id="beamL" x1="0" x2="1"><stop offset="0" stopColor={ACCENT} stopOpacity="0" /><stop offset="1" stopColor={ACCENT} stopOpacity="0.28" /></linearGradient>
          <linearGradient id="beamR" x1="1" x2="0"><stop offset="0" stopColor="#b9a6e6" stopOpacity="0" /><stop offset="1" stopColor="#b9a6e6" stopOpacity="0.24" /></linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', left: 120, top: 980, fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: ACCENT, opacity: beamL > 0 ? 1 - gather : 0 }}>→ 全文检索 · POSTGRES FTS</div>
      <div style={{ position: 'absolute', right: 120, top: 980, fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: '#b9a6e6', opacity: beamR > 0 ? 1 - gather : 0 }}>语义检索 · PGVECTOR ←</div>
      {/* hits: light up under a beam, then gather into the fused ranking */}
      {HITS.map((h) => {
        const pt = FIELD[h.i]
        const sx = 960 + (pt.x - 960) * fieldScale(pt.y)
        const sy = fieldY(pt.y)
        const lit = litBy(pt.x, h.by)
        const color = h.by === 'vec' ? '#b9a6e6' : ACCENT
        if (h.rank === 0) {
          return <Dot key={h.i} x={sx} y={sy} accent={color} size={9} opacity={lit * (1 - gather)} />
        }
        const tx = 960 - 250
        const ty = 470 + (h.rank - 1) * 70
        const k = p(frame, 300 + h.rank * 3, 334 + h.rank * 3, inOut)
        return (
          <div key={h.i}>
            <div style={{
              position: 'absolute', left: tx - 20, top: ty - 24, width: 540, height: 48, borderRadius: 10, border: `1px solid ${h.rank === 1 && frame > 344 ? ACCENT : HAIR}`,
              background: '#151716', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0 44px', boxSizing: 'border-box',
              fontFamily: MONO, fontSize: 17, color: PAPER, opacity: p(frame, 322 + h.rank * 3, 334 + h.rank * 3),
            }}>
              <span><span style={{ color: ACCENT }}>{h.rank}</span>&nbsp;&nbsp;paper {LABELS[h.rank - 1]}{h.by === 'both' ? <span style={{ color: MUTED }}>&nbsp;&nbsp;FTS+VEC</span> : null}</span>
              <span style={{ color: MUTED }}>{RRF[h.rank - 1]}</span>
            </div>
            <Dot x={mix(sx, tx, k)} y={mix(sy, ty, k)} accent={color} size={mix(10, 12, k)} opacity={lit} />
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 400, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.16em', color: ACCENT, opacity: p(frame, 318, 330) }}>RRF 融合排序 · 两路都找到的论文排在前面</div>
    </AbsoluteFill>
  )
}

// ───────────────────────── D · the paper ─────────────────────────
const STEPS: [string, string][] = [
  ['/verify', 'slash skill'], ['plan', '可见的检索计划'], ['tool_call', 'verify_claim · search'], ['tool_result', '证据载荷'],
  ['reflect', '范围控制'], ['final', '带引用的回答'], ['export', 'Markdown 会话'],
]
const EVIDENCE = ['Compared with control diets, the DASH dietary pattern', 'lowered both systolic and diastolic blood pressure,', 'with larger reductions in participants with hypertension.']
const PAGE = { x: 820, y: 340, w: 960, lineH: 50 }
const EVIDENCE_Y = PAGE.y + 250   // the highlighted line, on screen

function Paper({ frame }: { frame: number }) {
  if (frame < 376 || frame > 572) return null
  const open = p(frame, 380, 410, out)
  const leave = p(frame, 548, 566, inQ)
  const hl = p(frame, 484, 498, out)
  const stamp = spring({ frame: frame - 506, fps: FPS, config: { damping: 9, stiffness: 220, mass: 0.6 } })
  return (
    <AbsoluteFill style={{ opacity: open * (1 - leave), perspective: 1800 }}>
      {/* the trace ticks down the left, one phase per half beat */}
      <div style={{ position: 'absolute', left: 150, top: 300 }}>
        <div style={{ position: 'absolute', left: 6, top: 30, width: 2, height: 64 * 6 * p(frame, 392, 470), background: `${ACCENT}66` }} />
        {STEPS.map(([tag, cn], i) => {
          const k = p(frame, 392 + i * 11, 402 + i * 11)
          const done = frame > 402 + i * 11
          return (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', height: 64, opacity: 0.25 + 0.75 * k, transform: `translateX(${(1 - k) * -16}px)` }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${done ? ACCENT : FAINT}`, background: done ? ACCENT : INK, marginRight: 22, boxShadow: done ? `0 0 14px ${ACCENT}` : 'none' }} />
              <div style={{ fontFamily: MONO, fontSize: 19, color: done ? PAPER : MUTED, width: 160 }}>{tag}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 19, color: MUTED }}>{cn}</div>
            </div>
          )
        })}
      </div>
      {/* the paper: a page of greyed text, and the one sentence that matters */}
      <Plane rx={mix(24, 4, open)} ry={mix(-18, -6, open)} z={mix(-500, 0, open)} origin="70% 50%">
        <div style={{ position: 'absolute', left: PAGE.x - 40, top: PAGE.y - 60, width: PAGE.w + 80, height: 560, borderRadius: 14, background: '#171918', border: `1px solid ${HAIR}`, boxShadow: '0 50px 120px rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'absolute', left: PAGE.x, top: PAGE.y - 30, fontFamily: MONO, fontSize: 14, letterSpacing: '0.16em', color: MUTED }}>paper #88,410 · chunk 3 · RESULTS</div>
        {[0, 1, 2].map((r) => (
          <div key={r} style={{ position: 'absolute', left: PAGE.x, top: PAGE.y + 20 + r * 34, width: [880, 820, 540][r], height: 10, borderRadius: 5, background: 'rgba(234,231,223,0.09)' }} />
        ))}
        {EVIDENCE.map((l, r) => (
          <div key={l} style={{ position: 'absolute', left: PAGE.x, top: EVIDENCE_Y - PAGE.lineH + r * PAGE.lineH - 18, fontFamily: SERIF, fontSize: 31, color: PAPER, opacity: r === 1 ? 1 : 0.62, whiteSpace: 'nowrap' }}>
            {r === 1 ? <span style={{ position: 'absolute', left: -10, top: 4, height: 38, width: 720 * hl, background: ACCENT, opacity: 0.24, borderRadius: 4 }} /> : null}
            <span style={{ position: 'relative' }}>{l}</span>
          </div>
        ))}
        {[0, 1, 2, 3].map((r) => (
          <div key={r} style={{ position: 'absolute', left: PAGE.x, top: EVIDENCE_Y + 2 * PAGE.lineH + 20 + r * 34, width: [860, 900, 700, 420][r], height: 10, borderRadius: 5, background: 'rgba(234,231,223,0.09)' }} />
        ))}
      </Plane>
      {/* the stamp */}
      <div style={{
        position: 'absolute', left: PAGE.x + 560, top: PAGE.y + 380, transform: `rotate(-8deg) scale(${frame >= 506 ? mix(1.8, 1, stamp) : 0})`, opacity: frame >= 506 ? Math.min(1, stamp * 2) : 0,
        border: `3px solid ${ACCENT}`, borderRadius: 10, padding: '10px 22px', fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: ACCENT, background: 'rgba(17,18,16,0.6)',
      }}>支持 · SUPPORTED</div>
      <div style={{ position: 'absolute', left: PAGE.x, top: PAGE.y + 480, display: 'flex', gap: 12, fontFamily: MONO, fontSize: 15, letterSpacing: '0.1em', opacity: p(frame, 514, 526) }}>
        <span style={{ color: PAPER, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '6px 14px' }}>calibrated</span>
        <span style={{ color: MUTED, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '6px 14px' }}>跨语言接地 zh → en</span>
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── E · the workflow ─────────────────────────
const TRACK_Y = 560
const STATIONS = [
  { x: 260, en: 'Claim', cn: '中文论断', token: '降低血压' },
  { x: 610, en: 'Ground', cn: '扩展术语与约束', token: 'DASH · BP · RCT' },
  { x: 960, en: 'Retrieve', cn: '排序的论文与片段', token: '#88,410 · c3' },
  { x: 1310, en: 'Score', cn: '支持程度', token: '0.87 · 支持' },
  { x: 1660, en: 'Output', cn: '置信度 + 可追溯证据', token: '引用 [1]' },
]

function Workflow({ frame }: { frame: number }) {
  if (frame < 556 || frame > 672) return null
  const on = p(frame, 558, 570)
  const leave = p(frame, 652, 668, inQ)
  const travel = p(frame, 572, 640, inOut)
  const tx = mix(STATIONS[0].x, STATIONS[4].x, travel)
  const stationOf = (f: number) => Math.min(4, Math.floor(p(f, 572, 640, inOut) * 4 + 0.5))
  const at = stationOf(frame)
  let since = frame
  while (since > 572 && stationOf(since - 1) === at) since--
  return (
    <AbsoluteFill style={{ opacity: on * (1 - leave) }}>
      <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center', fontFamily: SERIF_CN, fontSize: 52, color: PAPER }}>
        <Glyphs text="给出校准过的证据，而不是笃定的结论" start={562} every={1.2} lift={0.3} />
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <line x1={STATIONS[0].x} y1={TRACK_Y} x2={STATIONS[4].x} y2={TRACK_Y} stroke={HAIR} strokeWidth={2} />
        <line x1={STATIONS[0].x} y1={TRACK_Y} x2={tx} y2={TRACK_Y} stroke={ACCENT} strokeWidth={2} />
      </svg>
      {STATIONS.map((st, i) => {
        const reached = travel * 4 >= i - 0.05
        return (
          <div key={st.en}>
            <div style={{ position: 'absolute', left: st.x - 8, top: TRACK_Y - 8, width: 16, height: 16, borderRadius: '50%', background: reached ? ACCENT : INK, border: `2px solid ${reached ? ACCENT : FAINT}` }} />
            <div style={{ position: 'absolute', left: st.x, top: TRACK_Y + 34, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', opacity: p(frame, 562 + i * 3, 574 + i * 3) }}>
              <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', textTransform: 'uppercase', color: reached ? ACCENT : MUTED }}>{i + 1} · {st.en}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 21, color: PAPER, opacity: reached ? 0.9 : 0.5, marginTop: 6 }}>{st.cn}</div>
            </div>
          </div>
        )
      })}
      {/* the token riding the track, changing at every station */}
      <div style={{
        position: 'absolute', left: tx, top: TRACK_Y - 74, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
        border: `1px solid ${ACCENT}`, borderRadius: 999, padding: '8px 18px', background: '#141716', fontFamily: at === 0 ? SERIF_CN : MONO, fontSize: 19, color: PAPER,
        boxShadow: `0 0 30px -8px ${ACCENT}`, opacity: p(frame, 568, 574),
      }}>
        <Scramble key={at} text={STATIONS[at].token} start={since} dur={6} seed={`t${at}`} />
      </div>
    </AbsoluteFill>
  )
}

// ───────────────────────── F · the name ─────────────────────────
const NAME = 'SciScope'
const NAME_SIZE = 156

function End({ frame }: { frame: number }) {
  if (frame < 660) return null
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 360, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: NAME_SIZE, lineHeight: 1, color: PAPER }}>
        <Glyphs text={NAME} start={662} every={2} lift={0.5} />
        <span style={{ color: 'transparent' }}>.</span>
      </div>
      <div style={{ position: 'absolute', top: 562, width: '100%', textAlign: 'center', fontFamily: SERIF_CN, fontSize: 36, color: PAPER, opacity: 0.9 }}>
        <Glyphs text="证据接地科研文献智能体" start={676} every={1} lift={0.3} />
      </div>
      <div style={{ position: 'absolute', top: 628, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.16em', color: MUTED }}>
        <Scramble text="让研究回答能顺着证据查回原文" start={684} dur={16} seed="tag" />
      </div>
      <div style={{ position: 'absolute', top: 694, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
        {['Python', 'Go', 'FastAPI', 'LangGraph', 'PostgreSQL', 'pgvector'].map((s, i) => {
          const k = p(frame, 692 + i * 2, 704 + i * 2)
          return <div key={s} style={{ fontFamily: MONO, fontSize: 15, color: PAPER, opacity: 0.75 * k, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '7px 16px', transform: `translateY(${(1 - k) * 12}px)` }}>{s}</div>
        })}
      </div>
    </AbsoluteFill>
  )
}

function periodPoint(): [number, number] {
  // Playfair Display at 156 px: "SciScope" is about 610 px wide
  return [960 + 305 + 12, 360 + NAME_SIZE * 0.78]
}

// ───────────────────────── the thread, all the way through ─────────────────────────
/** The head of the evidence thread, and whether a tail should be drawn behind it. */
function headAt(frame: number): { x: number; y: number; size: number; op: number } {
  if (frame < 52) return { x: Q_DOT[0], y: Q_DOT[1], size: 0, op: 0 }
  if (frame < 84) {
    // the question mark's dot lets go and hangs
    return { x: Q_DOT[0], y: Q_DOT[1] - p(frame, 60, 84, inOut) * 30, size: 14, op: 1 }
  }
  if (frame < 124) {
    // into the terminal, where it becomes the caret after /verify
    const k = p(frame, 84, 118, inOut)
    return { x: mix(Q_DOT[0], 250, k), y: mix(Q_DOT[1] - 30, TUI_Y, k) - Math.sin(k * Math.PI) * 120, size: mix(14, 9, k), op: 1 }
  }
  if (frame < 184) {
    const n = Math.max(0, Math.min(CLAIM.length, Math.floor((frame - 120) / 4) + 1))
    const push = p(frame, 104, 176, inOut)
    const s = mix(1, 1.22, push)
    const px = 100 + 8 * 15.6 + n * 26 + 6
    return { x: 80 + (px - 80) * s, y: TUI_Y, size: 9, op: frame > 170 ? 1 - p(frame, 176, 184) : 1 }
  }
  if (frame < 214) {
    // it goes with the claim as it lifts off, sitting at the claim's end
    const lift = p(frame, 184, 212, inOut)
    return { x: mix(420, 530, lift), y: mix(TUI_Y, 118, lift), size: 12, op: p(frame, 184, 190) }
  }
  if (frame < 300) {
    // hovering over the field while the beams sweep
    const k = p(frame, 214, 246, inOut)
    return { x: mix(530, 960, k), y: mix(118, 330, k) + Math.sin(frame / 8) * 4 * k, size: 12, op: 1 }
  }
  if (frame < 344) {
    // dives to the top-ranked paper
    const k = p(frame, 334, 344, inOut)
    return { x: mix(960, 960 - 250, k), y: mix(330, 470, k), size: 12, op: 1 }
  }
  if (frame < 384) return { x: 710, y: 470, size: mix(12, 18, p(frame, 370, 384)), op: 1 - p(frame, 378, 386) }
  if (frame < 452) return { x: 0, y: 0, size: 0, op: 0 }
  if (frame < 490) {
    // from under 降低血压 to the English sentence: the crossing
    const k = p(frame, 454, 486, inOut)
    const from: [number, number] = [820 + 5 * 46 + 92, 250 + 52]
    const to: [number, number] = [PAGE.x + 120, EVIDENCE_Y + 4]
    return { x: mix(from[0], to[0], k), y: mix(from[1], to[1], k) + Math.sin(k * Math.PI) * -40, size: 12, op: 1 }
  }
  if (frame < 666) return { x: 0, y: 0, size: 0, op: 0 }
  const [px, py] = periodPoint()
  const s = spring({ frame: frame - 682, fps: FPS, config: { damping: 9, stiffness: 140, mass: 0.7 } })
  const k = p(frame, 666, 682, inOut)
  return { x: mix(960, px, frame < 682 ? k : 1), y: frame < 682 ? mix(900, py - 60, k) : py - 60 * (1 - s), size: 22, op: 1 }
}

function Thread({ frame }: { frame: number }) {
  // the crossing leaves a line behind it
  const k = p(frame, 454, 486, inOut)
  const from: [number, number] = [820 + 5 * 46 + 92, 250 + 52]
  const to: [number, number] = [PAGE.x + 120, EVIDENCE_Y + 4]
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 40]
  const h = headAt(frame)
  return (
    <>
      {frame >= 454 && frame < 566 ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 1 - p(frame, 548, 564) }}>
          <path d={`M${from[0]},${from[1]} Q${mid[0] * 2 - (from[0] + to[0]) / 2},${mid[1] * 2 - (from[1] + to[1]) / 2} ${to[0]},${to[1]}`} fill="none" stroke={ACCENT} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />
        </svg>
      ) : null}
      {h.op > 0 ? <Dot x={h.x} y={h.y} accent={ACCENT} size={h.size} opacity={h.op} /> : null}
    </>
  )
}

function Film() {
  const frame = useCurrentFrame()
  return (
    <>
      <Terminal frame={frame} />
      <Question frame={frame} />
      <Library frame={frame} />
      <Paper frame={frame} />
      <FloatingClaim frame={frame} />
      <Workflow frame={frame} />
      <End frame={frame} />
      <Thread frame={frame} />
    </>
  )
}

function Frame() {
  useFonts()
  const frame = useCurrentFrame()
  return (
    <Stage accent={ACCENT}>
      <AbsoluteFill><Film /></AbsoluteFill>
      <Hud index="02" name="SciScope" meta="Evidence-grounded agent · 2026" accent={ACCENT} />
      <AbsoluteFill style={{ background: INK, opacity: 1 - p(frame, 0, 6), pointerEvents: 'none' }} />
    </Stage>
  )
}

export const SciScope: React.FC = () => <Frame />

/** Four sub-frames per film frame, for render.sh's motion blur (see EduCanvasSub). */
export const SciScopeSub: React.FC = () => {
  const sub = useCurrentFrame()
  return <Freeze frame={sub / 4}><Frame /></Freeze>
}
