import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { scrollToChapter } from '../lib/chapterScroll'
import { skillRows as rows } from '../content'

/**
 * @description Skills 章节 —— 技术栈与工程交付能力矩阵。
 *   每行代表一个技能领域 (Frontend / Motion·3D / Backend / AI·Data / Infra / Math·Modeling)，
 *   含分类标签、工具链、项目落地引用。
 *
 *   视觉亮点：在技能列表左侧绘制一条流动的三段式贝塞尔曲线 (蛇形 S 走势)，
 *   随滚动以 strokeDashoffset 方式 "生长"，80px 线宽，红色 (--accent) 描边。
 *
 * @dependencies
 *   - GSAP + ScrollTrigger (strokeDashoffset scrubbing + 逐行入场)
 *   - `scrollToChapter` (技能标签 to→项目章节跳转)
 *   - 自适应 SVG 路径：通过 getBoundingClientRect 动态计算起点/终点，resize 时重新生成
 *
 * @performance / @caveats
 *   - SVG 路径的四个控制点 P0-P3 通过 viewport 宽度百分比计算 (72% / 28%)，
 *     k=0.38 为三次贝塞尔垂直切线因子，确保拐点 C1 连续且拐弯平滑
 *   - 80px 粗线在 resize 时重新 setPathD → 重新分配 strokeDasharray (会引起 layout)，
 *     但仅在窗口 resize 触发，非滚动路径，不会造成滚动卡顿
 *   - 路径依赖 `root.current` 的 getBoundingClientRect，因此 SVG 的 left 偏移量需绑定到 `svgLeft`
 *     以覆盖 body 的 default margin
 *
 * @steps
 *   step1: Effect 1 — 动态测量并构建三段式蛇形贝塞尔曲线 pathD
 *   step2: Effect 2 — 将 pathD 绑定到 GSAP strokeDashoffset scrubbing（滚动即画线）
 *   step3: Effect 3 — 标题裂分入场 + 技能行逐行 staggered reveal（120ms 间隔，双向回退）
 */
export default function Skills() {
  const root = useRef<HTMLElement>(null)
  const skillsPathRef = useRef<SVGPathElement>(null)
  const [pathD, setPathD] = useState('')
  const [svgLeft, setSvgLeft] = useState(0)
  const [svgWidth, setSvgWidth] = useState(0)

  // 1. 动态测量起点和终点坐标，构建包含三段式三次贝塞尔曲线的自适应平滑 SVG 路径
  useEffect(() => {
    if (!root.current) return

    const updatePath = () => {
      const rootEl = root.current
      if (!rootEl) return
      const titleEl = rootEl.querySelector('.section__title')
      const lastRowEl = rootEl.querySelector('.skill-row:last-child')
      if (!titleEl || !lastRowEl) return

      const rootRect = rootEl.getBoundingClientRect()
      const titleRect = titleEl.getBoundingClientRect()
      const lastRowRect = lastRowEl.getBoundingClientRect()

      const viewportWidth = window.innerWidth
      setSvgLeft(-rootRect.left)
      setSvgWidth(viewportWidth)

      // 标题和最后一行相对于 root 容器的 Y 坐标
      const sY = titleRect.top - rootRect.top
      const eY = lastRowRect.bottom - rootRect.top

      // 构建 4 个核心控制点以获得“左 -> 右 -> 左 -> 右”的优雅蛇形走势
      // P0: 屏幕左侧边缘 (0, sY - 120)
      // P1: 第一次右弯最高点 (viewportWidth * 0.72, sY + h * 0.3)
      // P2: 第二次左弯最高点 (viewportWidth * 0.28, sY + h * 0.7)
      // P3: 屏幕最右侧出口 (viewportWidth, eY + 120)
      const P0 = { x: 0, y: sY - 120 }
      const P1 = { x: viewportWidth * 0.72, y: sY + (eY - sY) * 0.3 }
      const P2 = { x: viewportWidth * 0.28, y: sY + (eY - sY) * 0.7 }
      const P3 = { x: viewportWidth, y: eY + 120 }

      // 自动计算三次贝塞尔曲线控制点，使拐点处处 C1 连续且垂直
      const k = 0.38
      
      // 第一段 P0 -> P1 (起点水平出发，拐点垂直切入)
      const cp1_0 = { x: P0.x + (P1.x - P0.x) * k, y: P0.y }
      const cp2_0 = { x: P1.x, y: P1.y - (P1.y - P0.y) * k }

      // 第二段 P1 -> P2 (拐点 P1 垂直出发，拐点 P2 垂直切入)
      const cp1_1 = { x: P1.x, y: P1.y + (P2.y - P1.y) * k }
      const cp2_1 = { x: P2.x, y: P2.y - (P2.y - P1.y) * k }

      // 第三段 P2 -> P3 (拐点 P2 垂直出发，终点水平切出)
      const cp1_2 = { x: P2.x, y: P2.y + (P3.y - P2.y) * k }
      const cp2_2 = { x: P3.x - (P3.x - P2.x) * k, y: P3.y }

      const d = `M ${P0.x.toFixed(1)},${P0.y.toFixed(1)} ` +
                `C ${cp1_0.x.toFixed(1)},${cp1_0.y.toFixed(1)} ${cp2_0.x.toFixed(1)},${cp2_0.y.toFixed(1)} ${P1.x.toFixed(1)},${P1.y.toFixed(1)} ` +
                `C ${cp1_1.x.toFixed(1)},${cp1_1.y.toFixed(1)} ${cp2_1.x.toFixed(1)},${cp2_1.y.toFixed(1)} ${P2.x.toFixed(1)},${P2.y.toFixed(1)} ` +
                `C ${cp1_2.x.toFixed(1)},${cp1_2.y.toFixed(1)} ${cp2_2.x.toFixed(1)},${cp2_2.y.toFixed(1)} ${P3.x.toFixed(1)},${P3.y.toFixed(1)}`

      setPathD(d)
    }

    // 初始化并监听窗口大小改变
    updatePath()
    window.addEventListener('resize', updatePath)

    return () => {
      window.removeEventListener('resize', updatePath)
    }
  }, [])

  // 2. 绑定流动动画（通过 strokeDashoffset 实现曲线随滚动向右下角“延长”生长）
  useEffect(() => {
    const path = skillsPathRef.current
    if (!path || !pathD) return

    const ctx = gsap.context(() => {
      const length = path.getTotalLength()
      
      // 初始化状态：完全缩进 (strokeDashoffset 为 length)
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })

      gsap.fromTo(
        path,
        { strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 65%', // 调整起点，使线条在板块进入视口 35% 时才开始绘制，避免提前生长
            end: 'bottom 35%', // 调整终点，使线条垂直生长速度与滚动速度达到 1:1 物理同步
            scrub: 0.9, // 降低延迟，确保在每一刻停留时，线条末端都能立刻精准定位在可视屏幕内
          },
        }
      )
    }, root)

    return () => ctx.revert()
  }, [pathD])

  // 3. 逐行延迟显示动画
  useEffect(() => {
    if (!root.current) return
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
            setTimeout(() => {
              row.classList.add('is-visible')
            }, index * 120)
          },
          onLeaveBack: () => {
            row.classList.remove('is-visible') // 双向回退触发
          }
        })
      })
    }, root)
    return () => ctx.revert()
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
              ref={skillsPathRef}
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
          <div className="skill-row" key={row.index}>
            <div className="skill-row__index">{row.index}</div>
            <div className="skill-row__main">
              <div className="skill-row__eyebrow">{row.subtitle}</div>
              <h3 className="skill-row__name">{row.name}</h3>
              <p className="skill-row__desc">{row.description}</p>
            </div>
            <div className="skill-row__meta">
              <div className="skill-row__tags">
                {row.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="skill-row__used">
                <span className="skill-row__used-label">shipped in</span>
                {row.usedIn.map((item) =>
                  item.to ? (
                    <button
                      type="button"
                      key={item.label}
                      className="skill-row__used-link"
                      onClick={() => scrollToChapter(item.to as string, { updateHash: true })}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span key={item.label} className="skill-row__used-item">
                      {item.label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
