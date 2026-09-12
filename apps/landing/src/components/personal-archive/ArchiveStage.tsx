import { useEffect, useRef, useState } from 'react'
import { getPreparedArchiveRuntime, prepareArchiveRuntime } from './archiveRuntime'
import { useChapterState } from '../../lib/chapterState'
import type { ArchiveView } from './archiveDirector'
import { ScrollTrigger } from '../../lib/gsap'
import { getLenis } from '../../lib/lenis'
import { installChapterScrollInterceptor } from '../../lib/chapterScroll'
import { seekArchiveChapter, usesSampleRoute, currentArchiveRequest, registerArchiveScroll } from '../../lib/archiveRoute'
import { getRetainedSamplePosition, invalidateSampleLayout, publishSampleLayout, scrollAtPosition, type SampleRanges } from './archiveSamplePosition'
import { samplePageLayout, type ProjectionLayout } from './archiveReadingSurface'

const viewByChapter: Record<string, ArchiveView> = {
  hero: 'home', about: 'about', life: 'life', frame: 'frame', skills: 'stack', projects: 'work', contact: 'contact',
}

/**
 * The room has exactly one DOM home for the whole visit. Chapter adapters only
 * change the seekable shot; they never move or unmount the renderer canvas.
 */
/** Screens of stillness on the Index *after* the hero interval, before the About
 *  flight begins.
 *
 * Zero, because the hero interval is already that screen. `atIndex` covers the
 * whole hero span, so the Index is held still and clickable for a full screen of
 * scrolling; anything added here lands after the Index has detached and before
 * entry has started, which is a dead zone rather than a rest. Measured at 1, that
 * dead zone was 768px of scrolling in which nothing on screen changed at all.
 *
 * It was 2.5 for one round before that, compensating for the Index sliding off the
 * monitor — which turned out to be a coordinate-space bug in samplePageLayout. */
const INDEX_DWELL = 0

export default function ArchiveStage() {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { activeId } = useChapterState()
  const activeView = viewByChapter[activeId] ?? 'home'
  const activeViewRef = useRef<ArchiveView>(activeView)

  useEffect(() => {
    const uninstall = installChapterScrollInterceptor((id, options) => usesSampleRoute(id) ? seekArchiveChapter(id, options) : null)
    const invalidate = () => invalidateSampleLayout()
    const refresh = () => {
      const ranges: { -readonly [K in keyof SampleRanges]?: SampleRanges[K] } = {}
      for (const trigger of ScrollTrigger.getAll()) {
        const element = trigger.trigger
        if (!(element instanceof HTMLElement)) continue
        const key = element.id === 'hero' ? 'index' : element.id === 'archive-entry' ? 'entry' : element.dataset.archiveTrack
        const chapterTrack = key === 'about-life' || key === 'life-frame' || key === 'frame-stack' || key === 'stack-work' || key === 'work-contact'
        // A chapter bridge's trigger opens at `top bottom`, but the stage inside
        // it is sticky top:0 with overflow:clip, so it does not actually cover
        // the viewport until one screen later. Starting the story at the trigger
        // ran the entire source retraction (progress 0 - .18) inside a panel that
        // was still sliding up and clipped to its own partial rect, while the
        // live chapter had already been forced to opacity 0 — a page vanishing
        // and a half-cut sheet rising from the bottom. The story now begins where
        // the stage is pinned, so the reader simply finishes the chapter and
        // scrolls it away before the room takes the frame.
        if (key === 'index' || key === 'entry' || chapterTrack) ranges[key] = { start: chapterTrack ? trigger.start + innerHeight : trigger.start, end: trigger.end }
      }
      try {
        if (Object.keys(ranges).length !== 7) throw new Error('Sample triggers not ready')
        // The legacy Hero and entry triggers intentionally overlap from scroll
        // zero. A single story clock cannot let both own that interval, so the
        // semantic entry begins exactly where the Hero/Index interval ends.
        // Give the Index a dwell before the About flight begins. The hero trigger is
        // exactly one screen, so entry used to start the moment the reader scrolled at
        // all — the Index was something you fell through rather than something you
        // could stop and use. The entry bridge carries a matching +100svh so its own
        // flight keeps the pace tuned for it.
        // Entry begins INDEX_DWELL screens after the hero interval ends. Clicking
        // the Index (seekArchiveChapter) remains the fast path that skips the wait.
        //
        // Deliberately NOT gated on the click alone: a reader who only scrolls
        // would then pass the whole dwell and arrive in About's body with the
        // entry flight never played.
        ranges.entry = { start: ranges.index!.end + innerHeight * INDEX_DWELL, end: ranges.entry!.end }
        const pages: Record<string, ProjectionLayout> = {}
        for (const track of ['about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']) for (const kind of ['target', 'source']) {
          const page = document.querySelector<HTMLElement>(`[data-archive-track="${track}"] ${kind === 'target' ? '.archive-chapter-bridge__page' : '.archive-bridge__page--source'}`)
          if (!page) throw new Error(`Sample page not ready:${track}:${kind}`)
          pages[`${track}:${kind}`] = samplePageLayout(page, innerWidth, innerHeight)
        }
        const indexPage=document.querySelector<HTMLElement>('.hero__screen-page')
        const entryPage=document.querySelector<HTMLElement>('#archive-entry .archive-bridge__page')
        if(!indexPage||!entryPage)throw new Error('Index/entry pages not ready')
        pages['index:target']=samplePageLayout(indexPage,innerWidth,innerHeight)
        pages['entry:source']=samplePageLayout(indexPage,innerWidth,innerHeight)
        pages['entry:target']=samplePageLayout(entryPage,innerWidth,innerHeight)
        delete document.documentElement.dataset.archiveLayoutError
        const next = publishSampleLayout(ranges as SampleRanges, { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, pages, ScrollTrigger.maxScroll(window)+1)
        const retained = getRetainedSamplePosition()
        if (retained && !currentArchiveRequest().pending) {
          const top = scrollAtPosition(next, retained)
          const lenis = getLenis()
          if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
          else window.scrollTo({ top, behavior: 'auto' })
        }
      } catch (error) {
        // This used to swallow every layout failure silently, which disabled the
        // whole room with no trace anywhere. Record the reason so a dead room is
        // diagnosable from the page itself.
        document.documentElement.dataset.archiveLayoutError = error instanceof Error ? error.message : String(error)
        invalidate(); return
      }
      getPreparedArchiveRuntime()?.commitPosition(currentArchiveRequest().requestId)
    }
    ScrollTrigger.addEventListener('refreshInit', invalidate)
    ScrollTrigger.addEventListener('refresh', refresh)
    refresh()
    return () => { uninstall(); invalidate(); ScrollTrigger.removeEventListener('refreshInit', invalidate); ScrollTrigger.removeEventListener('refresh', refresh) }
  }, [])

  useEffect(() => {
    const lifecycle = new AbortController()
    let unmount: (() => void) | undefined
    const mount = (runtime: Awaited<ReturnType<typeof prepareArchiveRuntime>>) => {
      if (lifecycle.signal.aborted || !host.current) return
      unmount = runtime.mount(host.current)
      runtime.rest(activeViewRef.current)
    }
    const runtime = getPreparedArchiveRuntime()
    if (runtime) mount(runtime)
    else void prepareArchiveRuntime(lifecycle.signal).then(mount).catch((error: unknown) => {
      if (lifecycle.signal.aborted) return
      console.error('[personal-archive] Persistent stage failed', error)
      setFailed(true)
    })
    return () => {
      lifecycle.abort(new Error('Archive stage released'))
      unmount?.()
    }
  }, [])

  useEffect(() => {
    activeViewRef.current = activeView
    getPreparedArchiveRuntime()?.rest(activeView)
  }, [activeView])

  useEffect(() => {
    let frame = 0
    const syncViewportView = () => {
      frame = 0
      registerArchiveScroll()
      const result = getPreparedArchiveRuntime()?.commitPosition(currentArchiveRequest().requestId)
      if (result === 'committed') return
      const center = innerHeight / 2
      const life = document.getElementById('life')?.getBoundingClientRect()
      const view = life && life.top <= center && life.bottom >= center ? 'life' : activeView
      activeViewRef.current = view
      getPreparedArchiveRuntime()?.rest(view)
    }
    const requestSync = () => {
      if (frame) return
      frame = requestAnimationFrame(syncViewportView)
    }
    window.addEventListener('scroll', requestSync, { passive: true })
    window.addEventListener('resize', requestSync)
    requestSync()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestSync)
      window.removeEventListener('resize', requestSync)
    }
  }, [activeView])

  return (
    <div
      ref={host}
      className="archive-stage"
      data-failed={failed ? 'true' : 'false'}
      aria-hidden="true"
    />
  )
}
