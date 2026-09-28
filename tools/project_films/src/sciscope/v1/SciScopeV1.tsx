import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { Dot, EndCard, Hud, Node, Rise, Shot, Stage, Typed, Wire, along, useFonts } from '../../ui/kit'
import { FAINT, HAIR, INK, MONO, MUTED, PAPER, SERIF, SERIF_CN, inOut, inQ, mix, out, p } from '../../ui/theme'

const ACCENT = '#8ecfce'

/*
 * SciScope — 24 s, 90 BPM (a beat is 20 frames).
 *   A   0– 80  the question every answer should face
 *   B  80–200  the real Go TUI; a Chinese claim typed as /verify
 *   C 200–380  the library it searches, and two retrievals fused into one ranking
 *   D 380–560  the agent's visible steps, and an answer grounded in an English source
 *   E 560–660  the claim-grounding workflow: calibrated evidence, not a verdict
 *   F 660–720  end card
 *
 * The numbers are the project's own (content/projects.ts, data-asset-funnel.webp). The claim, the
 * evidence sentence and the paper/chunk ids are illustrative: replace them with a real SciScope
 * session before this is published.
 */

const CLAIM = '得舒饮食能降低血压吗？'

function Question() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: 1 - p(frame, 76, 92) }}>
      <div style={{ position: 'absolute', top: 430, width: '100%', textAlign: 'center', fontFamily: SERIF_CN, fontSize: 92, color: PAPER }}>
        <Typed text="这个结论，有证据吗？" start={8} every={4} />
      </div>
      <Rise start={52} style={{ position: 'absolute', top: 580, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: MUTED }}>每个回答，都要能顺着证据查回原文</div>
      </Rise>
    </AbsoluteFill>
  )
}

// /projects/sciscope/tui-product.webp is 1600 × 1000, shown 1920 wide (×1.2) and lifted 60 px.
const TUI_TOP = -60
const TUI_INPUT = { x: 100, y: 746 * 1.2 + TUI_TOP }

function Terminal() {
  const frame = useCurrentFrame()          // local (starts at 80)
  const push = p(frame, 10, 110, inOut)
  const scale = mix(1.0, 1.18, push)
  const fx = 70
  const fy = mix(560, TUI_INPUT.y - 40, push)
  const enter = 88
  const leave = p(frame, 110, 124, inQ)
  const line = (i: number) => p(frame, enter + 4 + i * 7, enter + 12 + i * 7)
  return (
    <AbsoluteFill style={{ opacity: p(frame, 0, 14) * (1 - leave) }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${fx}px ${fy}px`, transform: `scale(${scale * (1 + leave * 0.12)})`, filter: `blur(${leave * 8}px)` }}>
        <Shot src="projects/sciscope/tui-product.webp" style={{ top: TUI_TOP }} />
        {/* over the placeholder, the claim to check */}
        <div style={{ position: 'absolute', left: 64, top: TUI_INPUT.y - 26, width: 940, height: 52, background: '#222222', opacity: p(frame, 20, 24) }} />
        <div style={{ position: 'absolute', left: 100, top: TUI_INPUT.y - 18, fontFamily: MONO, fontSize: 26, color: PAPER, opacity: 1 - p(frame, enter + 30, enter + 34) }}>
          <span style={{ color: ACCENT, opacity: p(frame, 24, 26) }}>/verify </span>
          <Typed text={CLAIM} start={32} every={4} />
        </div>
        {/* the first streamed lines: the plan is visible, not hidden */}
        <div style={{ position: 'absolute', left: 100, top: TUI_INPUT.y + 50, fontFamily: MONO, fontSize: 21, color: MUTED, lineHeight: 1.9 }}>
          <div style={{ opacity: line(0) }}><span style={{ color: ACCENT }}>◆ plan</span>&nbsp;&nbsp;论断 → 检索词：DASH diet · blood pressure · RCT</div>
          <div style={{ opacity: line(1) }}><span style={{ color: ACCENT }}>◆ tool_call</span>&nbsp;&nbsp;verify_claim(lang=zh→en)</div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Count({ value, start, dur }: { value: number; start: number; dur: number }) {
  const frame = useCurrentFrame()
  const k = p(frame, start, start + dur, out)
  return <>{Math.round(value * k).toLocaleString('en-US')}</>
}

const FTS = ['#88,410 · c3', '#12,907 · c1', '#140,233 · c7', '#61,018 · c2', '#95,774 · c4', '#3,552 · c9']
const VEC = ['#88,410 · c3', '#101,846 · c2', '#12,907 · c5', '#57,390 · c1', '#140,233 · c7', '#28,661 · c6']
const FUSED = ['#88,410 · c3', '#12,907 · c1', '#140,233 · c7', '#101,846 · c2', '#61,018 · c2']
// reciprocal-rank fusion, k = 60: papers both retrievals found rise to the top
const RRF = ['0.0328', '0.0318', '0.0310', '0.0161', '0.0156']

function Library() {
  const frame = useCurrentFrame()          // local (starts at 200)
  const numbersUp = p(frame, 0, 60)
  const numbersOut = p(frame, 44, 60, inOut)
  const streams = p(frame, 56, 72)
  const merge = p(frame, 100, 140, inOut)
  const fade = 1 - p(frame, 168, 182, inQ)
  const row = (label: string, i: number, side: -1 | 1) => {
    const inK = p(frame, 62 + i * 4, 76 + i * 4)
    const fusedIndex = FUSED.indexOf(label)
    // a paper both retrievals found appears once in the fused list: the left copy moves, the right copy fades
    const moves = fusedIndex >= 0 && (side < 0 || !FTS.includes(label))
    const toX = moves ? 0 : side * 420
    const toY = moves ? 400 + fusedIndex * 62 : 400 + i * 62
    const y = mix(400 + i * 62, toY, merge)
    const x = mix(side * 420, toX, merge)
    const gone = moves ? 0 : merge
    const score = (0.94 - i * 0.07 + (side > 0 ? 0.02 : 0)).toFixed(2)
    return (
      <div key={`${side}${label}`} style={{
        position: 'absolute', left: 960 + x - 240, top: y, width: 480, height: 48, borderRadius: 10,
        border: `1px solid ${moves && fusedIndex === 0 && merge > 0.9 ? ACCENT : HAIR}`,
        background: 'rgba(234,231,223,0.03)', opacity: inK * (1 - gone),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', boxSizing: 'border-box',
        fontFamily: MONO, fontSize: 17, color: PAPER,
      }}>
        <span>{moves && merge > 0.6 ? <span style={{ color: ACCENT }}>{fusedIndex + 1}&nbsp;&nbsp;</span> : null}paper {label}</span>
        <span style={{ color: MUTED }}>{moves && merge > 0.6 ? RRF[fusedIndex] : score}</span>
      </div>
    )
  }
  return (
    <AbsoluteFill style={{ opacity: p(frame, 0, 10) * fade }}>
      {/* the library */}
      <div style={{ position: 'absolute', top: mix(360, 150, numbersOut), width: '100%', display: 'flex', justifyContent: 'center', gap: 140, transform: `scale(${mix(1, 0.5, numbersOut)})`, transformOrigin: '50% 0%', opacity: numbersUp }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 140, color: PAPER, lineHeight: 1 }}><Count value={159187} start={4} dur={40} /></div>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.16em', color: MUTED, marginTop: 18 }}>篇论文 · PAPERS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 140, color: PAPER, lineHeight: 1 }}><Count value={367773} start={10} dur={40} /></div>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.16em', color: MUTED, marginTop: 18 }}>个片段 · CHUNKS</div>
        </div>
      </div>
      {/* two retrievals, then one ranking */}
      <div style={{ position: 'absolute', top: 340, left: 960 - 420 - 240, width: 480, textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: MUTED, opacity: streams * (1 - merge) }}>全文检索 · POSTGRES FTS</div>
      <div style={{ position: 'absolute', top: 340, left: 960 + 420 - 240, width: 480, textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: MUTED, opacity: streams * (1 - merge) }}>语义检索 · PGVECTOR</div>
      <div style={{ position: 'absolute', top: 340, left: 960 - 240, width: 480, textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', color: ACCENT, opacity: merge }}>RRF 融合排序</div>
      {FTS.map((l, i) => row(l, i, -1))}
      {VEC.map((l, i) => row(l, i, 1))}
      {merge > 0.95 ? <Dot x={960 - 262} y={424} accent={ACCENT} size={12} opacity={p(frame, 140, 146)} /> : null}
    </AbsoluteFill>
  )
}

const STEPS: [string, string][] = [
  ['/verify', 'slash skill'], ['plan', '可见的检索计划'], ['tool_call', 'verify_claim · search'], ['tool_result', '证据载荷'],
  ['reflect', '范围控制'], ['final', '带引用的回答'], ['export', 'Markdown 会话'],
]

function Grounding() {
  const frame = useCurrentFrame()          // local (starts at 380)
  const fade = 1 - p(frame, 168, 180, inQ)
  const card = p(frame, 70, 90)
  const link = p(frame, 118, 146, inOut)
  const x0 = 820
  const claimY = 300
  const ey = 516   // the highlighted evidence line
  return (
    <AbsoluteFill style={{ opacity: p(frame, 0, 10) * fade }}>
      {/* the trace: the same phases the backend emits */}
      <div style={{ position: 'absolute', left: 170, top: 260 }}>
        <div style={{ position: 'absolute', left: 6, top: 38, width: 2, height: 76 * 6 * p(frame, 8, 92), background: `${ACCENT}55` }} />
        {STEPS.map(([tag, cn], i) => {
          const k = p(frame, 8 + i * 12, 20 + i * 12)
          const done = frame > 20 + i * 12 + 8
          return (
            <div key={tag} style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 76, opacity: k, transform: `translateX(${(1 - k) * -20}px)` }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${done ? ACCENT : FAINT}`, background: done ? ACCENT : INK, marginRight: 24 }} />
              <div style={{ fontFamily: MONO, fontSize: 21, color: done ? PAPER : MUTED, width: 180 }}>{tag}</div>
              <div style={{ fontFamily: SERIF_CN, fontSize: 21, color: MUTED }}>{cn}</div>
            </div>
          )
        })}
      </div>
      {/* the answer, grounded across languages */}
      <div style={{ opacity: card }}>
        <div style={{ position: 'absolute', left: x0, top: 230, fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: MUTED }}>论断 · CLAIM (中文)</div>
        <div style={{ position: 'absolute', left: x0, top: claimY - 32, fontFamily: SERIF_CN, fontSize: 46, color: PAPER }}>
          得舒饮食能<span style={{ borderBottom: `2px solid ${ACCENT}`, paddingBottom: 4 }}>降低血压</span>
        </div>
        <div style={{ position: 'absolute', left: x0, top: 410, fontFamily: MONO, fontSize: 15, letterSpacing: '0.16em', color: MUTED }}>证据 · EVIDENCE (EN) · paper #88,410 · chunk 3</div>
        <div style={{ position: 'absolute', left: x0, top: 450, fontFamily: SERIF, fontSize: 30, color: PAPER, lineHeight: '46px' }}>
          <div style={{ opacity: 0.7 }}>Compared with control diets, the DASH dietary pattern</div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', left: -8, right: -8, top: 4, bottom: 2, background: ACCENT, opacity: 0.22 * p(frame, 140, 150), borderRadius: 4 }} />
            <span style={{ position: 'relative' }}>lowered both systolic and diastolic blood pressure,</span>
          </div>
          <div style={{ opacity: 0.7 }}>with larger reductions in participants with hypertension.</div>
        </div>
        <div style={{ position: 'absolute', left: x0 - 34, top: claimY - 22, width: 2, height: (ey + 8 - (claimY - 22)) * link, background: ACCENT }} />
        <div style={{ position: 'absolute', left: x0 - 34, top: claimY - 22, width: 14, height: 2, background: ACCENT, opacity: link > 0 ? 1 : 0 }} />
        <div style={{ position: 'absolute', left: x0 - 34, top: ey + 6, width: 14, height: 2, background: ACCENT, opacity: link >= 1 ? 1 : 0 }} />
        {link > 0 && link < 1 ? <Dot x={x0 - 33} y={claimY - 22 + (ey + 8 - (claimY - 22)) * link} accent={ACCENT} size={12} /> : null}
        <div style={{ position: 'absolute', left: x0, top: 640, display: 'flex', gap: 14, opacity: p(frame, 148, 160), fontFamily: MONO, fontSize: 16, letterSpacing: '0.1em' }}>
          <span style={{ color: INK, background: ACCENT, borderRadius: 999, padding: '7px 16px' }}>支持 · SUPPORTED</span>
          <span style={{ color: PAPER, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '7px 16px' }}>calibrated</span>
          <span style={{ color: MUTED, border: `1px solid ${HAIR}`, borderRadius: 999, padding: '7px 16px' }}>跨语言接地 zh → en</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// /projects/sciscope/claim-grounding.webp, rebuilt: claim → ground → retrieve → score → output
const FLOW = [
  { x: 330, en: '1 · Claim', cn: '中文论断' },
  { x: 750, en: '2 · Ground', cn: '扩展术语与约束' },
  { x: 1170, en: '3 · Retrieve', cn: '排序的论文与片段' },
  { x: 1590, en: '4 · Score', cn: '支持程度' },
]

function Workflow() {
  const frame = useCurrentFrame()          // local (starts at 560)
  const t = p(frame, 12, 64, inOut)
  const path: [number, number][] = [[330, 500], [1590, 500], [1590, 600], [960, 600], [960, 662]]
  const [dx, dy] = along(path, t)
  const reach = (x: number) => p(frame, 12 + ((x - 330) / 1260) * 36, 18 + ((x - 330) / 1260) * 36)
  return (
    <AbsoluteFill style={{ opacity: p(frame, 0, 10) * (1 - p(frame, 88, 100, inQ)) }}>
      <Rise start={4} style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 50, color: PAPER }}>给出校准过的证据，而不是笃定的结论</div>
      </Rise>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Wire points={path} k={1} color={HAIR} dashed />
        <Wire points={path} k={t} color={ACCENT} width={2} />
      </svg>
      {FLOW.map((n, i) => <Node key={n.en} x={n.x} y={500} w={300} en={n.en} cn={n.cn} accent={ACCENT} appear={p(frame, i * 3, 14 + i * 3)} lit={reach(n.x)} />)}
      <Node x={960} y={712} w={620} h={100} en="Output · support level + traceable evidence" cn="写明置信度与来源范围，不编造确定性" accent={ACCENT} appear={p(frame, 10, 24)} lit={p(frame, 62, 70)} />
      <Dot x={dx} y={dy} accent={ACCENT} opacity={p(frame, 10, 14) * (1 - p(frame, 66, 72))} />
    </AbsoluteFill>
  )
}

export const SciScopeV1: React.FC = () => {
  useFonts()
  const frame = useCurrentFrame()
  return (
    <Stage accent={ACCENT}>
      <Sequence durationInFrames={96}><Question /></Sequence>
      <Sequence from={80} durationInFrames={126}><Terminal /></Sequence>
      <Sequence from={200} durationInFrames={184}><Library /></Sequence>
      <Sequence from={380} durationInFrames={182}><Grounding /></Sequence>
      <Sequence from={560} durationInFrames={102}><Workflow /></Sequence>
      <Sequence from={660} durationInFrames={60}>
        <EndCard start={0} name="SciScope" cn="证据接地科研文献智能体" tagline="让研究回答能顺着证据查回原文"
          stack={['Python', 'Go', 'FastAPI', 'LangGraph', 'PostgreSQL', 'pgvector']}
          footer="02 / 2026 · github.com/Timcai06/SciScope" accent={ACCENT} dotFrom={[960, 880]} periodNudge={-30} />
      </Sequence>
      <Hud index="02" name="SciScope" meta="Evidence-grounded agent · 2026" accent={ACCENT} />
      <AbsoluteFill style={{ background: INK, opacity: 1 - p(frame, 0, 6), pointerEvents: 'none' }} />
    </Stage>
  )
}
