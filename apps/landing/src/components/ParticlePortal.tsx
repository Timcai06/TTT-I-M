import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { isMobileExperience } from '../lib/device'
import { prefersReducedMotion } from '../lib/motion'
import {
  onParticlePortalRequest,
  type ParticlePortalRequest,
} from '../lib/particlePortal'
import {
  canRenderParticlePortal,
  createParticlePortal,
  measureImagePlacement,
  type ParticlePortalHandle,
} from '../lib/canvas-ui/particlePortal'
import {
  acquireContext,
  canAcquireOptionalSurface,
  releaseContext,
} from '../lib/webgl/contextRegistry'

function nextFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
}

async function waitForTarget(request: ParticlePortalRequest): Promise<HTMLImageElement | null> {
  for (let frame = 0; frame < 36; frame += 1) {
    await nextFrame()
    const target = request.resolveTarget()
    if (!target) continue
    if (!target.complete) {
      void target.decode().catch(() => undefined)
      continue
    }
    if (measureImagePlacement(target)) return target
  }
  return null
}

/**
 * One transient, full-viewport material transition for Frame navigation and
 * Work case studies. It never owns layout: source and target remain real DOM,
 * and are hidden only after the first successful WebGL frame.
 */
export default function ParticlePortal() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const handleRef = useRef<ParticlePortalHandle | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const busyRef = useRef(false)
  const queuedRef = useRef<ParticlePortalRequest | null>(null)

  useGSAP((_, contextSafe) => {
    if (!contextSafe) return
    const runRequest = contextSafe(async (request: ParticlePortalRequest) => {
      if (busyRef.current) {
        queuedRef.current = request
        timelineRef.current?.timeScale(3.4)
        return
      }

      const runQueued = () => {
        const queued = queuedRef.current
        queuedRef.current = null
        if (queued) window.requestAnimationFrame(() => { void runRequest(queued) })
      }

      let committed = false
      const commit = async () => {
        if (committed) return
        committed = true
        await request.commit()
      }

      const runSemanticFallback = async () => {
        busyRef.current = true
        try {
          await commit()
          request.onComplete?.()
        } finally {
          busyRef.current = false
          runQueued()
        }
      }

      busyRef.current = true
      const source = request.source
      if (
        prefersReducedMotion()
        || isMobileExperience()
        || !source.isConnected
        || !source.complete
        || !canRenderParticlePortal()
        || !canAcquireOptionalSurface()
      ) {
        await runSemanticFallback()
        return
      }

      const root = rootRef.current
      const canvas = canvasRef.current
      const veil = veilRef.current
      const sourcePlacement = measureImagePlacement(source)
      if (!root || !canvas || !veil || !sourcePlacement) {
        await runSemanticFallback()
        return
      }

      let contextRegistered = false
      const sourceVisibility = source.style.visibility
      let targetVisibility = ''
      let target: HTMLImageElement | null = null
      let failed = false
      const progress = { value: 0 }

      const cleanup = () => {
        timelineRef.current?.kill()
        timelineRef.current = null
        handleRef.current?.destroy()
        handleRef.current = null
        if (contextRegistered) {
          releaseContext()
          contextRegistered = false
        }
        source.style.visibility = sourceVisibility
        request.sourceContainer?.classList.remove('is-particle-departing')
        if (target) {
          target.style.visibility = targetVisibility
          target.closest<HTMLElement>('[data-particle-portal-target]')?.classList.remove('is-particle-arriving')
        }
        delete document.body.dataset.particlePortal
        gsap.set(root, { autoAlpha: 0, clearProps: 'backgroundColor' })
        gsap.set(veil, { opacity: 0 })
        busyRef.current = false
        cleanupRef.current = null
      }
      cleanupRef.current = cleanup

      acquireContext()
      contextRegistered = true
      const handle = createParticlePortal({
        canvas,
        image: source,
        mode: request.mode,
        source: sourcePlacement,
        target: sourcePlacement,
        onContextLost: () => {
          failed = true
          timelineRef.current?.progress(1)
        },
      })
      if (!handle) {
        cleanup()
        await runSemanticFallback()
        return
      }

      handleRef.current = handle
      handle.setProgress(0)
      document.body.dataset.particlePortal = request.mode
      request.sourceContainer?.classList.add('is-particle-departing')
      gsap.set(root, { autoAlpha: 1 })
      gsap.set(veil, { opacity: 0 })
      gsap.set(canvas, { opacity: 1 })

      // The live image disappears only after the texture has been uploaded and
      // the first particle frame exists. A failed context therefore never
      // creates a blank source.
      source.style.visibility = 'hidden'

      const speedUpOnIntent = () => {
        timelineRef.current?.timeScale(2.6)
      }
      const pauseWhenHidden = () => {
        if (document.hidden) timelineRef.current?.pause()
        else timelineRef.current?.resume()
      }
      const resize = () => {
        handle.resize()
      }
      window.addEventListener('wheel', speedUpOnIntent, { passive: true })
      window.addEventListener('touchmove', speedUpOnIntent, { passive: true })
      window.addEventListener('keydown', speedUpOnIntent)
      window.addEventListener('resize', resize, { passive: true })
      document.addEventListener('visibilitychange', pauseWhenHidden)

      try {
        await new Promise<void>((resolve) => {
          const timeline = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            onComplete: resolve,
          })
          timelineRef.current = timeline
          timeline
            .addLabel('detach', 0)
            .to(veil, {
              opacity: request.mode.startsWith('frame-') ? 0.84 : 0.28,
              duration: 0.34,
            }, 'detach')
            .to(progress, {
              value: 0.4,
              duration: request.mode.startsWith('frame-') ? 0.39 : 0.32,
              onUpdate: () => handle.setProgress(progress.value),
            }, 'detach')
        })

        await commit()
        if (failed) return

        target = await waitForTarget(request)
        const targetPlacement = target ? measureImagePlacement(target) : null
        if (!target || !targetPlacement) {
          // The semantic action has already landed. Finish transparently rather
          // than holding a dead cloud while a lazy target or image fails.
          handle.setProgress(1)
          return
        }

        handle.setTarget(targetPlacement)
        targetVisibility = target.style.visibility
        target.style.visibility = 'hidden'
        target.closest<HTMLElement>('[data-particle-portal-target]')?.classList.add('is-particle-arriving')

        await new Promise<void>((resolve) => {
          const timeline = gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: resolve,
          })
          timelineRef.current = timeline
          timeline
            .addLabel('assemble', 0)
            .to(progress, {
              value: 1,
              duration: request.mode.startsWith('case-') ? 0.54 : 0.64,
              onUpdate: () => handle.setProgress(progress.value),
            }, 'assemble')
            .to(veil, { opacity: 0, duration: 0.42, ease: 'power2.out' }, 'assemble+=0.22')
            .call(() => {
              if (target) target.style.visibility = targetVisibility
            }, [], 'assemble+=0.46')
            .to(canvas, { opacity: 0, duration: 0.14, ease: 'power1.out' }, 'assemble+=0.5')
        })
      } finally {
        window.removeEventListener('wheel', speedUpOnIntent)
        window.removeEventListener('touchmove', speedUpOnIntent)
        window.removeEventListener('keydown', speedUpOnIntent)
        window.removeEventListener('resize', resize)
        document.removeEventListener('visibilitychange', pauseWhenHidden)
        cleanup()
        request.onComplete?.()
        runQueued()
      }
    })

    const unsubscribe = onParticlePortalRequest((request) => {
      void runRequest(request)
    })

    return () => {
      unsubscribe()
      queuedRef.current = null
      cleanupRef.current?.()
    }
  }, { scope: rootRef })

  return (
    <div className="particle-portal" ref={rootRef} aria-hidden="true">
      <div className="particle-portal__veil" ref={veilRef} />
      <canvas className="particle-portal__canvas" ref={canvasRef} />
    </div>
  )
}
