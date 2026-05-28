import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'

interface Row {
  index: string
  name: string
  tags: string[]
}

const rows: Row[] = [
  { index: '/01', name: 'Frontend', tags: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind', 'shadcn/ui'] },
  { index: '/02', name: 'Motion · 3D', tags: ['GSAP', 'ScrollTrigger', 'Three.js', 'R3F', 'GLSL'] },
  { index: '/03', name: 'Backend', tags: ['FastAPI', 'Django', 'Celery', 'Redis', 'PostgreSQL'] },
  { index: '/04', name: 'AI · Data', tags: ['DeepSeek', 'Cohere', 'YOLOv8-seg', 'PaddleOCR', 'pgvector'] },
  { index: '/05', name: 'Infra', tags: ['Docker', 'Vercel', 'Supabase', 'GitHub Actions', 'Linux'] },
  { index: '/06', name: 'Math · Modeling', tags: ['Python', 'R', 'Ridge', 'ARIMA', 'GARCH', 'LaTeX'] },
]

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
        Tools <em>I trust to</em><br />ship.
      </h2>

      <div className="skills__list">
        {rows.map((row) => (
          <div className="skill-row" key={row.index}>
            <div className="skill-row__index">{row.index}</div>
            <div className="skill-row__name">{row.name}</div>
            <div className="skill-row__tags">
              {row.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
