import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { createHeroParallax } from '../lib/timelines/heroParallax'
import { onIntroExit } from '../lib/intro'
import { usePretextTextInteraction } from '../lib/pretextIntroText'
import { onChapterArrived } from '../lib/chapterTransition'
import ParticlePortrait from './ParticlePortrait'

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const pretextEnableTimer = useRef<number | undefined>(undefined)
  const [introExited, setIntroExited] = useState(false)
  const [heroTitleReady, setHeroTitleReady] = useState(false)
  const [heroPretextEnabled, setHeroPretextEnabled] = useState(false)
  const [pretextRefreshKey, setPretextRefreshKey] = useState(0)
  const [showParticleLayer] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!root.current) return
    let cancelIntroExit = () => {}
    let cancelHeroArrived = () => {}
    const ctx = gsap.context(() => {
      // intro reveal
      gsap.set('.hero__split .split-line__inner', { yPercent: 110, skewY: 6 })
      gsap.set('.hero__meta-block', { opacity: 0, y: 12 })
      gsap.set('.hero__subline > *', { opacity: 0, y: 8 })
      gsap.set('.hero__kicker', { opacity: 0, y: 10 })

      const tl = gsap.timeline({ paused: true })
      tl.eventCallback('onComplete', () => {
        setHeroTitleReady(true)
        setPretextRefreshKey((key) => key + 1)
      })

      cancelIntroExit = onIntroExit(() => {
        setIntroExited(true)
        if (tl.paused()) void tl.play()
      })

      cancelHeroArrived = onChapterArrived((id) => {
        if (id !== 'hero') return
        setIntroExited(true)
        setHeroTitleReady(true)
        setHeroPretextEnabled(false)
        gsap.set('.hero__content', { opacity: 1, yPercent: 0 })
        gsap.set('.hero__split .split-line__inner', {
          opacity: 1,
          scale: 1,
          skewY: 0,
          xPercent: 0,
          yPercent: 0,
        })
        window.clearTimeout(pretextEnableTimer.current)
        pretextEnableTimer.current = window.setTimeout(() => {
          if (window.scrollY > 6) return
          setPretextRefreshKey((key) => key + 1)
          setHeroPretextEnabled(true)
        }, 180)
      })

      tl.to('.hero__kicker', { opacity: 1, y: 0, duration: 1.8, ease: 'expo.out' })
        .to('.hero__split .split-line__inner', {
        yPercent: 0,
        skewY: 0,
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

      // Title lines split apart and recede as the hero scrolls away.
      if (root.current) createHeroParallax(root.current)
    }, root)

    return () => {
      cancelIntroExit()
      cancelHeroArrived()
      window.clearTimeout(pretextEnableTimer.current)
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    if (!introExited || !heroTitleReady) {
      return
    }

    let ticking = false
    let initialFrame = 0
    const syncPretextAvailability = () => {
      ticking = false
      window.clearTimeout(pretextEnableTimer.current)

      if (window.scrollY > 6) {
        setHeroPretextEnabled(false)
        return
      }

      setHeroPretextEnabled(false)
      pretextEnableTimer.current = window.setTimeout(() => {
        if (window.scrollY > 6) return
        setPretextRefreshKey((key) => key + 1)
        setHeroPretextEnabled(true)
      }, 140)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(syncPretextAvailability)
    }

    initialFrame = window.requestAnimationFrame(syncPretextAvailability)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(pretextEnableTimer.current)
    }
  }, [introExited, heroTitleReady])

  usePretextTextInteraction(nameRef, {
    enabled: heroPretextEnabled,
    refreshKey: pretextRefreshKey,
    strength: 0.78,
    text: 'Tim Cai.',
  })

  const heroGlyphs = (text: string) => text.split('').map((char, index) => {
    if (char === '.') {
      return <em className="pretext-glyph" data-final="." key={`${char}-${index}`}>.</em>
    }
    return (
      <span className="pretext-glyph" data-final={char} key={`${char}-${index}`}>
        {char}
      </span>
    )
  })

  return (
    <section className="hero" id="hero" ref={root}>
      <div className="hero__canvas">
        <img className="hero__ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
        {showParticleLayer && (
          <ParticlePortrait />
        )}
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
        <h1 className="hero__name hero__split" ref={nameRef}>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Tim')}</span></span>
          <span className="split-line"><span className="split-line__inner">{heroGlyphs('Cai.')}</span></span>
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
