import { useEffect, useRef, useState, type RefObject } from 'react'
import { createHorizontalBend, type HorizontalBendHandle } from '../../lib/canvas-ui/horizontalBend'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import { acquireBendCanvas } from '../../lib/canvas-ui/bendCanvasPool'
import type { HorizontalBendState } from '../../lib/canvas-ui/horizontalBendMath'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { supportsHtmlInCanvas } from '../../lib/canvas-ui/runtime'

export default function HorizontalBendSurface({
  capture,
  viewport,
  handleRef,
  scrollState,
  onEnhancedChange,
}: {
  capture: RefObject<HTMLDivElement | null>
  viewport: RefObject<HTMLDivElement | null>
  handleRef: RefObject<HorizontalBendHandle | null>
  scrollState: RefObject<HorizontalBendState>
  onEnhancedChange: (enhanced: boolean) => void
}) {
  const { ref, visible, mounted } = useGLSurface({
    renderMargin: '0px',
    mountMargin: '100% 0px',
    initiallyMounted: false,
  })
  const visibleRef = useRef(visible)
  useEffect(() => { visibleRef.current = visible }, [visible])
  const [enhanced, setEnhanced] = useState(false)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()
  const disabled = reducedMotion || mobileExperience

  useEffect(() => {
    const host = ref.current
    const captureEl = capture.current
    const viewportEl = viewport.current
    if (!mounted || failed || !host || !captureEl || !viewportEl) return
    if (disabled || !supportsHtmlInCanvas()) return

    let handle: HorizontalBendHandle | null = null
    let releaseCanvas: ((discard?: boolean) => void) | null = null
    let broken = false
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
        releaseCanvas?.(broken)
        releaseCanvas = null
        setEnhanced(false)
        onEnhancedChange(false)
      }
    }
    const fail = () => {
      broken = true
      cleanup()
      setFailed(true)
    }

    stopWaiting = acquireBendCanvas((canvas, release) => {
      if (released) {
        release()
        return
      }
      releaseCanvas = release
      host.append(canvas)
      let created: HorizontalBendHandle | null
      try {
        created = createHorizontalBend({
          canvas,
          capture: captureEl,
          viewport: viewportEl,
          initialState: scrollState.current,
          reusable: true,
          onFirstFrame: () => {
            if (released) return
            if (!visibleRef.current) handle?.pause()
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
        broken = true
        cleanup()
        return
      }
      handle = created
      handleRef.current = created
      window.addEventListener('resize', resize)
    })
    return cleanup
  }, [capture, disabled, failed, handleRef, mounted, onEnhancedChange, ref, scrollState, viewport])

  useEffect(() => {
    if (visible) handleRef.current?.resume()
    else if (enhanced) handleRef.current?.pause()
  }, [enhanced, handleRef, visible])

  useEffect(() => {
    // Failed warmups retry only after leaving the preparation range. Retrying
    // merely because they are offscreen would loop before the user reaches them.
    if (mounted || !failed) return
    const timer = window.setTimeout(() => setFailed(false), 0)
    return () => window.clearTimeout(timer)
  }, [failed, mounted])

  if (disabled) return null

  return (
    <div
      className={`horizontal-bend${enhanced ? ' is-enhanced' : ''}`}
      data-horizontal-bend={enhanced ? 'active' : 'fallback'}
      ref={ref}
      aria-hidden="true"
    />
  )
}
