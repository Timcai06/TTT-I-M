import { useEffect, Suspense } from 'react'
import { useLenis } from './lib/lenis'
import { gsap, ScrollTrigger } from './lib/gsap'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ScrollIndicator from './components/ScrollIndicator'
import Nav from './components/Nav'
import { chapters } from './chapters/registry'
import './styles/app.css'

export default function App() {
  // Smooth scroll + scroll-driven side effects (incl. the disable-hover
  // throttle) are owned by useLenis, so there's a single scroll subscription.
  useLenis()

  // Below-the-fold chapters are lazy-loaded, so they mount slightly after the
  // first paint and change the document height — which invalidates every
  // pinned/scrubbed ScrollTrigger's start/end. Re-measure once the lazy
  // sections have settled. refresh() is idempotent, so firing on a few signals
  // (loader handoff, full load, a safety timeout) is safe and covers the race
  // regardless of when the last chunk lands.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('loader:exit', refresh)
    window.addEventListener('load', refresh)
    const t = window.setTimeout(refresh, 1200)
    return () => {
      window.removeEventListener('loader:exit', refresh)
      window.removeEventListener('load', refresh)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const inner = gsap.utils.toArray<HTMLElement>('.hero__split .split-line__inner')
      if (inner.length < 2) return

      gsap.to(inner[0], {
        xPercent: -45,
        scale: 0.75,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      })

      gsap.to(inner[1], {
        xPercent: 45,
        scale: 0.75,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <>
      <Loader />
      <Cursor />
      <ScrollIndicator />
      <Nav />
      <main>
        {chapters.map(({ id, Component }) => (
          // One boundary per chapter so a still-loading section can't suspend
          // (blank out) its already-painted neighbours — notably the eager Hero.
          <Suspense key={id} fallback={null}>
            <Component />
          </Suspense>
        ))}
      </main>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
