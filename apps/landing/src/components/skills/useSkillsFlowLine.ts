import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { buildSkillsFlowPathD } from '../../lib/skillsFlowPath'

/**
 * @description Skills 流动曲线的运行时 hook —— 持有曲线的 DOM 测量与滚动同步，
 *   几何计算委托给 lib/skillsFlowPath（纯函数）。与 frame/useArchiveThemeScroll
 *   同范式：组件只拿返回值渲染，不接触 ScrollTrigger 细节。
 * @dependencies GSAP ScrollTrigger、root 容器与 .section__title / .skill-row 的布局测量
 * @performance / @caveats
 *   - resize 时重建 pathD 会引起一次 layout，但仅 resize 触发，不在滚动路径上
 *   - 红线前端跟随视口垂直中心：lengthAtY 用 16 次二分把目标 Y 映射到 path length，
 *     依赖曲线 y 单调递增（skillsFlowPath 的蛇形构造保证这一点）
 */
export function useSkillsFlowLine(root: RefObject<HTMLElement | null>) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathD, setPathD] = useState('')
  const [svgLeft, setSvgLeft] = useState(0)
  const [svgWidth, setSvgWidth] = useState(0)

  // 测量标题/末行得到起止 Y，交给纯函数生成自适应蛇形路径；resize 重建。
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

      // SVG 以视口宽度铺满；left 偏移抵消 root 容器自身的水平内边距/margin
      setSvgLeft(-rootRect.left)
      setSvgWidth(window.innerWidth)

      setPathD(buildSkillsFlowPathD({
        viewportWidth: window.innerWidth,
        startY: titleRect.top - rootRect.top,
        endY: lastRowRect.bottom - rootRect.top,
      }))
    }

    updatePath()
    window.addEventListener('resize', updatePath)

    return () => {
      window.removeEventListener('resize', updatePath)
    }
  }, [root])

  // 红线前端始终跟随视口中心线，而不是按整条 path 的总进度硬画完。
  useEffect(() => {
    const path = pathRef.current
    if (!path || !pathD) return

    const ctx = gsap.context(() => {
      const length = path.getTotalLength()
      // quickSetter is typed as bare `Function` upstream; pin the real signature.
      const setDash = gsap.quickSetter(path, 'strokeDasharray') as (value: string) => void

      const lengthAtY = (targetY: number) => {
        let low = 0
        let high = length

        for (let i = 0; i < 16; i += 1) {
          const mid = (low + high) / 2
          const point = path.getPointAtLength(mid)
          if (point.y < targetY) {
            low = mid
          } else {
            high = mid
          }
        }

        return Math.min(length, Math.max(0, high))
      }

      const syncLineToViewportCenter = () => {
        const rootEl = root.current
        if (!rootEl) return

        const rootRect = rootEl.getBoundingClientRect()
        const centerYInSection = window.innerHeight * 0.5 - rootRect.top
        const drawnLength = lengthAtY(centerYInSection)
        setDash(`${drawnLength} ${length}`)
      }

      gsap.set(path, { strokeDasharray: `0 ${length}`, strokeDashoffset: 0 })
      syncLineToViewportCenter()

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: syncLineToViewportCenter,
        onRefresh: syncLineToViewportCenter,
      })
    }, root)

    return () => ctx.revert()
  }, [pathD, root])

  return { pathRef, pathD, svgLeft, svgWidth }
}
