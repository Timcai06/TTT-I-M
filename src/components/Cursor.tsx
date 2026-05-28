import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(hover: none)').matches) return

    gsap.set(el, { xPercent: -50, yPercent: -50 })

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = { x: target.x, y: target.y }
    const speed = 0.22

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY
    }

    const tick = () => {
      const dt = 1 - Math.pow(1 - speed, gsap.ticker.deltaRatio())
      pos.x += (target.x - pos.x) * dt
      pos.y += (target.y - pos.y) * dt
      gsap.set(el, { x: pos.x, y: pos.y })
    }

    window.addEventListener('mousemove', onMove)
    gsap.ticker.add(tick)

    const onEnter = () => el.classList.add('is-hover')
    const onLeave = () => el.classList.remove('is-hover')

    const updateInteractives = () => {
      document.querySelectorAll('a, button, [data-cursor="hover"]').forEach((node) => {
        node.addEventListener('mouseenter', onEnter)
        node.addEventListener('mouseleave', onLeave)
      })
    }

    // wait for next frame so child components are mounted
    const r = requestAnimationFrame(updateInteractives)

    return () => {
      window.removeEventListener('mousemove', onMove)
      gsap.ticker.remove(tick)
      cancelAnimationFrame(r)
      document.querySelectorAll('a, button, [data-cursor="hover"]').forEach((node) => {
        node.removeEventListener('mouseenter', onEnter)
        node.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [])

  return <div ref={ref} className="cursor" aria-hidden="true" />
}
