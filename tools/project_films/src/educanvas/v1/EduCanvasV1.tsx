import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { Dot, EndCard, Hud, Node, Rise, Shot, Stage, Typed, Wire, along, useFonts } from '../../ui/kit'
import { HAIR, INK, MONO, MUTED, PAPER, SANS, SERIF_CN, inOut, inQ, mix, out, p } from '../../ui/theme'
import pixels from '../pixels.json'

const ACCENT = '#8192d8'
const UNDERLINE = '#d77b5f'   // the product's own underline under its greeting

/*
 * EduCanvas — 24 s, 90 BPM (a beat is 20 frames).
 *   A   0– 80  the product's own greeting, typed
 *   B  80–200  the real home screen; a question typed into it; the request leaves as a dot
 *   C 200–380  the dot crosses the architecture: one Agent Loop for everything
 *   D 380–560  the answer: a picture is a table of numbers — numbers become pixels become a photo
 *   E 560–660  focus mode, quiet
 *   F 660–720  end card
 */

// Coordinates measured on /projects/educanvas/home.webp (1920 × 1045).
const HOME = { heading: { x: 1025, y: 342 }, input: { x: 958, y: 487, left: 545, right: 1370, top: 445, bottom: 528 }, send: { x: 1336, y: 487 } }
// and on learning-response.webp (1920 × 1046): the code block.
const CODE = { x: 985, y: 684, left: 608, right: 1362, top: 626, bottom: 742 }

const QUESTION = '计算机眼里，图片是什么？'

function Greeting() {
  const frame = useCurrentFrame()
  // type, underline, then hand over to the screenshot, which carries the same words
  const handoff = p(frame, 62, 92, inOut)
  const x = mix(960, HOME.heading.x + 30, handoff)
  const y = mix(470, HOME.heading.y, handoff)
  const scale = mix(1, 46 / 92, handoff)
  const under = p(frame, 40, 64, out)
  return (
    <AbsoluteFill style={{ opacity: 1 - p(frame, 84, 96) }}>
      <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 92, color: PAPER, whiteSpace: 'nowrap', position: 'relative' }}>
          <Typed text="今天想学什么？" start={8} every={4} />
          <svg width={560} height={40} style={{ position: 'absolute', left: -10, top: 118, overflow: 'visible' }}>
            <path d="M0,18 C140,8 360,6 520,14" fill="none" stroke={UNDERLINE} strokeWidth={5} strokeLinecap="round"
              strokeDasharray="560" strokeDashoffset={560 * (1 - under)} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Home() {
  const frame = useCurrentFrame()          // local to the sequence (starts at 80)
  const show = p(frame, 0, 16)
  // push in on the input box while the question is typed
  const push = p(frame, 18, 110, inOut)
  const scale = mix(1.035, 1.5, push)
  const fx = mix(960, HOME.input.x, push)
  const fy = mix(522, HOME.input.y, push)
  const enter = 100
  const flash = p(frame, enter, enter + 4) * (1 - p(frame, enter + 4, enter + 22))
  const leave = p(frame, 108, 124, inQ)
  const typedStart = 36
  return (
    <AbsoluteFill style={{ opacity: show * (1 - leave * 0.9) }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: 1045,
        transformOrigin: `${fx}px ${fy}px`,
        transform: `translate(${960 - fx}px, ${540 - fy}px) scale(${scale * (1 + leave * 0.15)})`,
        filter: `blur(${leave * 10}px)`,
      }}>
        <Shot src="projects/educanvas/home.webp" />
        {/* cover the placeholder, then type the question into the real field */}
        <div style={{ position: 'absolute', left: HOME.input.left + 70, top: HOME.input.top + 14, width: 640, height: 54, background: '#1f1c1b', borderRadius: 8, opacity: p(frame, typedStart - 6, typedStart) }} />
        <div style={{ position: 'absolute', left: HOME.input.left + 82, top: HOME.input.y - 16, fontFamily: SANS, fontSize: 21, color: PAPER, opacity: 1 - p(frame, enter + 2, enter + 12) }}>
          <Typed text={QUESTION} start={typedStart} every={4} caretColor={PAPER} />
        </div>
        <div style={{
          position: 'absolute', left: HOME.input.left, top: HOME.input.top, width: HOME.input.right - HOME.input.left,
          height: HOME.input.bottom - HOME.input.top, borderRadius: 42, border: `2px solid ${ACCENT}`, opacity: flash,
          boxShadow: `0 0 40px ${ACCENT}`,
        }} />
      </div>
    </AbsoluteFill>
  )
}

// The architecture, rebuilt from /projects/educanvas/system-overview.svg as a left-to-right path.
const NODES = {
  entry: { x: 250, y: 560, en: 'Entry · Web / API', cn: '多入口' },
  gateway: { x: 540, y: 560, en: 'gateway.v1', cn: '可信网关' },
  notebook: { x: 830, y: 560, en: 'Notebook', cn: '长期上下文' },
  loop: { x: 1130, y: 560, en: 'Agent Loop', cn: '统一运行时' },
  model: { x: 1440, y: 410, en: 'Model Gateway', cn: 'Provider Adapter' },
  skills: { x: 1440, y: 710, en: 'Profile · Skills · Tools', cn: '教育能力按需加入' },
  store: { x: 1720, y: 560, en: 'PostgreSQL', cn: '事实 · 事件 · 异步' },
} as const

function Architecture() {
  const frame = useCurrentFrame()          // local (starts at 200)
  const appear = (i: number) => p(frame, 10 + i * 4, 30 + i * 4)
  const mainPath: [number, number][] = [[960, 700], [NODES.entry.x, NODES.entry.y], [NODES.gateway.x, 560], [NODES.notebook.x, 560], [NODES.loop.x, 560]]
  const upPath: [number, number][] = [[NODES.loop.x, 560], [1290, 560], [1290, 410], [NODES.model.x, 410], [1590, 410], [1590, 560], [NODES.store.x, 560]]
  const downPath: [number, number][] = [[NODES.loop.x, 560], [1290, 560], [1290, 710], [NODES.skills.x, 710], [1590, 710], [1590, 560], [NODES.store.x, 560]]
  const t1 = p(frame, 30, 100, inOut)     // entry → loop
  const t2 = p(frame, 108, 164, inOut)    // loop → both branches → store
  const [mx, my] = along(mainPath, t1)
  const [ux, uy] = along(upPath, t2)
  const [dx, dy] = along(downPath, t2)
  const litAt = (arrive: number) => p(frame, arrive, arrive + 6) * (0.45 + 0.55 * (1 - p(frame, arrive + 6, arrive + 40)))
  // the loop stays lit: everything passes through it
  const loopLit = p(frame, 98, 104)
  const fade = 1 - p(frame, 168, 180, inQ)
  return (
    <AbsoluteFill style={{ opacity: p(frame, 0, 12) * fade }}>
      <Rise start={20} style={{ position: 'absolute', top: 190, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 52, color: PAPER }}>一个 Agent Loop</div>
      </Rise>
      <Rise start={28} style={{ position: 'absolute', top: 268, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.12em', color: MUTED }}>通用协作与教育场景共用 · 教育能力通过 Profile / Skills / Tools 按需加入</div>
      </Rise>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <Wire points={mainPath.slice(1)} k={1} color={HAIR} dashed />
        <Wire points={upPath} k={1} color={HAIR} dashed />
        <Wire points={downPath} k={1} color={HAIR} dashed />
        <Wire points={mainPath.slice(1)} k={p(frame, 40, 100, inOut)} color={ACCENT} width={2} />
        <Wire points={upPath} k={t2} color={ACCENT} width={2} />
        <Wire points={downPath} k={t2} color={ACCENT} width={2} />
      </svg>
      <Node {...NODES.entry} accent={ACCENT} appear={appear(0)} lit={litAt(40)} />
      <Node {...NODES.gateway} accent={ACCENT} appear={appear(1)} lit={litAt(58)} />
      <Node {...NODES.notebook} accent={ACCENT} appear={appear(2)} lit={litAt(78)} />
      <Node {...NODES.loop} w={260} h={112} accent={ACCENT} appear={appear(3)} lit={loopLit} />
      <Node {...NODES.model} w={250} accent={ACCENT} appear={appear(4)} lit={litAt(128)} />
      <Node {...NODES.skills} w={290} accent={ACCENT} appear={appear(5)} lit={litAt(128)} />
      <Node {...NODES.store} w={250} accent={ACCENT} appear={appear(6)} lit={litAt(160)} />
      {frame < 106 ? <Dot x={mx} y={my} accent={ACCENT} opacity={p(frame, 24, 30)} /> : null}
      {frame >= 106 ? <><Dot x={ux} y={uy} accent={ACCENT} size={11} /><Dot x={dx} y={dy} accent={ACCENT} size={11} /></> : null}
    </AbsoluteFill>
  )
}

const G32 = pixels.g32 as number[][]
const G64 = pixels.g64 as number[][]

function Answer() {
  const frame = useCurrentFrame()          // local (starts at 380)
  // 1) the real answer screen wipes in, pushes to its code block
  const wipe = p(frame, 0, 18, inOut)
  const push = p(frame, 22, 64, inOut)
  const scale = mix(1.035, 2.1, push)
  const fx = mix(960, CODE.x, push)
  const fy = mix(523, CODE.y, push)
  const screenOut = p(frame, 60, 76)
  // 2) the numbers become a grid; the grid fills with colour; the grid resolves into the photo
  const gridIn = p(frame, 62, 80)
  const fill = (i: number, cols: number) => p(frame, 88 + (i % cols) * 0.9 + Math.floor(i / cols) * 0.5, 100 + (i % cols) * 0.9 + Math.floor(i / cols) * 0.5)
  const fine = p(frame, 128, 142, inOut)
  const photo = p(frame, 146, 166, inOut)
  const leave = p(frame, 168, 180, inQ)
  const cellW = 1920 / 32
  const cellH = 1080 / 18
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - screenOut, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1920, height: 1046,
          transformOrigin: `${fx}px ${fy}px`, transform: `translate(${960 - fx}px, ${540 - fy}px) scale(${scale})`,
        }}>
          <Shot src="projects/educanvas/learning-response.webp" />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: gridIn * (1 - leave) }}>
        {/* coarse grid: each cell starts as its own RGB triple and fills with that colour */}
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - fine }}>
          {G32.map(([r, g, b], i) => {
            const k = fill(i, 32)
            const x = (i % 32) * cellW
            const y = Math.floor(i / 32) * cellH
            return (
              <div key={i} style={{
                position: 'absolute', left: x, top: y, width: cellW, height: cellH,
                background: `rgba(${r},${g},${b},${k})`, outline: `1px solid rgba(17,18,16,${0.35 + 0.4 * (1 - k)})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: k > 0.5 ? 'rgba(17,18,16,0.55)' : 'rgba(234,231,223,0.5)', opacity: 1 - p(frame, 104, 122) }}>
                  {r},{g},{b}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: fine * (1 - photo) }}>
          {G64.map(([r, g, b], i) => (
            <div key={i} style={{
              position: 'absolute', left: (i % 64) * (cellW / 2), top: Math.floor(i / 64) * (cellH / 2), width: cellW / 2 + 0.5, height: cellH / 2 + 0.5,
              background: `rgb(${r},${g},${b})`,
            }} />
          ))}
        </div>
        <Img src={staticFile(`site/${pixels.src}`)} style={{
          position: 'absolute', left: 0, width: 1920, top: -(pixels.crop[1] / pixels.crop[2]) * 1920, opacity: photo,
          transform: `scale(${1 + photo * 0.03})`, transformOrigin: '50% 40%',
        }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(17,18,16,0.85) 100%)' }} />
        <Rise start={84} style={{ position: 'absolute', left: 120, bottom: 150 }}>
          <div style={{ fontFamily: SERIF_CN, fontSize: 50, color: PAPER }}>在计算机眼里，图片是一张数字表格</div>
        </Rise>
        <Rise start={92} style={{ position: 'absolute', left: 122, bottom: 112 }}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: MUTED }}>AGENT 生成的结构化学习内容 · 每一格都是一组 [R, G, B]</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

function Focus() {
  const frame = useCurrentFrame()          // local (starts at 560)
  const k = p(frame, 0, 18)
  const drift = frame / 100
  return (
    <AbsoluteFill style={{ opacity: k * (1 - p(frame, 88, 100, inQ)) }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1.08 - drift * 0.04}) translateY(${drift * 10}px)` }}>
        <Shot src="projects/educanvas/focus-mode.webp" style={{ top: 16 }} />
      </div>
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(17,18,16,0.7) 0%, transparent 45%)' }} />
      <Rise start={14} style={{ position: 'absolute', left: 120, bottom: 190 }}>
        <div style={{ fontFamily: SERIF_CN, fontSize: 50, color: PAPER }}>安静地学下去</div>
      </Rise>
      <Rise start={22} style={{ position: 'absolute', left: 122, bottom: 150 }}>
        <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: MUTED }}>FOCUS MODE · 沉浸式学习，过程可追溯</div>
      </Rise>
    </AbsoluteFill>
  )
}

export const EduCanvasV1: React.FC = () => {
  useFonts()
  const frame = useCurrentFrame()
  // the request dot, carried between scenes: born at the send button, it rises into the diagram
  const born = 180
  const bornK = p(frame, born, born + 20, inOut)
  return (
    <Stage accent={ACCENT}>
      <Sequence durationInFrames={100}><Greeting /></Sequence>
      <Sequence from={80} durationInFrames={130}><Home /></Sequence>
      {frame >= born && frame < 232 ? (
        <Dot x={mix(1250, 960, bornK)} y={mix(540, 700, bornK)} accent={ACCENT} opacity={p(frame, born, born + 4) * (1 - p(frame, 226, 232))} />
      ) : null}
      <Sequence from={200} durationInFrames={185}><Architecture /></Sequence>
      <Sequence from={380} durationInFrames={185}><Answer /></Sequence>
      <Sequence from={560} durationInFrames={102}><Focus /></Sequence>
      <Sequence from={660} durationInFrames={60}>
        <EndCard start={0} name="EduCanvas" cn="教育能力驱动的通用个人 Agent 平台"
          tagline="One Agent Runtime across knowledge, creation and trusted learning"
          stack={['Next.js', 'TypeScript', 'PostgreSQL', 'Drizzle', 'Docker']}
          footer="01 / 2026 · github.com/Timcai06/EduCanvas" accent={ACCENT} dotFrom={[960, 900]} />
      </Sequence>
      <Hud index="01" name="EduCanvas" meta="Agent Runtime · 2026" accent={ACCENT} />
      <AbsoluteFill style={{ background: INK, opacity: 1 - p(frame, 0, 6), pointerEvents: 'none' }} />
    </Stage>
  )
}

