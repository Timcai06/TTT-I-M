import { gsap } from './gsap'
import { prefersReducedMotion } from './motion'

interface TiltOptions {
  /** Max X-axis rotation in degrees (default 5). */
  maxRX?: number
  /** Max Y-axis rotation in degrees (default 6). */
  maxRY?: number
  /** Lerp damping per frame, 0–1 (default 0.12 — soft spring trail). */
  damp?: number
}

/**
 * Damped 3D tilt that follows the pointer over `el`. The rotation target is
 * updated on mousemove, but the element is only written once per frame from a
 * single gsap.ticker callback (lerped) — decoupling visual rate from event
 * rate, the way lukebaffait's project cards do it.
 *
 * No-ops (and returns a no-op disposer) on touch devices and under
 * reduced-motion. The parent element must establish `perspective`; this writes
 * `rotateX/rotateY` inline, so `el` should not also be transformed by CSS.
 *
 * Returns a disposer that detaches listeners, stops the ticker, and clears the
 * inline transform.
 */
export function attachTilt(el: HTMLElement, opts: TiltOptions = {}): () => void {
  if (prefersReducedMotion()) return () => {}
  if (window.matchMedia('(hover: none)').matches) return () => {}

  const { maxRX = 5, maxRY = 6, damp = 0.12 } = opts

  let targetRX = 0
  let targetRY = 0
  let rx = 0
  let ry = 0
  let active = false

  const clamp = (v: number) => Math.max(-1, Math.min(1, v))

  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect()
    const px = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2))
    const py = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2))
    targetRY = px * maxRY
    targetRX = -py * maxRX
  }
  const onEnter = () => { active = true }
  const onLeave = () => {
    active = false
    targetRX = 0
    targetRY = 0
  }

  const tick = () => {
    // Idle short-circuit: nothing to do once we've settled back to flat.
    if (!active && Math.abs(rx) < 0.01 && Math.abs(ry) < 0.01) return
    rx += (targetRX - rx) * damp
    ry += (targetRY - ry) * damp
    el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`
  }

  el.addEventListener('mousemove', onMove)
  el.addEventListener('mouseenter', onEnter)
  el.addEventListener('mouseleave', onLeave)
  gsap.ticker.add(tick)

  return () => {
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', onLeave)
    gsap.ticker.remove(tick)
    el.style.transform = ''
  }
}
