import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { subscribeStage } from '../lib/stage'
import { isTouchDevice } from '../lib/device'
import { subscribePointer, type PointerSnapshot } from '../lib/pointerCoordinator'

/**
 * @description 自定义鼠标指针 —— 跟随实际鼠标位置的 lerped 圆点，悬浮在 z-index 最高层。
 *   触摸设备自动跳过。hover 可交互元素 (a, button, [data-cursor="hover"]) 时放大为 `.is-hover` 样式。
 *   章节过渡期间切换为 `.is-scanning` 扫描线风格。
 *
 *   关键设计：共享 Pointer Coordinator 先把 mousemove/scroll/iframe 输入合并到单帧，
 *   再由 GSAP ticker 驱动位置插值，Glass 与 Cursor 因此始终命中同一个语义目标。
 *
 * @dependencies
 *   - GSAP ticker (位置 lerp)
 *   - `stage` 状态机 (transitioning → is-scanning 样式)
 *   - `isTouchDevice()` (触摸设备直接返回 null 不渲染)
 *
 * @performance / @caveats
 *   - speed=0.66 保留短距离平滑跟随；带标签的关键入口会立即贴合原生指针，避免首次反馈滞后
 *   - settled 检测 (dx/dy < 0.2) + 700ms 无移动后自动停止 ticker，节省 GPU 合成开销
 *   - isTarget 使用 closest() 向上查找而非仅匹配直接 target，适配动态挂载和 Canvas 子树
 *
 * @steps
 *   step1: touch → 直接 return (不渲染 DOM，不注册监听器)
 *   step2: Pointer Coordinator snapshot → 更新 target{x,y} → startTicking
 *   step3: tick callback → pos 向 target 做指数衰减插值 (lerp) → gsap.set
 *   step4: 共享 hit-test target → 切换 is-hover / is-over-glass 类
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
    const speed = 0.66
    let hasMoved = false
    let ticking = false
    let lastMove = 0
    let cursorVisible = false
    const setX = gsap.quickSetter(el, 'x', 'px') as (value: number) => void
    const setY = gsap.quickSetter(el, 'y', 'px') as (value: number) => void

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

    const moveTo = (x: number, y: number) => {
      target.x = x
      target.y = y
      if (!hasMoved) {
        hasMoved = true
        pos.x = target.x
        pos.y = target.y
        setX(pos.x)
        setY(pos.y)
      }
      if (!cursorVisible) {
        cursorVisible = true
        gsap.set(el, { opacity: 1 })
      }
      lastMove = performance.now()
      startTicking()
    }

    const tick = () => {
      const dt = 1 - Math.pow(1 - speed, gsap.ticker.deltaRatio())
      pos.x += (target.x - pos.x) * dt
      pos.y += (target.y - pos.y) * dt
      setX(pos.x)
      setY(pos.y)

      const settled = Math.abs(target.x - pos.x) < 0.2 && Math.abs(target.y - pos.y) < 0.2
      if (settled && performance.now() - lastMove > 700) stopTicking()
    }

    /* Shared hit-testing keeps the visible cursor and Canvas UI Glass on the
       same semantic target even when scrolling moves content under a still
       pointer or an iframe forwards its coordinates. */
    const findTarget = (node: EventTarget | null): HTMLElement | null => {
      if (!(node instanceof Element)) return null
      if (node.closest('[data-cursor="default"]')) return null
      return node.closest<HTMLElement>('a, button, [data-cursor="hover"], [data-cursor-label]')
    }

    let activeInteractive: HTMLElement | null = null
    const setInteractive = (interactive: HTMLElement | null, x = target.x, y = target.y) => {
      if (interactive === activeInteractive) return
      activeInteractive = interactive
      el.classList.toggle('is-hover', Boolean(interactive))
      const label = interactive?.dataset.cursorLabel
      if (!label) {
        el.classList.remove('is-labeled')
        delete el.dataset.label
        return
      }

      // Labeled chapter controls attach to the real pointer immediately. This
      // also runs when scrolling moves a panel beneath a stationary pointer.
      target.x = x
      target.y = y
      pos.x = x
      pos.y = y
      setX(x)
      setY(y)
      el.dataset.label = label
      el.classList.add('is-labeled')
    }

    const onPointer = (pointer: PointerSnapshot) => {
      if (!pointer.hasMoved) return
      if (!pointer.active) {
        setInteractive(null, pointer.clientX, pointer.clientY)
        el.classList.remove('is-over-glass')
        cursorVisible = false
        gsap.set(el, { opacity: 0 })
        return
      }

      moveTo(pointer.clientX, pointer.clientY)
      setInteractive(findTarget(pointer.target), pointer.clientX, pointer.clientY)
      el.classList.toggle(
        'is-over-glass',
        Boolean(pointer.target?.closest('.projects[data-work-glass-active="true"]')),
      )
    }
    const unsubscribePointer = subscribePointer(onPointer)

    const onStageChange = (stage: string) => {
      if (stage === 'transitioning') {
        el.classList.add('is-scanning')
      } else {
        el.classList.remove('is-scanning')
      }
    }
    const unsubStage = subscribeStage(onStageChange)

    return () => {
      unsubscribePointer()
      stopTicking()
      unsubStage()
    }
  }, [])

  return <div ref={ref} className="cursor" aria-hidden="true" />
}
