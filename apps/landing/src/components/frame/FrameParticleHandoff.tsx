import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { archiveThemes } from '../../content'
import { gsap, useGSAP } from '../../lib/gsap'
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
  image,
  capture = false,
  onMediaReady,
}: {
  image?: ArchiveImage
  capture?: boolean
  onMediaReady?: () => void
}) {
  if (!image) return null

  return (
    <div className="frame-particle-document">
      <section className="frame-particle-document__contact" aria-label="Final Scenery frame">
        <figure
          className="frame-particle-document__figure"
          key={`${capture ? 'capture' : 'fallback'}-${image.src}`}
          style={{ '--particle-image-aspect': `${image.width} / ${image.height}` } as CSSProperties}
        >
          <img
            src={image.src}
            alt={capture ? '' : image.title}
            loading={capture ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={onMediaReady}
          />
        </figure>
      </section>
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

  const image = useMemo(() => {
    const lastTheme = archiveThemes[archiveThemes.length - 1]
    const lastCluster = lastTheme?.clusters[lastTheme.clusters.length - 1]
    return lastCluster?.slots[0]?.image
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

    const captureImages = [...capture.querySelectorAll('img')]
    void Promise.allSettled(captureImages.map((captureImage) => captureImage.decode())).then(() => {
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

    const particleState = { progress: 0 }
    let lastScrollY = window.scrollY
    const sync = () => {
      const progress = timeline.progress()
      const scrollY = window.scrollY
      const state = { progress: particleState.progress, delta: scrollY - lastScrollY }
      lastScrollY = scrollY
      latestState.current = state
      section.style.setProperty('--particle-progress', progress.toFixed(4))
      section.dataset.handoffPhase = progress < 0.12
        ? 'frame-owned'
        : progress < 0.82
          ? 'canvas-owned'
          : 'stack-preview'
      handleRef.current?.setScrollState(state)
    }

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: sync,
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.2,
        refreshPriority: -100,
        invalidateOnRefresh: true,
      },
    })
      .addLabel('hold', 0)
      .addLabel('dissolve', 0.12)
      .to(particleState, {
        progress: 1,
        duration: 0.56,
        ease: 'power1.inOut',
      }, 'dissolve')
      .to(section, {
        '--dissolve-progress': 1,
        '--scan-y': '92svh',
        duration: 0.56,
        ease: 'power1.inOut',
      }, 'dissolve')
      .addLabel('condense', 0.64)
      .to(section, {
        '--scan-scale': 0.003,
        '--scan-red': 1,
        duration: 0.24,
        ease: 'power2.inOut',
      }, 'condense')
      .addLabel('handoff', 0.82)
      .to(section, {
        '--particle-exit-opacity': 0,
        duration: 0.16,
        ease: 'power2.out',
      }, 'handoff')
      .to(section, {
        '--scan-opacity': 0,
        duration: 0.12,
        ease: 'power2.out',
      }, 0.88)

    timeline.progress(0)
    sync()
    return () => {
      timeline.scrollTrigger?.kill()
      timeline.kill()
      section.style.removeProperty('--particle-progress')
      section.style.removeProperty('--dissolve-progress')
      section.style.removeProperty('--scan-y')
      section.style.removeProperty('--scan-scale')
      section.style.removeProperty('--scan-red')
      section.style.removeProperty('--scan-opacity')
      section.style.removeProperty('--particle-exit-opacity')
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
        <header className="frame-particle-handoff__chrome" aria-hidden="true">
          <span>FRAME / FINAL EXPOSURE</span>
          <span>03 · SCENERY</span>
        </header>

        <div className="frame-particle-handoff__caption" aria-hidden="true">
          <span>FRAME / 03</span>
          <strong>{(image?.title ?? 'Final Horizon').toUpperCase()}</strong>
          <span>IMAGE → SIGNAL → STACK</span>
        </div>

        <div className="frame-particle-handoff__status" aria-hidden="true">
          <span>Signal acquired</span>
          <strong>Next / Stack</strong>
        </div>

        <div className="frame-particle-handoff__fallback">
          <ParticleDocument image={image} />
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
                    <ParticleDocument image={image} capture onMediaReady={requestCapture} />
                  </div>
                </canvas>
                <canvas className="frame-particle-handoff__output" ref={outputRef} />
              </>
            )}
          </div>
        )}

        <div className="frame-particle-handoff__scanline" aria-hidden="true" />
      </div>
    </section>
  )
}
