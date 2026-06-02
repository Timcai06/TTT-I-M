import { useEffect, useRef, Suspense, lazy } from 'react'
import { gsap } from '../lib/gsap'
import { onIntroExit } from '../lib/intro'

const ParticlePortrait = lazy(() => import('./ParticlePortrait'))

export default function Hero() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    let cancelIntroExit = () => {}
    const ctx = gsap.context(() => {
      // intro reveal
      gsap.set('.hero__split .split-line__inner', { yPercent: 110 })
      gsap.set('.hero__meta-block', { opacity: 0, y: 12 })
      gsap.set('.hero__subline > *', { opacity: 0, y: 8 })
      gsap.set('.hero__kicker', { opacity: 0, y: 10 })

      const tl = gsap.timeline({ paused: true })

      cancelIntroExit = onIntroExit(() => {
        if (tl.paused()) void tl.play()
      })

      tl.to('.hero__kicker', { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out' })
        .to('.hero__split .split-line__inner', {
        yPercent: 0,
        duration: 2.2,
        ease: 'expo.out',
        stagger: 0.12,
      }, '-=1.2')
        .to('.hero__meta-block', { opacity: 1, y: 0, duration: 1.8, stagger: 0.15, ease: 'expo.out' }, '-=1.6')
        .to('.hero__subline > *', { opacity: 1, y: 0, duration: 1.8, stagger: 0.12, ease: 'expo.out' }, '-=1.4')

      // deconstruct the portrait from recognizable photo into particle signal
      gsap.to('.hero__canvas', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // NOTE: only transform/opacity are scrubbed here. Animating `filter`
      // (esp. blur) on scrub forced a full-frame repaint every scroll tick;
      // the static CSS filter now stays put while the ghost recedes via
      // GPU-composited scale + opacity.
      gsap.to('.hero__ghost', {
        opacity: 0.05,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to('.hero__scan', {
        opacity: 0.05,
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to('.hero__content', {
        yPercent: -8,
        opacity: 0.0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    }, root)

    return () => {
      cancelIntroExit()
      ctx.revert()
    }
  }, [])

  return (
    <section className="hero" id="hero" ref={root}>
      <div className="hero__canvas">
        <img className="hero__ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
        <Suspense fallback={null}>
          <ParticlePortrait />
        </Suspense>
        <div className="hero__scan" aria-hidden="true" />
      </div>
      <div className="hero__vignette" />
      <div className="container hero__content">
        <div className="hero__meta">
          <div className="hero__meta-block">
            <div>// Profile · 2026</div>
            <div>Shanghai · 31°N 121°E</div>
            <div>Available for collaborations</div>
          </div>
          <div className="hero__meta-block" style={{ textAlign: 'right' }}>
            <div>Tim · Cai</div>
            <div>freshman / builder</div>
            <div>full-stack · AI · 建模</div>
          </div>
        </div>

        <div className="hero__kicker">visual systems / webgl / front-end storytelling</div>
        <h1 className="hero__name hero__split">
          <span className="split-line"><span className="split-line__inner">Tim</span></span>
          <span className="split-line"><span className="split-line__inner">Cai<em>.</em></span></span>
        </h1>

        <div className="hero__subline">
          <span>↳ coursework, models, and strange ideas rendered into interfaces</span>
          <span className="hero__scroll">
            scroll
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  )
}
