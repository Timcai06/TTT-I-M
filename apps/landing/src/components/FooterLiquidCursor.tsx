import { useEffect, useRef, type RefObject } from 'react'
import { createLiquidField, type LiquidFieldHandle } from '../lib/canvas-ui/liquidField'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from '../lib/webgl/contextRegistry'
import {
  canRunLocalEffect,
  observeLocalEffectEligibility,
} from './effects/localEffectEligibility'

export interface FooterLiquidController {
  setActive(active: boolean): void
  clear(): void
  destroy(): void
}

export default function FooterLiquidCursor({
  controllerRef,
}: {
  controllerRef: RefObject<FooterLiquidController | null>
}) {
  const host = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const disabled = useMobileExperience() || reducedMotion

  useEffect(() => {
    const hostEl = host.current
    if (!hostEl || disabled) return
    let canvas: HTMLCanvasElement | null = null
    let field: LiquidFieldHandle | null = null
    let contextLease: ContextLease | null = null
    const owner = hostEl.closest<HTMLElement>('#contact')
    if (!owner) return
    let requested = false
    let pointerInside = false
    let lastX = 0
    let lastY = 0
    let hasPointer = false
    let releasing = false
    let waitingForContext = false
    let failedForActivation = false
    let stopWaitingForContext = () => {}

    const onContextLost = (event: Event) => {
      event.preventDefault()
      failedForActivation = true
      release()
    }
    const release = () => {
      if (releasing) return
      releasing = true
      stopWaitingForContext()
      stopWaitingForContext = () => {}
      waitingForContext = false
      const currentField = field
      const currentCanvas = canvas
      field = null
      canvas = null
      currentCanvas?.removeEventListener('webglcontextlost', onContextLost)
      try {
        currentField?.destroy()
      } catch {
        // Context-loss cleanup is best-effort; the semantic Footer remains live.
      } finally {
        contextLease?.release()
        contextLease = null
        hostEl.dataset.liquidState = 'idle'
        hostEl.classList.remove('is-active')
        currentCanvas?.remove()
        releasing = false
      }
    }
    const ensure = () => {
      if (
        field
        || waitingForContext
        || failedForActivation
        || !requested
        || !pointerInside
        || !canRunLocalEffect(owner, 'contact')
      ) return field
      waitingForContext = true
      hostEl.dataset.liquidState = 'waiting'
      stopWaitingForContext = acquireOptionalContextWhenAvailable('footer-liquid', (lease) => {
        waitingForContext = false
        if (!requested || !pointerInside || !canRunLocalEffect(owner, 'contact')) {
          lease.release()
          hostEl.dataset.liquidState = 'idle'
          return
        }
        contextLease = lease
        canvas = document.createElement('canvas')
        canvas.addEventListener('webglcontextlost', onContextLost)
        hostEl.append(canvas)
        try {
          field = createLiquidField(canvas)
        } catch {
          failedForActivation = true
          release()
          return
        }
        if (!field) {
          failedForActivation = true
          release()
          return
        }
        hostEl.dataset.liquidState = 'live'
        try {
          field.setActive(true)
          hostEl.classList.add('is-active')
        } catch {
          failedForActivation = true
          release()
        }
      })
      return field
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!requested || !pointerInside || !canRunLocalEffect(owner, 'contact')) return
      const dx = hasPointer ? event.clientX - lastX : 0
      const dy = hasPointer ? event.clientY - lastY : 0
      lastX = event.clientX
      lastY = event.clientY
      hasPointer = true
      const current = ensure()
      if (!current) return
      try {
        current.splat(event.clientX, event.clientY, dx, dy)
      } catch {
        failedForActivation = true
        release()
      }
    }
    const sync = () => {
      const running = requested && pointerInside && canRunLocalEffect(owner, 'contact')
      if (!running) {
        hostEl.classList.remove('is-active')
        hasPointer = false
        release()
        return
      }
      ensure()
    }
    const onPointerEnter = () => {
      pointerInside = true
      failedForActivation = false
      sync()
    }
    const onPointerLeave = () => {
      pointerInside = false
      failedForActivation = false
      sync()
    }
    owner.addEventListener('pointerenter', onPointerEnter, { passive: true })
    owner.addEventListener('pointermove', onPointerMove, { passive: true })
    owner.addEventListener('pointerleave', onPointerLeave, { passive: true })
    const stopObservingEligibility = observeLocalEffectEligibility(owner, 'contact', sync)

    const controller: FooterLiquidController = {
      setActive(next) {
        requested = next
        if (!next) failedForActivation = false
        sync()
      },
      clear() {
        hasPointer = false
        failedForActivation = false
        release()
      },
      destroy() {
        requested = false
        pointerInside = false
        failedForActivation = false
        release()
      },
    }
    controllerRef.current = controller

    return () => {
      controllerRef.current = null
      stopObservingEligibility()
      owner.removeEventListener('pointerenter', onPointerEnter)
      owner.removeEventListener('pointermove', onPointerMove)
      owner.removeEventListener('pointerleave', onPointerLeave)
      release()
    }
  }, [controllerRef, disabled])

  if (disabled) return null

  return (
    <div className="footer-liquid" ref={host} data-liquid-state="idle" aria-hidden="true" />
  )
}
