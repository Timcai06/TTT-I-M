import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { skillRows as rows } from '../content'
import { useSkillsFlowLine } from './skills/useSkillsFlowLine'
import SkillRowItem from './skills/SkillRowItem'

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
 * @dependencies GSAP + ScrollTrigger（标题裂分入场 + 技能行 staggered reveal）
 * @steps
 *   step1: useSkillsFlowLine — 蛇形曲线测量、resize 重建、视口中心 dasharray 同步
 *   step2: Effect — 标题裂分入场 + 技能行逐行 reveal（120ms 间隔，双向回退）
 */
export default function Skills() {
  const root = useRef<HTMLElement>(null)
  const { pathRef, pathD, svgLeft, svgWidth } = useSkillsFlowLine(root)

  // 标题与技能行的 reveal 时间线
  useEffect(() => {
    if (!root.current) return
    const revealTimers: number[] = []
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.section__title .split-line__inner',
        { yPercent: 110, skewY: 6 },
        {
          yPercent: 0,
          skewY: 0,
          duration: 1.4,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.section__title', start: 'top 88%', toggleActions: 'play none none reverse' },
        }
      )

      gsap.utils.toArray<HTMLElement>('.skill-row').forEach((row, index) => {
        ScrollTrigger.create({
          trigger: '.skills__list',
          start: 'top 85%',
          onEnter: () => {
            const timer = window.setTimeout(() => {
              row.classList.add('is-visible')
            }, index * 120)
            revealTimers.push(timer)
          },
          onLeaveBack: () => {
            row.classList.remove('is-visible') // 双向回退触发
          }
        })
      })
    }, root)
    return () => {
      revealTimers.forEach((timer) => window.clearTimeout(timer))
      ctx.revert()
    }
  }, [])

  return (
    <section className="section skills container" id="skills" ref={root} style={{ position: 'relative' }}>
      {/* 80px 宽的红色平滑流动背景曲线 */}
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
              strokeWidth="80"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 80px 红色 active 流动高亮粗线 */}
            <path
              ref={pathRef}
              d={pathD}
              stroke="#ff3333"
              strokeWidth="80"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>

      <div className="section__label">Stack — 技术栈</div>
      <h2 className="section__title">
        <span className="split-line"><span className="split-line__inner">Tools <em>I trust to</em></span></span>
        <span className="split-line"><span className="split-line__inner">ship.</span></span>
      </h2>

      <div className="skills__list">
        {rows.map((row) => (
          <SkillRowItem key={row.index} row={row} />
        ))}
      </div>
    </section>
  )
}
