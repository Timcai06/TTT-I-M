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
          <figure
            className={`frame-particle-document__figure frame-particle-document__figure--${index === 0 ? 'lead' : index === 1 ? 'support' : 'detail'}`}
            key={`${capture ? 'capture' : 'fallback'}-${image.src}`}
            style={{ '--particle-image-aspect': `${image.width} / ${image.height}` } as CSSProperties}
          >
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
        <p>FRAME / ARCHIVE COMPLETE</p>
        <strong>From observation <em>to system.</em></strong>
        <span aria-hidden="true">NEXT / 03 · STACK</span>
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
  const { ref: surfaceRef, visible, mounted } = useGLSurface({
    renderMargin: '80% 0px',
    mountMargin: '160% 0px',
    initiallyMounted: false,
  })
  const disabled = prefersReducedMotion() || isMobileExperience()
  const supported = canRenderFrameParticles()

  const images = useMemo(() => {
    const lastTheme = archiveThemes[archiveThemes.length - 1]
    return lastTheme?.clusters
      .flatMap((cluster) => cluster.slots.map((slot) => slot.image))
      .slice(-3) ?? []
  }, [])

  useEffect(() => {
    const capture = captureRef.current
    const source = sourceRef.current
    const output = outputRef.current
    if (!mounted || !visible || !capture || !source || !output) return
    if (disabled || !supported || !canAcquireOptionalSurface()) return

    const unmarkDrawable = markDrawableSubtree(source, capture)
    let handle: FrameParticleHandle | null = null
    let released = false
    let acquired = false
    const captureTimer = window.setTimeout(() => cleanup(), 4_000)
    const cleanup = () => {
      if (released) return
      released = true
      window.clearTimeout(captureTimer)
      unmarkDrawable()
      handle?.destroy()
      if (handleRef.current === handle) handleRef.current = null
      if (acquired) releaseContext()
      setEnhanced(false)
    }

    const images = [...capture.querySelectorAll('img')]
    void Promise.allSettled(images.map((image) => image.decode())).then(() => {
      if (released) return
      acquireContext()
      acquired = true
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
    })
    const resize = () => handle?.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cleanup()
    }
  }, [disabled, mounted, supported, visible])

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
      section.dataset.handoffPhase = progress < 0.12
        ? 'frame-owned'
        : progress < 0.84
          ? 'canvas-owned'
          : 'stack-preview'
      handleRef.current?.setScrollState(state)
    }

    sync(0)
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.24,
      refreshPriority: -100,
      invalidateOnRefresh: true,
      onUpdate: (self) => sync(self.progress),
      onLeave: () => sync(1),
      onEnterBack: (self) => sync(self.progress),
      onLeaveBack: () => sync(0),
    })
    return () => {
      trigger.kill()
      section.style.removeProperty('--particle-progress')
      section.style.removeProperty('--particle-scroll-y')
      delete section.dataset.handoffPhase
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
            {mounted && visible && (
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
