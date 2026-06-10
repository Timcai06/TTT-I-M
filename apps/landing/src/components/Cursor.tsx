import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { subscribeStage } from '../lib/stage'
import { isTouchDevice } from '../lib/device'

/**
 * @description 自定义鼠标指针 —— 跟随实际鼠标位置的 lerped 圆点，悬浮在 z-index 最高层。
 *   触摸设备自动跳过。hover 可交互元素 (a, button, [data-cursor="hover"]) 时放大为 `.is-hover` 样式。
 *   章节过渡期间切换为 `.is-scanning` 扫描线风格。
 *
 *   关键设计：使用 GSAP ticker 驱动位置插值 (而非 mousemove→直接 set)，
 *   解耦事件频率 (≥60Hz) 与视觉更新频率 (单帧一次)，避免 pointermove 高频触发时的布局抖动。
 *
 * @dependencies
 *   - GSAP ticker (位置 lerp)
 *   - `stage` 状态机 (transitioning → is-scanning 样式)
 *   - `isTouchDevice()` (触摸设备直接返回 null 不渲染)
 *
 * @performance / @caveats
 *   - speed=0.22 为视觉上理想的 "软弹簧跟随" 阻尼因子 —— 太低显得迟钝，太高像粘滞
 *   - settled 检测 (dx/dy < 0.2) + 700ms 无移动后自动停止 ticker，节省 GPU 合成开销
 *   - isTarget 使用 closest() 向上查找而非仅匹配直接 target —— 支持事件委托，适配动态挂载的子元素
 *
 * @steps
 *   step1: touch → 直接 return (不渲染 DOM，不注册监听器)
 *   step2: mousemove → 更新 target{x,y} → startTicking
 *   step3: tick callback → pos 向 target 做指数衰减插值 (lerp) → gsap.set
 *   step4: mouseover/mouseout 事件委托 → 检查 target → 切换 is-hover 类
 *   step5: stage→transitioning → 切换 is-scanning 类
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (isTouchDevice()) return

    gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 })

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = { x: target.x, y: target.y }
    const speed = 0.22
    let hasMoved = false
    let ticking = false
    let lastMove = 0

    const stopTicking = () => {
      if (!ticking) return
      ticking = false
      gsap.ticker.remove(tick)
    }

    const startTicking = () => {
      if (ticking) return
      ticking = true
      gsap.ticker.add(tick)
    }

    const onMove = (e: MouseEvent) => {
      if (!hasMoved) {
        hasMoved = true
        gsap.set(el, { opacity: 1 })
      }
      target.x = e.clientX
      target.y = e.clientY
      lastMove = performance.now()
      startTicking()
    }

    const tick = () => {
      const dt = 1 - Math.pow(1 - speed, gsap.ticker.deltaRatio())
      pos.x += (target.x - pos.x) * dt
      pos.y += (target.y - pos.y) * dt
      gsap.set(el, { x: pos.x, y: pos.y })

      const settled = Math.abs(target.x - pos.x) < 0.2 && Math.abs(target.y - pos.y) < 0.2
      if (settled && performance.now() - lastMove > 700) stopTicking()
    }

    window.addEventListener('mousemove', onMove)

    /* ── Event delegation: covers all interactive + data-cursor="hover" elements
       regardless of when they mount. ── */
    const isTarget = (node: EventTarget | null): boolean => {
      if (!(node instanceof Element)) return false
      return (
        node.matches('a, button, [data-cursor="hover"]') ||
        node.closest('a, button, [data-cursor="hover"]') !== null
      )
    }

    const onEnter = (e: MouseEvent) => {
      if (isTarget(e.target)) el.classList.add('is-hover')
    }
    const onLeave = (e: MouseEvent) => {
      if (isTarget(e.target)) el.classList.remove('is-hover')
    }

    const onStageChange = (stage: string) => {
      if (stage === 'transitioning') {
        el.classList.add('is-scanning')
      } else {
        el.classList.remove('is-scanning')
      }
    }
    const unsubStage = subscribeStage(onStageChange)

    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      stopTicking()
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      unsubStage()
    }
  }, [])

  return <div ref={ref} className="cursor" aria-hidden="true" />
}
