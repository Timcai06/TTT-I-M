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
  tryAcquireOptionalContext,
} from '../lib/webgl/contextRegistry'

function nextFrame(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)

  return new Promise((resolve) => {
    let settled = false
    const finish = (completed: boolean) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      resolve(completed)
    }
    const frame = window.requestAnimationFrame(() => finish(true))
    const onAbort = () => {
      window.cancelAnimationFrame(frame)
      finish(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
  })
}

async function waitForTarget(
  request: ParticlePortalRequest,
  signal: AbortSignal,
): Promise<HTMLImageElement | null> {
  for (let frame = 0; frame < 36; frame += 1) {
    if (!await nextFrame(signal)) return null
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
  const activeAbortRef = useRef<AbortController | null>(null)
  const busyRef = useRef(false)
  const queuedRef = useRef<ParticlePortalRequest | null>(null)

  useGSAP((_, contextSafe) => {
    if (!contextSafe) return
    let disposed = false
    let queuedFrame = 0
    const runRequest = contextSafe(async (request: ParticlePortalRequest) => {
      if (busyRef.current) {
        queuedRef.current = request
        timelineRef.current?.timeScale(3.4)
        return
      }

      const runQueued = () => {
        const queued = queuedRef.current
        queuedRef.current = null
        if (!queued || disposed) return
        queuedFrame = window.requestAnimationFrame(() => {
          queuedFrame = 0
          if (!disposed) void runRequest(queued)
        })
      }

      let commitPromise: Promise<void> | null = null
      const commit = async () => {
        commitPromise ??= Promise.resolve().then(() => request.commit())
        await commitPromise
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
      ) {
        await runSemanticFallback()
        return
      }

      const root = rootRef.current
      const veil = veilRef.current
      const sourcePlacement = measureImagePlacement(source)
      if (!root || !veil || !sourcePlacement) {
        await runSemanticFallback()
        return
      }

      const contextLease = tryAcquireOptionalContext('particle-portal')
      if (!contextLease) {
        await runSemanticFallback()
        return
      }

      const runController = new AbortController()
      const { signal } = runController
      activeAbortRef.current = runController

      // This is a transient material handoff, not a page-level renderer. Keep
      // the DOM and GPU budget at zero while idle and allocate only for a
      // request that has already passed every capability and placement gate.
      const canvas = document.createElement('canvas')
      canvas.className = 'particle-portal__canvas'
      root.append(canvas)
      canvasRef.current = canvas

      const sourceVisibility = source.style.visibility
      let targetVisibility = ''
      let target: HTMLImageElement | null = null
      let failed = false
      let cleaned = false
      const progress = { value: 0 }

      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        timelineRef.current?.kill()
        timelineRef.current = null
        try {
          handleRef.current?.destroy()
        } catch {
          // DOM restoration and lease release remain mandatory after GL errors.
        }
        handleRef.current = null
        contextLease.release()
        source.style.visibility = sourceVisibility
        request.sourceContainer?.classList.remove('is-particle-departing')
        if (target) {
          target.style.visibility = targetVisibility
          target.closest<HTMLElement>('[data-particle-portal-target]')?.classList.remove('is-particle-arriving')
        }
        delete document.body.dataset.particlePortal
        gsap.set(root, { autoAlpha: 0, clearProps: 'backgroundColor' })
        gsap.set(veil, { opacity: 0 })
        canvas.remove()
        if (canvasRef.current === canvas) canvasRef.current = null
        busyRef.current = false
        cleanupRef.current = null
        if (activeAbortRef.current === runController) activeAbortRef.current = null
      }
      cleanupRef.current = cleanup

      const runTimeline = (
        build: (timeline: gsap.core.Timeline) => void,
        ease = 'power2.inOut',
      ): Promise<boolean> => {
        if (signal.aborted) return Promise.resolve(false)

        return new Promise((resolve) => {
          let settled = false
          const finish = (completed: boolean) => {
            if (settled) return
            settled = true
            signal.removeEventListener('abort', onAbort)
            if (timelineRef.current === timeline) timelineRef.current = null
            resolve(completed)
          }
          const onAbort = () => {
            timeline.kill()
            finish(false)
          }
          const timeline = gsap.timeline({
            defaults: { ease },
            onComplete: () => finish(true),
          })
          timelineRef.current = timeline
          signal.addEventListener('abort', onAbort, { once: true })
          if (signal.aborted) onAbort()
          else build(timeline)
        })
      }

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

      // The particle handoff is enhancement, never the owner of navigation.
      // If a background-tab/ticker stall prevents the detach timeline from
      // completing, land the semantic jump and force the transient surface to
      // its cleanup path instead of leaving the user at the archive index.
      const semanticWatchdog = window.setTimeout(() => {
        if (commitPromise) return
        failed = true
        void commit()
          .catch(() => undefined)
          .finally(() => {
            timelineRef.current?.progress(1)
          })
      }, 1400)

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
        const detached = await runTimeline((timeline) => {
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
        if (!detached || signal.aborted) return

        await commit()
        if (failed || signal.aborted) return

        target = await waitForTarget(request, signal)
        if (signal.aborted) return
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

        await runTimeline((timeline) => {
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
        }, 'power3.inOut')
      } catch (error) {
        if (import.meta.env.DEV && !signal.aborted) {
          console.warn('[particle-portal] transition failed; restored semantic DOM.', error)
        }
      } finally {
        window.clearTimeout(semanticWatchdog)
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
      disposed = true
      unsubscribe()
      queuedRef.current = null
      if (queuedFrame) window.cancelAnimationFrame(queuedFrame)
      activeAbortRef.current?.abort(new Error('Particle Portal detached'))
      cleanupRef.current?.()
    }
  }, { scope: rootRef })

  return (
    <div className="particle-portal" ref={rootRef} aria-hidden="true">
      <div className="particle-portal__veil" ref={veilRef} />
    </div>
  )
}
