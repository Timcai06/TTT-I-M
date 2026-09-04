import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createLaser, LASER_CONFIG, type LaserHandle } from '../lib/canvas-ui/laser'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from '../lib/webgl/contextRegistry'

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
  const retryCountRef = useRef(0)
  const [retryKey, setRetryKey] = useState(0)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()
  const disabled = reducedMotion || mobileExperience

  useEffect(() => {
    const host = ref.current
    if (!host || !active || disabled) {
      if (!active) retryCountRef.current = 0
      return
    }
    const canvas = host.querySelector('canvas')
    if (!canvas) return

    const capture = captureRef.current
    const beamTarget = capture?.querySelector<HTMLElement>('.projects__bento') ?? null
    let contextLease: ContextLease | null = null
    let handle: LaserHandle | null = null
    let resizeObserver: ResizeObserver | null = null
    let stopWaiting = () => {}
    let released = false
    let retryTimer = 0

    const onContextLost = (event: Event) => {
      event.preventDefault()
      retry()
    }

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

    const resize = () => {
      syncBeamBounds()
      handle?.resize()
    }
    const cleanup = () => {
      window.clearTimeout(retryTimer)
      retryTimer = 0
      if (released) return
      released = true
      stopWaiting()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      resizeObserver?.disconnect()
      resizeObserver = null
      if (handleRef.current === handle) handleRef.current = null
      try {
        handle?.destroy()
      } catch {
        // Continue through lease release even if a driver rejects teardown.
      } finally {
        handle = null
        contextLease?.release()
        contextLease = null
        host.dataset.mode = 'unavailable'
      }
    }
    const retry = () => {
      if (released) return
      cleanup()
      retryCountRef.current += 1
      if (retryCountRef.current > 2) return
      const delay = 420 * retryCountRef.current
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        setRetryKey((key) => key + 1)
      }, delay)
    }

    syncBeamBounds()
    canvas.addEventListener('webglcontextlost', onContextLost)
    stopWaiting = acquireOptionalContextWhenAvailable('project-laser', (lease) => {
      if (released) {
        lease.release()
        return
      }
      contextLease = lease
      let created: LaserHandle | null
      try {
        created = createLaser(canvas, capture, beamTarget)
      } catch {
        retry()
        return
      }
      if (!created) {
        retry()
        return
      }
      handle = created
      try {
        retryCountRef.current = 0
        handleRef.current = created
        host.dataset.mode = created.mode
        resizeObserver = beamTarget && typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(resize)
          : null
        if (beamTarget) resizeObserver?.observe(beamTarget)
        window.addEventListener('resize', resize)
        resize()
      } catch {
        retry()
      }
    })
    return cleanup
  }, [active, captureRef, disabled, handleRef, retryKey])

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
