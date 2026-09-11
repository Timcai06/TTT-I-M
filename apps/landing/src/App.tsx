import { lazy, useEffect, Suspense } from 'react'
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
import { chapters } from './chapters/registry'
import './styles/app.css'
import ChapterSoundCues from './components/ChapterSoundCues'
import RoomAmbience from './components/RoomAmbience'

const ParticlePortal = lazy(() => import('./components/ParticlePortal'))
const ProductionTelemetry = lazy(() => import('./components/ProductionTelemetry'))
const ChapterTransition = lazy(() => import('./components/ChapterTransition'))
const ArchiveStage = lazy(() => import('./components/personal-archive/ArchiveStage'))
const ArchiveReturnControl = lazy(() => import('./components/personal-archive/ArchiveReturnControl'))

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
    let cancelStage: (() => void) | undefined

    const jump = () => {
      if (done) return
      const target = document.getElementById(hash)
      if (!target) return

      done = true
      requestScrollRefresh(true)
      void scrollToChapter(hash, { immediate: true, restore: true })
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
    }
  }, [])

  return (
    <>
      <Cursor />
      <SoundProvider>
        {/* Inside the provider so the intro can offer the sound choice before the
            experience starts, the way the reference does, instead of burying it in
            the nav where nobody finds it. */}
        <Loader />
        <RoomAmbience />
        <ChapterStateProvider>
          {/* Inside the provider: useChapterState throws without one, and mounting
              this outside it crashed the whole tree to a black screen. */}
          <ChapterSoundCues />
          <Suspense fallback={null}><ArchiveStage /></Suspense>
          <ScrollIndicator />
          <Nav />
          <ChapterThemeDriver />
          <Suspense fallback={null}><ArchiveReturnControl /></Suspense>
        </ChapterStateProvider>
        <Suspense fallback={null}>
          <ChapterTransition />
          <ParticlePortal />
        </Suspense>
        <main>
          {chapters.map(({ id, Component, failureMinHeight }) => (
            // One boundary pair per chapter: Suspense so a still-loading section
            // can't suspend (blank out) its already-painted neighbours — notably
            // the eager Hero — and ChapterBoundary so a render error or a failed
            // lazy-chunk fetch collapses only this chapter, not the whole tree.
            <ChapterBoundary key={id} chapterId={id} fallbackMinHeight={failureMinHeight}>
              <Suspense fallback={(
                <div
                  className="chapter-loading-reserve"
                  style={{ minHeight: failureMinHeight }}
                  aria-hidden="true"
                />
              )}>
                <Component />
              </Suspense>
            </ChapterBoundary>
          ))}
        </main>
      </SoundProvider>
      <div className="grain" aria-hidden="true" />
      <Suspense fallback={null}>
        <ProductionTelemetry />
      </Suspense>
      {import.meta.env.DEV && <PerfHud />}
    </>
  )
}
