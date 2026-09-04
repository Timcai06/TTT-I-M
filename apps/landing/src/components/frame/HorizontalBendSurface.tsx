import { useEffect, useState, type RefObject } from 'react'
import { createHorizontalBend, type HorizontalBendHandle } from '../../lib/canvas-ui/horizontalBend'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from '../../lib/webgl/contextRegistry'
import { useGLSurface } from '../../lib/webgl/useGLSurface'

export default function HorizontalBendSurface({
  capture,
  viewport,
  handleRef,
  onEnhancedChange,
}: {
  capture: RefObject<HTMLDivElement | null>
  viewport: RefObject<HTMLDivElement | null>
  handleRef: RefObject<HorizontalBendHandle | null>
  onEnhancedChange: (enhanced: boolean) => void
}) {
  const { ref, visible, mounted } = useGLSurface({
    renderMargin: '0px',
    mountMargin: '20% 0px',
    initiallyMounted: false,
  })
  const [enhanced, setEnhanced] = useState(false)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()
  const disabled = reducedMotion || mobileExperience

  useEffect(() => {
    const host = ref.current
    const captureEl = capture.current
    const viewportEl = viewport.current
    if (!mounted || !visible || failed || !host || !captureEl || !viewportEl) return
    if (disabled) return
    const canvas = host.querySelector('canvas')
    if (!canvas) return

    let handle: HorizontalBendHandle | null = null
    let contextLease: ContextLease | null = null
    let stopWaiting = () => {}
    let released = false
    const resize = () => handle?.resize()
    const cleanup = () => {
      if (released) return
      released = true
      stopWaiting()
      window.removeEventListener('resize', resize)
      if (handleRef.current === handle) handleRef.current = null
      try {
        handle?.destroy()
      } catch {
        // Continue through lease and DOM fallback restoration on driver errors.
      } finally {
        contextLease?.release()
        contextLease = null
        setEnhanced(false)
        onEnhancedChange(false)
      }
    }
    const fail = () => {
      cleanup()
      setFailed(true)
    }

    stopWaiting = acquireOptionalContextWhenAvailable('horizontal-bend', (lease) => {
      if (released) {
        lease.release()
        return
      }
      contextLease = lease
      let created: HorizontalBendHandle | null
      try {
        created = createHorizontalBend({
          canvas,
          capture: captureEl,
          viewport: viewportEl,
          onFirstFrame: () => {
            setEnhanced(true)
            onEnhancedChange(true)
          },
          onFailure: fail,
        })
      } catch {
        fail()
        return
      }
      if (released) {
        created?.destroy()
        return
      }
      if (!created) {
        cleanup()
        return
      }
      handle = created
      handleRef.current = created
      window.addEventListener('resize', resize)
    })
    return cleanup
  }, [capture, disabled, failed, handleRef, mounted, onEnhancedChange, ref, viewport, visible])

  useEffect(() => {
    if (visible || !failed) return
    const timer = window.setTimeout(() => setFailed(false), 0)
    return () => window.clearTimeout(timer)
  }, [failed, visible])

  if (disabled) return null

  return (
    <div
      className={`horizontal-bend${enhanced ? ' is-enhanced' : ''}`}
      data-horizontal-bend={enhanced ? 'active' : 'fallback'}
      ref={ref}
      aria-hidden="true"
    >
      {mounted && visible && !failed && <canvas />}
    </div>
  )
}
