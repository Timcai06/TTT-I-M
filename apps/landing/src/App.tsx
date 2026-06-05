import { useEffect, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useLenis } from './lib/lenis'
import { subscribeStage } from './lib/stage'
import { requestScrollRefresh } from './lib/scroll/requestRefresh'
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

    let timer: number | undefined
    const cancel = onChaptersReady(() => {
      timer = window.setTimeout(() => scrollToChapter(hash), 250)
    })

    return () => {
      cancel()
      if (timer !== undefined) clearTimeout(timer)
    }
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
      <Analytics />
      <SpeedInsights />
      {import.meta.env.DEV && <PerfHud />}
    </>
  )
}
