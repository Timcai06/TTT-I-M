import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { createLaser, LASER_CONFIG, type LaserHandle } from '../lib/canvas-ui/laser'
import { isMobileExperience } from '../lib/device'
import { prefersReducedMotion } from '../lib/motion'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../lib/webgl/contextRegistry'

export default function ProjectLaser({
  active,
  handleRef,
  captureRef,
}: {
  active: boolean
  handleRef: RefObject<LaserHandle | null>
  captureRef: RefObject<HTMLElement | null>
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
    const capture = captureRef.current
    const beamTarget = capture?.querySelector<HTMLElement>('.projects__bento') ?? null

    const syncBeamBounds = () => {
      if (!beamTarget) return
      const bounds = beamTarget.getBoundingClientRect()
      const inset = Math.max(0, bounds.width * (1 - LASER_CONFIG.width) * 0.5)
      const left = Math.max(0, bounds.left + inset)
      const right = Math.max(0, window.innerWidth - bounds.right + inset)
      host.style.setProperty('--projects-laser-left', `${left}px`)
      host.style.setProperty('--projects-laser-right', `${right}px`)
      host.dataset.beamCenter = `${Math.round((bounds.left + bounds.right) * 0.5)}`
    }

    syncBeamBounds()
    const handle = createLaser(canvas, capture, beamTarget)
    if (!handle) {
      releaseContext()
      return
    }
    handleRef.current = handle
    host.dataset.mode = handle.mode
    const resize = () => {
      syncBeamBounds()
      handle.resize()
    }
    const resizeObserver = beamTarget ? new ResizeObserver(resize) : null
    if (beamTarget) resizeObserver?.observe(beamTarget)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      resizeObserver?.disconnect()
      handleRef.current = null
      handle.destroy()
      releaseContext()
    }
  }, [active, captureRef, disabled, handleRef])

  if (disabled) return null

  return (
    <div
      className="projects__laser"
      ref={ref}
      data-active={active ? 'true' : 'false'}
      data-mode="unavailable"
      aria-hidden="true"
      style={{ '--projects-laser-offset': `${LASER_CONFIG.offset}px` } as CSSProperties}
    >
      {active && <canvas />}
    </div>
  )
}
