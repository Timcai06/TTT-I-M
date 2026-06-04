import { gsap } from './gsap'
import { prefersReducedMotion } from './motion'

/**
 * Magnetic hover: while the cursor is over `el`, the element eases toward it,
 * then springs back on leave. gsap.quickTo keeps it on a single smoothed
 * setter (cheaper than tweening per move). No-op on touch / reduced-motion.
 *
 * Returns a disposer that detaches listeners and resets the transform.
 */
export function attachMagnetic(el: HTMLElement, strength = 0.35): () => void {
  if (typeof window === 'undefined') return () => {}
  if (window.matchMedia('(hover: none)').matches || prefersReducedMotion()) return () => {}

  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })

  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect()
    xTo((e.clientX - (r.left + r.width / 2)) * strength)
    yTo((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const onLeave = () => {
    xTo(0)
    yTo(0)
  }

  el.addEventListener('mousemove', onMove)
  el.addEventListener('mouseleave', onLeave)

  return () => {
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseleave', onLeave)
    gsap.killTweensOf(el)
    gsap.set(el, { x: 0, y: 0 })
  }
}
