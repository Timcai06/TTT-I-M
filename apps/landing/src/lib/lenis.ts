import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap, ScrollTrigger } from './gsap'
import { useReducedMotion } from './motion'
import { subscribeStage } from './stage'
import { requestScrollRefresh } from './scroll/requestRefresh'

let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

export function useLenis() {
  const reduced = useReducedMotion()

  useEffect(() => {
    // Reduced-motion is a separate runtime, not a Lenis configuration. Keeping
    // a Lenis instance with smoothWheel=false still attaches its resize,
    // virtual-scroll, ScrollTrigger and GSAP ticker machinery. Native scrolling
    // gives the browser full ownership and guarantees there is no idle Lenis
    // rAF path for users who explicitly opted out of motion.
    if (reduced) {
      lenisInstance = null
      document.body.classList.remove('disable-hover')
      const refreshTimer = window.setTimeout(() => requestScrollRefresh(), 150)
      return () => {
        window.clearTimeout(refreshTimer)
        document.body.classList.remove('disable-hover')
      }
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })

    lenisInstance = lenis

    // Mark active scroll bursts so expensive decorative layers can reduce
    // repaint work. Pointer hit-testing stays enabled: the Frame archive must
    // be able to acquire hover while panels move beneath a stationary cursor.
    let hoverTimeout: number | undefined
    const onScroll = () => {
      ScrollTrigger.update()
      const body = document.body
      if (!body.classList.contains('disable-hover')) {
        body.classList.add('disable-hover')
      }
      clearTimeout(hoverTimeout)
      hoverTimeout = window.setTimeout(() => {
        body.classList.remove('disable-hover')
      }, 80)
    }
    lenis.on('scroll', onScroll)

    const tickerFn = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    // ScrollTrigger creates and resizes pin spacers after lazy chapters mount.
    // Lenis' ResizeObserver does not reliably observe those synthetic height
    // changes in a production build, so its cached scroll limit can remain at
    // the pre-pin document height. The result is a hard clamp part-way through
    // Frame even though the native document is much taller. Refresh is the one
    // point at which every pin has finished measuring; resize Lenis there so
    // both runtimes share the same scroll range.
    const syncLenisDimensions = () => {
      lenis.resize()
    }
    ScrollTrigger.addEventListener('refresh', syncLenisDimensions)

    // A chapter-jump transition owns the viewport: freeze smooth scrolling while
    // the overlay plays and resume when we land. This lives here (the single
    // Lenis owner) as a stage side-effect instead of being driven imperatively
    // from inside ChapterTransition. stop()/start() are idempotent.
    const unsubStage = subscribeStage((stage) => {
      if (stage === 'transitioning') lenis.stop()
      else if (stage === 'live') lenis.start()
    })

    // Refresh ScrollTrigger after a tick to make sure the DOM heights have settled
    const refreshTimer = setTimeout(() => {
      requestScrollRefresh()
    }, 150)

    return () => {
      clearTimeout(refreshTimer)
      clearTimeout(hoverTimeout)
      unsubStage()
      document.body.classList.remove('disable-hover')
      lenis.off('scroll', onScroll)
      ScrollTrigger.removeEventListener('refresh', syncLenisDimensions)
      gsap.ticker.remove(tickerFn)
      lenis.destroy()
      lenisInstance = null
    }
  }, [reduced])
}
