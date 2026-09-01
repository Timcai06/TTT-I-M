import { useRef } from 'react'
import { skillRows as rows } from '../content'
import { useSkillsFlowLine } from './skills/useSkillsFlowLine'
import SkillRowItem from './skills/SkillRowItem'
import LogoLoop from './LogoLoop'
import type { LogoItem } from './LogoLoop'

const workingSet = [
  ['01', 'React', 'Interface'],
  ['02', 'TypeScript', 'Language'],
  ['03', 'GSAP', 'Motion'],
  ['04', 'Three.js', 'Graphics'],
  ['05', 'Python', 'Systems'],
  ['06', 'FastAPI', 'Backend'],
  ['07', 'PostgreSQL', 'Data'],
  ['08', 'LangGraph', 'Agents'],
  ['09', 'PyTorch', 'ML'],
  ['10', 'Docker', 'Infra'],
] satisfies ReadonlyArray<readonly [string, string, string]>

const workingSetLogos: LogoItem[] = workingSet.map(([index, name, kind]) => ({
  node: (
    <span className="skills-working-set__mark">
      <span className="skills-working-set__index">{index}</span>
      <strong>{name}</strong>
      <small>{kind}</small>
    </span>
  ),
  title: `${name} — ${kind}`,
}))

/**
 * @description Skills 章节 —— 技术栈与工程交付能力矩阵（组合层）。
 *   每行代表一个技能领域 (Frontend / Motion·3D / Backend / AI·Data / Infra / Math·Modeling)，
 *   含分类标签、工具链、项目落地引用。
 *
 *   视觉亮点：技能列表背后一条流动的三段式贝塞尔曲线（蛇形 S 走势），
 *   红色 active 线段的前端跟随屏幕垂直中心，滚动时线条被视口持续“牵引”。
 *
 *   分层（frame/ 同范式，2026-06-12 拆分）：
 *   - 几何计算：`lib/skillsFlowPath`（纯函数，单测覆盖）
 *   - 测量 + 滚动同步：`skills/useSkillsFlowLine`（hook 持有 ScrollTrigger）
 *   - 行展示：`skills/SkillRowItem`（无动画状态的纯渲染）
 *   - 本组件：组合 + 标题/逐行 reveal 时间线
 *
 * @dependencies useSkillsFlowLine（红色 active flow 在 Frame → Stack 完成接棒后启动）
 * @steps
 *   step1: useSkillsFlowLine — 蛇形曲线测量、resize 重建、视口中心 dasharray 同步
 *   step2: 标题与首屏技能行保持稳定，避免 Canvas 接棒后再次整体展开
 */
export default function Skills() {
  const root = useRef<HTMLElement>(null)
  const { pathRef, pathD, svgLeft, svgWidth } = useSkillsFlowLine(root)

  return (
    <section className="section skills container" id="skills" ref={root} style={{ position: 'relative' }}>
      {/* Stack 深处的红色 active flow；入口由 Canvas UI 独占。 */}
      <svg
        className="skills__flow-svg"
        style={{ left: svgLeft, width: svgWidth }}
        fill="none"
        pointerEvents="none"
        aria-hidden="true"
      >
        {pathD && (
          <>
            {/* 红色背景引导轨道 */}
            <path
              d={pathD}
              stroke="rgba(255, 51, 51, 0.05)"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* active 流动高亮 */}
            <path
              ref={pathRef}
              d={pathD}
              stroke="#ff3333"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>

      <div className="section__label">Stack — 技术栈</div>
      <h2 className="section__title">
        <span className="split-line"><span className="split-line__inner">The stack <em>I work</em></span></span>
        <span className="split-line"><span className="split-line__inner">with.</span></span>
      </h2>

      <div className="skills__list">
        {rows.map((row) => (
          <SkillRowItem key={row.index} row={row} />
        ))}
      </div>

      <div className="skills-working-set">
        <div className="skills-working-set__header">
          <span>Working set · 当前工具链</span>
          <small>Used across shipped systems / 2026</small>
        </div>
        <LogoLoop
          className="skills-working-set__loop"
          logos={workingSetLogos}
          speed={38}
          direction="left"
          logoHeight={24}
          gap={64}
          hoverSpeed={8}
          fadeOut
          fadeOutColor="#000000"
          ariaLabel="Tools used across shipped systems"
        />
      </div>
    </section>
  )
}
