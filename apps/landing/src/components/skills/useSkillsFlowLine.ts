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
      const firstRowEl = rootEl.querySelector('.skill-row')
      const lastRowEl = rootEl.querySelector('.skill-row:last-child')
      if (!firstRowEl || !lastRowEl) return

      const rootRect = rootEl.getBoundingClientRect()
      const firstRowRect = firstRowEl.getBoundingClientRect()
      const lastRowRect = lastRowEl.getBoundingClientRect()

      // SVG 以视口宽度铺满；left 偏移抵消 root 容器自身的水平内边距/margin
      setSvgLeft(-rootRect.left)
      setSvgWidth(window.innerWidth)

      setPathD(buildSkillsFlowPathD({
        viewportWidth: window.innerWidth,
        startY: firstRowRect.top - rootRect.top + firstRowRect.height * 0.5,
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
    const rootEl = root.current
    if (!path || !pathD || !rootEl) return

    const ctx = gsap.context(() => {
      const length = path.getTotalLength()
      // quickSetter is typed as bare `Function` upstream; pin the real signature.
      const setDash = gsap.quickSetter(path, 'strokeDasharray') as (value: string) => void

      // 预计算 Y→length 查找表（每次 pathD 重建一次）。蛇形路径的 y 单调递增
      // （skillsFlowPath 用 C1 连续、拐点竖直切线保证），因此滚动时只需在
      // 纯数值表上二分/插值，而不再是每个滚动帧调用 16 次昂贵的 getPointAtLength()。
      const SAMPLES = 48
      const table = Array.from({ length: SAMPLES + 1 }, (_, index) => {
        const l = (length * index) / SAMPLES
        return { length: l, y: path.getPointAtLength(l).y }
      })

      const lengthAtY = (targetY: number) => {
        let low = 0
        let high = table.length
        while (low < high) {
          const mid = (low + high) >> 1
          const sample = table[mid]
          if (sample && sample.y < targetY) low = mid + 1
          else high = mid
        }
        const upper = table[low]
        const lower = table[low - 1]
        if (!upper) return length
        if (!lower) return upper.length
        const span = upper.y - lower.y || 1
        const t = Math.min(1, Math.max(0, (targetY - lower.y) / span))
        return lower.length + (upper.length - lower.length) * t
      }

      const syncLineToViewportCenter = () => {
        const rootRect = rootEl.getBoundingClientRect()
        rootEl.classList.toggle(
          'is-flow-active',
          rootRect.top <= -window.innerHeight * 0.28 && rootRect.bottom > 0,
        )
        const centerYInSection = window.innerHeight * 0.5 - rootRect.top
        const drawnLength = lengthAtY(centerYInSection)
        setDash(`${drawnLength} ${length}`)
      }

      gsap.set(path, { strokeDasharray: `0 ${length}`, strokeDashoffset: 0 })
      syncLineToViewportCenter()

      ScrollTrigger.create({
        trigger: rootEl,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: syncLineToViewportCenter,
        onRefresh: syncLineToViewportCenter,
      })
    }, root)

    return () => {
      rootEl.classList.remove('is-flow-active')
      ctx.revert()
    }
  }, [pathD, root])

  return { pathRef, pathD, svgLeft, svgWidth }
}
