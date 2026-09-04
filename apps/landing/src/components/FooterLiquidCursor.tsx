import { useEffect, useRef, type RefObject } from 'react'
import { createLiquidField, type LiquidFieldHandle } from '../lib/canvas-ui/liquidField'
import { useMobileExperience } from '../lib/device'
import { useReducedMotion } from '../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from '../lib/webgl/contextRegistry'

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
    let active = false
    let lastX = 0
    let lastY = 0
    let hasPointer = false
    let pointerListening = false
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
        currentCanvas?.remove()
        releasing = false
      }
    }
    const ensure = () => {
      if (field || waitingForContext || failedForActivation || !active || document.hidden) return field
      waitingForContext = true
      hostEl.dataset.liquidState = 'waiting'
      stopWaitingForContext = acquireOptionalContextWhenAvailable('footer-liquid', (lease) => {
        waitingForContext = false
        if (!active || document.hidden) {
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
        } catch {
          failedForActivation = true
          release()
        }
      })
      return field
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!active) return
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
    const setPointerTracking = (next: boolean) => {
      if (next === pointerListening) return
      pointerListening = next
      if (next) window.addEventListener('pointermove', onPointerMove, { passive: true })
      else window.removeEventListener('pointermove', onPointerMove)
    }
    const onVisibility = () => {
      if (document.hidden) {
        setPointerTracking(false)
        release()
      } else if (active) {
        setPointerTracking(true)
        const current = ensure()
        if (!current) return
        try {
          current.setActive(true)
        } catch {
          failedForActivation = true
          release()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const controller: FooterLiquidController = {
      setActive(next) {
        active = next
        hostEl.classList.toggle('is-active', next)
        setPointerTracking(next)
        if (next) {
          const current = ensure()
          if (current) {
            try {
              current.setActive(true)
            } catch {
              failedForActivation = true
              release()
            }
          }
        }
        else {
          hasPointer = false
          failedForActivation = false
          release()
        }
      },
      clear() {
        try {
          field?.clear()
        } catch {
          failedForActivation = true
          release()
        }
      },
      destroy() {
        active = false
        failedForActivation = false
        setPointerTracking(false)
        release()
      },
    }
    controllerRef.current = controller

    return () => {
      controllerRef.current = null
      setPointerTracking(false)
      document.removeEventListener('visibilitychange', onVisibility)
      release()
    }
  }, [controllerRef, disabled])

  if (disabled) return null

  return (
    <div className="footer-liquid" ref={host} data-liquid-state="idle" aria-hidden="true" />
  )
}
