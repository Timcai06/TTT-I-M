import { useEffect, useRef, useState, type RefObject } from 'react'
import { createLaser, type LaserHandle } from '../lib/canvas-ui/laser'
import {
  createLocalEffectCommit,
  type LocalEffectState,
} from '../lib/canvas-ui/localEffectControl'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  activeContextOwners,
  getWebGLRecoveryDelay,
  type ContextLease,
} from '../lib/webgl/contextRegistry'
import { canPrepareLocalEffect } from './effects/localEffectEligibility'

export default function ProjectLaser({
  active,
  handleRef,
  captureRef,
  stateRef,
}: {
  active: boolean
  handleRef: RefObject<LaserHandle | null>
  captureRef: RefObject<HTMLElement | null>
  stateRef: RefObject<LocalEffectState>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const retryCountRef = useRef(0)
  const [retryKey, setRetryKey] = useState(0)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()
  const disabled = reducedMotion || mobileExperience

  useEffect(() => {
    const host = ref.current
    const capture = captureRef.current
    // canPrepare, not canRun: the Work chapter is held at opacity 0 behind the
    // archive's projection until the page has finished expanding, so gating
    // construction on visibility put the WebGL2 context and shader compile on
    // exactly that frame -- a measured 33-52ms against an 8.3ms median, at the
    // instant the reader is watching the page open. Build it during the bridge
    // instead; it draws into something invisible for the last stretch and is
    // simply there when the chapter arrives.
    if (!host || !capture || !active || disabled || !canPrepareLocalEffect(capture, 'projects')) {
      if (!active) retryCountRef.current = 0
      return
    }
    const commit = createLocalEffectCommit<LaserHandle>({
      apply: (current, state) => current.setScrollActivity(state),
      destroy: (current) => current.destroy(),
      onAttach: (current) => { handleRef.current = current },
      onDetach: (current) => {
        if (handleRef.current === current) handleRef.current = null
      },
    })
    const canvas = host.querySelector('canvas')
    if (!canvas) return

    const beamTarget = capture
    commit.update(stateRef.current)
    const generation = commit.activate()
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
      const bounds = beamTarget.getBoundingClientRect()
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
      commit.deactivate()
      handle = null
      contextLease?.release()
      contextLease = null
      host.dataset.mode = 'unavailable'
    }
    const retry = () => {
      if (released) return
      const failure = canvas.dataset.laserFailure ?? 'Laser lifecycle failed after initialization.'
      cleanup()
      retryCountRef.current += 1
      host.dataset.lifecycle = 'recovering'
      host.dataset.failure = failure
      host.dataset.recoveryAttempt = `${retryCountRef.current}`
      host.dataset.contextOwners = activeContextOwners().join(',') || 'none'
      const delay = getWebGLRecoveryDelay(retryCountRef.current)
      if (delay === null) {
        host.dataset.lifecycle = 'exhausted'
        return
      }
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        setRetryKey((key) => key + 1)
      }, delay)
    }

    syncBeamBounds()
    host.dataset.lifecycle = 'waiting-context'
    host.dataset.contextOwners = activeContextOwners().join(',') || 'none'
    canvas.addEventListener('webglcontextlost', onContextLost)
    stopWaiting = acquireOptionalContextWhenAvailable('project-laser', (lease) => {
      if (released || !canPrepareLocalEffect(capture, 'projects')) {
        lease.release()
        return
      }
      contextLease = lease
      host.dataset.lifecycle = 'initializing'
      host.dataset.contextOwners = activeContextOwners().join(',') || 'none'
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
        if (!commit.accept(generation, created)) {
          handle = null
          retry()
          return
        }
        retryCountRef.current = 0
        host.dataset.mode = created.mode
        host.dataset.lifecycle = 'live'
        delete host.dataset.failure
        delete host.dataset.recoveryAttempt
        delete host.dataset.contextOwners
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
  }, [active, captureRef, disabled, handleRef, retryKey, stateRef])

  if (disabled) return null

  return (
    <div
      className="projects__laser"
      ref={ref}
      data-active={active ? 'true' : 'false'}
      data-mode="unavailable"
      aria-hidden="true"
    >
      {active && <canvas key={retryKey} />}
    </div>
  )
}
