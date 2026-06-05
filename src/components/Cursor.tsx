import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(hover: none)').matches) return

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

    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      stopTicking()
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [])

  return <div ref={ref} className="cursor" aria-hidden="true" />
}
