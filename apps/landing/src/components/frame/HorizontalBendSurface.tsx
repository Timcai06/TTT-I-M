import { useEffect, useState, type RefObject } from 'react'
import { createHorizontalBend, type HorizontalBendHandle } from '../../lib/canvas-ui/horizontalBend'
import { isMobileExperience } from '../../lib/device'
import { prefersReducedMotion } from '../../lib/motion'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../../lib/webgl/contextRegistry'
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
  const disabled = prefersReducedMotion() || isMobileExperience()

  useEffect(() => {
    const host = ref.current
    const captureEl = capture.current
    const viewportEl = viewport.current
    if (!mounted || !visible || !host || !captureEl || !viewportEl) return
    if (disabled || !canAcquireOptionalSurface()) return
    const canvas = host.querySelector('canvas')
    if (!canvas) return

    let handle: HorizontalBendHandle | null = null
    let released = false
    const resize = () => handle?.resize()
    const cleanup = () => {
      if (released) return
      released = true
      window.removeEventListener('resize', resize)
      if (handleRef.current === handle) handleRef.current = null
      handle?.destroy()
      releaseContext()
      setEnhanced(false)
      onEnhancedChange(false)
    }

    acquireContext()
    handle = createHorizontalBend({
      canvas,
      capture: captureEl,
      viewport: viewportEl,
      onFirstFrame: () => {
        setEnhanced(true)
        onEnhancedChange(true)
      },
      onFailure: cleanup,
    })
    if (!handle) {
      cleanup()
      return
    }
    handleRef.current = handle
    window.addEventListener('resize', resize)
    return cleanup
  }, [capture, disabled, handleRef, mounted, onEnhancedChange, ref, viewport, visible])

  if (disabled) return null

  return (
    <div
      className={`horizontal-bend${enhanced ? ' is-enhanced' : ''}`}
      data-horizontal-bend={enhanced ? 'active' : 'fallback'}
      ref={ref}
      aria-hidden="true"
    >
      {mounted && visible && <canvas />}
    </div>
  )
}
