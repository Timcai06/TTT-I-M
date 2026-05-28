import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap, ScrollTrigger } from './gsap'

let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })

    lenisInstance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tickerFn = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    // Refresh ScrollTrigger after a tick to make sure the DOM heights have settled
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 150)

    return () => {
      clearTimeout(refreshTimer)
      gsap.ticker.remove(tickerFn)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
