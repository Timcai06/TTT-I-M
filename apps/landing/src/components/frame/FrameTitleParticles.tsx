import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  canRenderFrameParticles,
  createFrameParticles,
  type FrameParticleHandle,
} from '../../lib/canvas-ui/particleScroll'
import { createLocalEffectCommit } from '../../lib/canvas-ui/localEffectControl'
import { markDrawableSubtree } from '../../lib/canvas-ui/runtime'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from '../../lib/webgl/contextRegistry'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import {
  canRunLocalEffect,
  observeLocalEffectEligibility,
} from '../effects/localEffectEligibility'
import {
  canPromoteFrameTitleCapture,
  cloneStaticFrameTitleCapture,
  frameTitleCaptureHasVisiblePixels,
} from './frameTitleCapture'

export default function FrameTitleParticles({
  targetRef,
}: {
  targetRef: RefObject<HTMLElement | null>
}) {
  const { ref: surfaceRef, visible, mounted } = useGLSurface({
    renderMargin: '20% 0px',
    mountMargin: '80% 0px',
    initiallyMounted: false,
  })
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [enhanced, setEnhanced] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<HTMLCanvasElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  const mobileExperience = useMobileExperience()
  const supported = canRenderFrameParticles()
  const [controller] = useState(() => (
    createLocalEffectCommit<FrameParticleHandle>({
      apply: (handle, state) => handle.setScrollState(state),
      destroy: (handle) => handle.destroy(),
    })
  ))

  const bindHost = useCallback((element: HTMLDivElement | null) => {
    surfaceRef.current = element
    hostRef.current = element
    setHost(element)
  }, [surfaceRef])
  const eligibilityTarget = targetRef.current
  const subscribe = useCallback((notify: () => void) => (
    observeLocalEffectEligibility(eligibilityTarget, 'frame', () => notify())
  ), [eligibilityTarget])
  const getSnapshot = useCallback(
    () => canRunLocalEffect(eligibilityTarget, 'frame'),
    [eligibilityTarget],
  )
  const eligible = useSyncExternalStore(subscribe, getSnapshot, () => false)

  useGSAP(() => {
    const target = targetRef.current
    const panel = target?.closest<HTMLElement>('.archive-frame-text')
    if (!target || !panel) return
    let lastScrollY = window.scrollY
    const sync = (progress: number) => {
      const scrollY = window.scrollY
      controller.update({ progress, delta: scrollY - lastScrollY })
      lastScrollY = scrollY
      panel.style.setProperty('--frame-title-particle-progress', progress.toFixed(4))
    }
    const trigger = ScrollTrigger.create({
      trigger: panel,
      start: 'top bottom',
      end: 'bottom top',
      onRefresh: (self) => sync(self.progress),
      onUpdate: (self) => sync(self.progress),
    })
    sync(trigger.progress)
    return () => {
      trigger.kill()
      panel.style.removeProperty('--frame-title-particle-progress')
    }
  }, { dependencies: [controller, targetRef] })

  useEffect(() => {
    const hostEl = hostRef.current
    const target = targetRef.current
    const source = sourceRef.current
    const output = outputRef.current
    if (
      !hostEl
      || !target
      || !source
      || !output
      || !mounted
      || !visible
      || !eligible
      || !supported
      || reducedMotion
      || mobileExperience
    ) return

    const capture = cloneStaticFrameTitleCapture(target)
    source.replaceChildren(capture)
    const unmarkDrawable = markDrawableSubtree(source, capture)
    const generation = controller.activate()
    let released = false
    let contextLease: ContextLease | null = null
    let startupTimer = 0
    let stopWaiting = () => {}
    const syncGeometry = () => {
      const panel = target.closest<HTMLElement>('.archive-frame-text')
      if (!panel) return
      const panelRect = panel.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      hostEl.style.left = `${targetRect.left - panelRect.left}px`
      hostEl.style.top = `${targetRect.top - panelRect.top}px`
      hostEl.style.right = 'auto'
      hostEl.style.bottom = 'auto'
      hostEl.style.width = `${targetRect.width}px`
      hostEl.style.height = `${targetRect.height}px`
    }
    const cleanup = () => {
      if (released) return
      released = true
      window.clearTimeout(startupTimer)
      stopWaiting()
      window.removeEventListener('resize', syncGeometry)
      controller.deactivate()
      unmarkDrawable()
      source.replaceChildren()
      contextLease?.release()
      contextLease = null
      setEnhanced(false)
    }
    syncGeometry()
    window.addEventListener('resize', syncGeometry, { passive: true })
    stopWaiting = acquireOptionalContextWhenAvailable('frame-title-particles', (lease) => {
      if (released || !canRunLocalEffect(target, 'frame')) {
        lease.release()
        return
      }
      contextLease = lease
      startupTimer = window.setTimeout(cleanup, 4_000)
      let accepted = false
      let ready = false
      const promoteIfReady = () => {
        if (!canPromoteFrameTitleCapture({
          handleAccepted: accepted,
          pixelsReady: ready,
          live: !released && canRunLocalEffect(target, 'frame'),
        })) return
        window.clearTimeout(startupTimer)
        setEnhanced(true)
      }
      const created = createFrameParticles({
        source,
        content: capture,
        output,
        controlled: true,
        hasVisibleCapture: () => frameTitleCaptureHasVisiblePixels(source),
        onReady: () => {
          ready = true
          if (released || !canRunLocalEffect(target, 'frame')) {
            cleanup()
            return
          }
          promoteIfReady()
        },
        onFailure: cleanup,
      })
      if (!created || !controller.accept(generation, created)) {
        cleanup()
        return
      }
      accepted = true
      promoteIfReady()
    })
    return cleanup
  }, [
    controller,
    eligible,
    host,
    mobileExperience,
    mounted,
    reducedMotion,
    supported,
    targetRef,
    visible,
  ])

  if (reducedMotion || mobileExperience || !supported) return null
  return (
    <div
      className={`frame-title-particles${enhanced ? ' is-enhanced' : ''}`}
      data-frame-title-particles={enhanced ? 'active' : 'fallback'}
      ref={bindHost}
      aria-hidden="true"
    >
      {mounted ? (
        <>
          <canvas className="frame-title-particles__source" ref={sourceRef} />
          <canvas className="frame-title-particles__output" ref={outputRef} />
        </>
      ) : null}
    </div>
  )
}
