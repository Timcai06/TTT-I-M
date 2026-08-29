import { useEffect, useRef, type RefObject } from 'react'
import { createLaser, type LaserHandle } from '../lib/canvas-ui/laser'
import { supportsHtmlInCanvas } from '../lib/canvas-ui/runtime'
import { isMobileExperience } from '../lib/device'
import { prefersReducedMotion } from '../lib/motion'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../lib/webgl/contextRegistry'

export default function ProjectLaser({
  active,
  handleRef,
}: {
  active: boolean
  handleRef: RefObject<LaserHandle | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const disabled = prefersReducedMotion() || isMobileExperience()

  useEffect(() => {
    const host = ref.current
    if (!host || !active || disabled) return
    if (!canAcquireOptionalSurface()) return
    const canvas = host.querySelector('canvas')
    if (!canvas) return

    acquireContext()
    const capture = host.parentElement?.querySelector<HTMLElement>('.projects__intro-content')
    const handle = createLaser(canvas, capture)
    if (!handle) {
      releaseContext()
      return
    }
    handleRef.current = handle
    host.dataset.mode = supportsHtmlInCanvas() ? handle.mode : 'beam-fallback'
    const resize = () => handle.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      handleRef.current = null
      handle.destroy()
      releaseContext()
    }
  }, [active, disabled, handleRef])

  if (disabled) return null

  return (
    <div className="projects__laser" ref={ref} data-active={active ? 'true' : 'false'} data-mode="unavailable" aria-hidden="true">
      {active && <canvas />}
    </div>
  )
}
