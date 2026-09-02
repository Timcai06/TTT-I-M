import { lazy, useEffect, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useLenis } from './lib/lenis'
import { getStage, subscribeStage } from './lib/stage'
import { requestScrollRefresh } from './lib/scroll/requestRefresh'
import { onChaptersReady } from './lib/chaptersReady'
import { scrollToChapter } from './lib/chapterScroll'
import { SoundProvider } from './lib/sound/SoundProvider'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ScrollIndicator from './components/ScrollIndicator'
import Nav from './components/Nav'
import PerfHud from './components/PerfHud'
import ChapterBoundary from './components/ChapterBoundary'
import ChapterStateProvider from './components/ChapterStateProvider'
import ChapterThemeDriver from './components/ChapterThemeDriver'
import ChapterTransition from './components/ChapterTransition'
import { chapters } from './chapters/registry'
import './styles/app.css'

const ParticlePortal = lazy(() => import('./components/ParticlePortal'))

export default function App() {
  // Smooth scroll + scroll-driven side effects (incl. the disable-hover
  // throttle) are owned by useLenis, so there's a single scroll subscription.
  useLenis()

  // Below-the-fold chapters are lazy-loaded, so they mount slightly after the
  // first paint and change the document height — which invalidates every
  // pinned/scrubbed ScrollTrigger's start/end. Re-measure once the lazy
  // sections have settled. All refreshes route through the coordinator so the
  // intro hand-off, window load and safety timeout coalesce instead of thrashing
  // layout; the intro→live hand-off refreshes immediately (the one moment a
  // stale measurement is most visible).
  useEffect(() => {
    const unsub = subscribeStage((stage) => {
      if (stage === 'live') requestScrollRefresh(true)
    })
    const refresh = () => requestScrollRefresh()
    window.addEventListener('load', refresh)
    const t = window.setTimeout(refresh, 1200)
    return () => {
      unsub()
      window.removeEventListener('load', refresh)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return

    let done = false
    const timers: number[] = []
    let cancelStage: (() => void) | undefined

    const jump = () => {
      if (done) return
      const target = document.getElementById(hash)
      if (!target) return

      done = true
      requestScrollRefresh(true)
      scrollToChapter(hash, { immediate: true })

      // Late image decode / pinned section measurement can still shift the page
      // after the first anchor jump. Re-assert the direct-link landing a couple
      // of times so /#contact and deep links don't strand the user at the hero.
      for (const delay of [120, 520, 1100]) {
        timers.push(window.setTimeout(() => {
          const el = document.getElementById(hash)
          if (!el) return
          const top = Math.round(el.getBoundingClientRect().top)
          if (Math.abs(top - 40) > 8) {
            requestScrollRefresh(true)
            scrollToChapter(hash, { immediate: true })
          }
        }, delay))
      }
    }

    const jumpWhenLive = () => {
      if (getStage() === 'live') {
        jump()
        return
      }
      cancelStage = subscribeStage((stage) => {
        if (stage !== 'live') return
        cancelStage?.()
        cancelStage = undefined
        jump()
      })
    }

    const cancel = onChaptersReady(() => {
      jumpWhenLive()
    })

    return () => {
      cancel()
      cancelStage?.()
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <>
      <Loader />
      <Cursor />
      <SoundProvider>
        <ChapterStateProvider>
          <ScrollIndicator />
          <Nav />
          <ChapterThemeDriver />
        </ChapterStateProvider>
        <ChapterTransition />
        <Suspense fallback={null}>
          <ParticlePortal />
        </Suspense>
        <main>
          {chapters.map(({ id, Component }) => (
            // One boundary pair per chapter: Suspense so a still-loading section
            // can't suspend (blank out) its already-painted neighbours — notably
            // the eager Hero — and ChapterBoundary so a render error or a failed
            // lazy-chunk fetch collapses only this chapter, not the whole tree.
            <ChapterBoundary key={id} chapterId={id}>
              <Suspense fallback={null}>
                <Component />
              </Suspense>
            </ChapterBoundary>
          ))}
        </main>
      </SoundProvider>
      <div className="grain" aria-hidden="true" />
      <Analytics />
      <SpeedInsights />
      {import.meta.env.DEV && <PerfHud />}
    </>
  )
}
