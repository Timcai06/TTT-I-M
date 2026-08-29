import { useEffect, useRef, type RefObject } from 'react'
import { createLiquidField, type LiquidFieldHandle } from '../lib/canvas-ui/liquidField'
import { isTouchDevice } from '../lib/device'
import { prefersReducedMotion } from '../lib/motion'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../lib/webgl/contextRegistry'

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
  const disabled = isTouchDevice() || prefersReducedMotion()

  useEffect(() => {
    const hostEl = host.current
    if (!hostEl || disabled) return
    let canvas: HTMLCanvasElement | null = null
    let field: LiquidFieldHandle | null = null
    let registered = false
    let active = false
    let lastX = 0
    let lastY = 0
    let hasPointer = false
    let pointerListening = false

    const release = () => {
      field?.destroy()
      field = null
      if (registered) releaseContext()
      registered = false
      hostEl.dataset.liquidState = 'idle'
      canvas?.remove()
      canvas = null
    }
    const ensure = () => {
      if (field) return field
      if (!canAcquireOptionalSurface()) return null
      canvas = document.createElement('canvas')
      hostEl.append(canvas)
      acquireContext()
      registered = true
      field = createLiquidField(canvas)
      if (!field) {
        release()
        return null
      }
      hostEl.dataset.liquidState = 'live'
      if (active) field.setActive(true)
      return field
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!active) return
      const dx = hasPointer ? event.clientX - lastX : 0
      const dy = hasPointer ? event.clientY - lastY : 0
      lastX = event.clientX
      lastY = event.clientY
      hasPointer = true
      ensure()?.splat(event.clientX, event.clientY, dx, dy)
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
        ensure()?.setActive(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const controller: FooterLiquidController = {
      setActive(next) {
        active = next
        hostEl.classList.toggle('is-active', next)
        setPointerTracking(next)
        if (next) ensure()?.setActive(true)
        else {
          hasPointer = false
          release()
        }
      },
      clear() { field?.clear() },
      destroy() {
        active = false
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
