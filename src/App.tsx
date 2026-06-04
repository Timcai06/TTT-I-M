import { useEffect, Suspense } from 'react'
import { useLenis } from './lib/lenis'
import { gsap, ScrollTrigger } from './lib/gsap'
import { INTRO_EXIT_EVENT } from './lib/intro'
import { onChaptersReady } from './lib/chaptersReady'
import { scrollToChapter } from './lib/chapterScroll'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ScrollIndicator from './components/ScrollIndicator'
import Nav from './components/Nav'
import PerfHud from './components/PerfHud'
import ChapterStateProvider from './components/ChapterStateProvider'
import ChapterTransition from './components/ChapterTransition'
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
    window.addEventListener(INTRO_EXIT_EVENT, refresh)
    window.addEventListener('load', refresh)
    const t = window.setTimeout(refresh, 1200)
    return () => {
      window.removeEventListener(INTRO_EXIT_EVENT, refresh)
      window.removeEventListener('load', refresh)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return

    let timer: number | undefined
    const cancel = onChaptersReady(() => {
      timer = window.setTimeout(() => scrollToChapter(hash), 250)
    })

    return () => {
      cancel()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const inner = gsap.utils.toArray<HTMLElement>('.hero__split .split-line__inner')
      if (inner.length < 2) return
      const [firstLine, secondLine] = inner
      if (!firstLine || !secondLine) return

      gsap.to(firstLine, {
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

      gsap.to(secondLine, {
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
      <ChapterStateProvider>
        <ScrollIndicator />
        <Nav />
      </ChapterStateProvider>
      <ChapterTransition />
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
      {import.meta.env.DEV && <PerfHud />}
    </>
  )
}
