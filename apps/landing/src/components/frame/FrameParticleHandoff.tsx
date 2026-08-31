import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { archiveOutro, archiveThemes } from '../../content'
import { ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  canRenderFrameParticles,
  createFrameParticles,
  type FrameParticleHandle,
} from '../../lib/canvas-ui/particleScroll'
import { isMobileExperience } from '../../lib/device'
import { prefersReducedMotion } from '../../lib/motion'
import { acquireContext, canAcquireOptionalSurface, releaseContext } from '../../lib/webgl/contextRegistry'
import { useGLSurface } from '../../lib/webgl/useGLSurface'
import { markDrawableSubtree } from '../../lib/canvas-ui/runtime'
import { requestScrollRefresh } from '../../lib/scroll/requestRefresh'

type ArchiveImage = (typeof archiveThemes)[number]['clusters'][number]['slots'][number]['image']

function ParticleDocument({
  images,
  capture = false,
  onMediaReady,
}: {
  images: ArchiveImage[]
  capture?: boolean
  onMediaReady?: () => void
}) {
  return (
    <div className="frame-particle-document">
      <header className="frame-particle-document__opening">
        <div className="frame-particle-document__index" aria-hidden="true">
          <span>FRAME / 03</span>
          <span>ARCHIVE → SYSTEM</span>
        </div>
        <p className="frame-panel__eyebrow">{archiveOutro.eyebrow}</p>
        <h2>{archiveOutro.title}</h2>
        <p className="frame-panel__body">{archiveOutro.body}</p>
      </header>

      <section className="frame-particle-document__contact" aria-label="Archive contact sheet">
        {images.map((image, index) => (
          <figure key={`${capture ? 'capture' : 'fallback'}-${image.src}`}>
            <img
              src={image.src}
              alt={capture ? '' : image.title}
              loading={capture ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={onMediaReady}
              style={{ '--particle-image-i': index } as CSSProperties}
            />
            <figcaption>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{image.title}</span>
            </figcaption>
          </figure>
        ))}
      </section>

      <footer className="frame-particle-document__handoff">
        <p>What the frame notices</p>
        <strong>the stack has to make repeatable.</strong>
        <span aria-hidden="true">SCROLL / REASSEMBLE / CONTINUE</span>
      </footer>
    </div>
  )
}

export default function FrameParticleHandoff() {
  const root = useRef<HTMLElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<HTMLCanvasElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<FrameParticleHandle | null>(null)
  const latestState = useRef({ progress: 0, delta: 0 })
  const [enhanced, setEnhanced] = useState(false)
  const [completed, setCompleted] = useState(false)
  const { ref: surfaceRef, visible, mounted } = useGLSurface({
    renderMargin: '0px',
    mountMargin: '0px',
    initiallyMounted: false,
  })
  const disabled = prefersReducedMotion() || isMobileExperience()
  const supported = canRenderFrameParticles()

  const images = useMemo(() => {
    const lastTheme = archiveThemes[archiveThemes.length - 1]
    return lastTheme?.clusters
      .flatMap((cluster) => cluster.slots.map((slot) => slot.image))
      .slice(-4) ?? []
  }, [])

  useEffect(() => {
    const capture = captureRef.current
    const source = sourceRef.current
    const output = outputRef.current
    if (!mounted || !visible || completed || !capture || !source || !output) return
    if (disabled || !supported || !canAcquireOptionalSurface()) return

    const unmarkDrawable = markDrawableSubtree(source, capture)
    let handle: FrameParticleHandle | null = null
    let released = false
    const captureTimer = window.setTimeout(() => cleanup(), 2_500)
    const cleanup = () => {
      if (released) return
      released = true
      window.clearTimeout(captureTimer)
      unmarkDrawable()
      handle?.destroy()
      if (handleRef.current === handle) handleRef.current = null
      releaseContext()
      setEnhanced(false)
    }

    acquireContext()
    handle = createFrameParticles({
      source,
      content: capture,
      output,
      onReady: () => {
        window.clearTimeout(captureTimer)
        setEnhanced(true)
        handle?.setScrollState(latestState.current)
      },
      onFailure: cleanup,
    })
    if (!handle) {
      cleanup()
      return
    }

    handleRef.current = handle
    handle.setScrollState(latestState.current)
    const resize = () => handle?.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cleanup()
    }
  }, [completed, disabled, mounted, supported, visible])

  useGSAP(() => {
    const section = root.current
    if (!section || disabled) return

    let lastScrollY = window.scrollY
    const sync = (progress: number) => {
      const scrollY = window.scrollY
      const state = { progress, delta: scrollY - lastScrollY }
      lastScrollY = scrollY
      latestState.current = state
      section.style.setProperty('--particle-progress', progress.toFixed(4))
      section.style.setProperty('--particle-scroll-y', `${(-130 * progress).toFixed(2)}svh`)
      handleRef.current?.setScrollState(state)
    }

    sync(0)
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      refreshPriority: -100,
      invalidateOnRefresh: true,
      onUpdate: (self) => sync(self.progress),
      onLeave: () => {
        sync(1)
        setCompleted(true)
      },
      onEnterBack: (self) => {
        setCompleted(false)
        sync(self.progress)
      },
      onLeaveBack: () => sync(0),
    })
    requestScrollRefresh()
    return () => {
      trigger.kill()
      section.style.removeProperty('--particle-progress')
      section.style.removeProperty('--particle-scroll-y')
    }
  }, { scope: root, dependencies: [disabled], revertOnUpdate: true })

  const requestCapture = () => {
    sourceRef.current?.requestPaint?.()
    handleRef.current?.invalidate()
  }

  return (
    <section
      className={`frame-particle-handoff${enhanced ? ' is-enhanced' : ''}`}
      data-frame-particles={enhanced ? 'active' : 'fallback'}
      ref={root}
      aria-label="Frame to Stack transition"
    >
      <div className="frame-particle-handoff__sticky">
        <div className="frame-particle-handoff__fallback">
          <ParticleDocument images={images} />
        </div>

        {!disabled && supported && (
          <div className="frame-particle-handoff__surface" ref={surfaceRef} aria-hidden="true">
            {mounted && visible && !completed && (
              <>
                <canvas className="frame-particle-handoff__source" ref={sourceRef}>
                  <div
                    className="frame-particle-handoff__scroll"
                    data-frame-particle-capture
                    ref={captureRef}
                    aria-hidden="true"
                    inert
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      overflow: 'auto',
                    }}
                  >
                    <ParticleDocument images={images} capture onMediaReady={requestCapture} />
                  </div>
                </canvas>
                <canvas className="frame-particle-handoff__output" ref={outputRef} />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
