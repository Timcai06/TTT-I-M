import { ScrollTrigger } from './gsap'
import { getLenis } from './lenis'
import { scrollToChapter, scrollToChapterRaw, type ChapterScrollOptions, type ArchiveSeekResult } from './chapterScroll'
import { getSampleLayout, isSampleChapter, positionAtScroll, scrollAtPosition, ARCHIVE_ROOM_PROGRESS } from '../components/personal-archive/archiveSamplePosition'
import { getPreparedArchiveRuntime } from '../components/personal-archive/archiveRuntime'
import { setStage } from './stage'
import { readingSnapshot } from '../components/personal-archive/readingSnapshot'
import type { SampleSegment, StoryChapter, StoryPosition } from '../core/narrative/types'
import { rememberChapterPosition } from './archiveReadingMemory'

const transitionChapter: Partial<Record<string, StoryChapter>>={about:'about',life:'life',frame:'frame',skills:'stack',projects:'work',contact:'contact'}
const openingSegment: Partial<Record<string, 'entry' | 'about-life' | 'life-frame' | 'frame-stack' | 'stack-work' | 'work-contact'>> = {
  about: 'entry', life: 'about-life', frame: 'life-frame', skills: 'frame-stack', projects:'stack-work', contact:'work-contact',
}
const readingSegment: Partial<Record<string, SampleSegment>> = {
  hero: 'index', about: 'about-reading', life: 'life-reading', frame: 'frame-reading', skills: 'stack-reading',
  projects: 'work-reading', contact: 'contact-reading', 'work-transition': 'stack-work',
}
const chapterByReadingSegment: Partial<Record<SampleSegment, string>> = {
  'about-reading': 'about', 'life-reading': 'life', 'frame-reading': 'frame',
  'stack-reading': 'skills', 'work-reading': 'projects', 'contact-reading': 'contact',
}

function requestedReadingSegment(id: string): SampleSegment | null {
  const segment = readingSegment[id]
  if (segment) return segment
  if (id.startsWith('frame-')) return 'frame-reading'
  if (id.startsWith('project-')) return 'work-reading'
  return null
}

function requestedChapter(id: string) {
  if (id.startsWith('frame-')) return 'frame'
  if (id.startsWith('project-')) return 'projects'
  return readingSegment[id] ? id : null
}

function positionMatches(segment: SampleSegment, position: StoryPosition | null) {
  return position?.segment === segment
}

function landOnIntent(id: string, options: ChapterScrollOptions, position: StoryPosition | undefined, updateHash: boolean) {
  if (position) {
    const layout = getSampleLayout()
    if (!layout) return false
    jumpTo(scrollAtPosition(layout, position))
    return true
  }
  scrollToChapterRaw(id, { ...options, immediate: true, updateHash: updateHash ? options.updateHash : false })
  return true
}

function correctIntent(id: string, position: StoryPosition | undefined) {
  const layout = getSampleLayout()
  if (!layout) return false
  if (position) {
    jumpTo(scrollAtPosition(layout, position))
    return true
  }
  const segment = requestedReadingSegment(id)
  if (!segment) return true
  const span = layout.spans.find(candidate => candidate.segment === segment)
  if (!span) return false
  jumpTo(Math.min(Math.max(scrollY, span.start), Math.max(span.start, span.end - 1)))
  return true
}

function intentMatches(id: string, position: StoryPosition | undefined) {
  const layout = getSampleLayout()
  if (!layout) return true
  const actual = positionAtScroll(layout, scrollY)
  if (position) {
    const span = layout.spans.find(candidate => candidate.segment === position.segment)
    const tolerance = span ? 1.5 / Math.max(1, span.end - span.start) : 0
    return actual?.segment === position.segment && Math.abs(actual.progress - position.progress) <= tolerance
  }
  const segment = requestedReadingSegment(id)
  return segment ? positionMatches(segment, actual) : true
}

let cancelActiveRoute: (() => void) | null = null
let requestId = 0
let requestPending = false
export function currentArchiveRequest() { return { requestId, pending: requestPending } }
export function registerArchiveScroll() { if (!requestPending) requestId++; return requestId }
export function usesSampleRoute(target: string, source = '') {
  if (matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches) return false
  const layout = getSampleLayout()
  return isSampleChapter(target) || isSampleChapter(source) || Boolean(layout && positionAtScroll(layout, scrollY)) || Boolean(document.documentElement.dataset.archiveSampleOwner)
}

export async function seekArchiveChapter(id: string, options: ChapterScrollOptions = {}, position?: StoryPosition, returnSource?: HTMLElement): Promise<ArchiveSeekResult> {
  cancelArchiveRouting()
  window.dispatchEvent(new Event('archive-request-start'))
  const mine = ++requestId
  const initialLayout = getSampleLayout()
  const initialPosition = initialLayout && positionAtScroll(initialLayout,scrollY)
  const currentChapter = initialPosition && chapterByReadingSegment[initialPosition.segment]
  const targetChapter = requestedChapter(id)
  if (options.restore && !position && !returnSource && currentChapter && currentChapter !== targetChapter) {
    rememberChapterPosition(currentChapter)
  }
  const opening = !returnSource && options.restore && Boolean(transitionChapter[id]) && (initialPosition?.segment === openingSegment[id] || id === 'about' && !initialPosition)
  const capture = (source: HTMLElement) => {
    const layer=document.createElement('div')
    layer.className='archive-route-layer archive-route-layer--reading'
    layer.inert=true; layer.setAttribute('aria-hidden','true')
    layer.dataset.requestId=String(mine)
    const style=getComputedStyle(source)
    for (const token of ['--bg','--bg-soft','--bg-elev','--fg','--fg-soft','--fg-mute','--fg-dim','--line','--accent','--accent-warm']) layer.style.setProperty(token,style.getPropertyValue(token))
    layer.style.background=style.backgroundColor
    const snapshot = readingSnapshot(source)
    if (snapshot.dataset.archiveReadingTheme) layer.dataset.archiveReadingTheme = snapshot.dataset.archiveReadingTheme
    layer.appendChild(snapshot); document.body.appendChild(layer)
    return layer
  }
  let cancelled = false
  requestPending = true
  const cancel = () => { cancelled = true; if (mine === requestId) { requestPending = false; requestId++ } }
  const key = (event: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancel() }
  cancelActiveRoute = cancel
  window.addEventListener('wheel', cancel, { passive: true }); window.addEventListener('touchmove', cancel, { passive: true }); window.addEventListener('keydown', key)
  try {
    setStage('live')
    const chapter=transitionChapter[id]
    if (returnSource && chapter && archiveEnabledForMotion()) {
      const layer=capture(returnSource)
      const result=await (getPreparedArchiveRuntime()?.readingTransition(mine,chapter,'return',layer) ?? Promise.resolve('readable-fallback' as const))
      layer.remove()
      if (cancelled || mine !== requestId || result === 'cancelled') return 'cancelled'
    }
    if (!landOnIntent(id, options, position, true)) return 'readable-fallback'
    await frame()
    if (cancelled || mine !== requestId) return 'cancelled'
    ScrollTrigger.refresh()
    if (cancelled || mine !== requestId) return 'cancelled'
    if (!landOnIntent(id, options, position, false)) return 'readable-fallback'
    await frame()
    if (cancelled || mine !== requestId) return 'cancelled'
    if (!intentMatches(id, position)) {
      if (!correctIntent(id, position)) return 'readable-fallback'
      await frame()
      if (cancelled || mine !== requestId) return 'cancelled'
      if (!intentMatches(id, position)) return 'readable-fallback'
    }
    if (opening && chapter && archiveEnabledForMotion()) {
      const source=document.getElementById(id)
      if (source) {
        const layer=capture(source)
        // Hand the reader's real position to the flight so it starts where they were.
        const result=await (getPreparedArchiveRuntime()?.readingTransition(mine,chapter,'open',layer,initialPosition?.progress) ?? Promise.resolve('readable-fallback' as const))
        layer.remove()
        if (cancelled || mine !== requestId || result === 'cancelled') return 'cancelled'
      }
    }
    if (!intentMatches(id, position)) {
      if (!correctIntent(id, position)) return 'readable-fallback'
      await frame()
      if (cancelled || mine !== requestId) return 'cancelled'
      if (!intentMatches(id, position)) return 'readable-fallback'
    }
    const result=getPreparedArchiveRuntime()?.commitPosition(mine, id) ?? 'readable-fallback'
    if (returnSource && result === 'committed') document.querySelector<HTMLButtonElement>(`[data-archive-target="${CSS.escape(id)}"] .archive-bridge__room-hit`)?.focus({preventScroll:true})
    return result
  } finally {
    window.removeEventListener('wheel', cancel); window.removeEventListener('touchmove', cancel); window.removeEventListener('keydown', key)
    if (cancelActiveRoute === cancel) { cancelActiveRoute = null; requestPending = false }
  }
}

function archiveEnabledForMotion() {
  return !matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches
}

export function cancelArchiveRouting() {
  cancelActiveRoute?.()
}

function frame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function bridgeDestination(bridge: HTMLElement, progress = .55) {
  const trigger = ScrollTrigger.getAll().find(item => item.trigger === bridge)
  if (trigger && Number.isFinite(trigger.start) && Number.isFinite(trigger.end)) {
    return trigger.start + (trigger.end - trigger.start) * progress
  }
  const top = bridge.getBoundingClientRect().top + scrollY
  return top - innerHeight + (bridge.offsetHeight - innerHeight) * progress
}

function jumpTo(top: number) {
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true })
  else window.scrollTo({ top, behavior: 'auto' })
}

export function routeBetweenChapters(source: HTMLElement, targetId: string, updateHash: boolean) {
  const target = document.getElementById(targetId)
  const sourceId = source.dataset.archiveTarget ?? source.id
  if (usesSampleRoute(targetId, sourceId)) return seekArchiveChapter(targetId, { updateHash, restore: true }).then(result => result !== 'cancelled')
  if (!target) return Promise.resolve(false)
  void scrollToChapter(targetId, { immediate: true, updateHash, restore: true })
  return Promise.resolve(true)
}

export function routeToArchiveObject(chapterId: string) {
  const source = document.getElementById(chapterId)
  const bridge = document.querySelector<HTMLElement>(`[data-archive-target="${CSS.escape(chapterId)}"]`)
  if (!source || !bridge) return Promise.resolve(false)
  if (usesSampleRoute(chapterId)) {
    const layout = getSampleLayout()
    const segment = openingSegment[chapterId]
    if (!layout || !segment) return Promise.resolve(false)
    const position = { segment, progress: ARCHIVE_ROOM_PROGRESS } as const
    return seekArchiveChapter(chapterId, {}, position, source).then(result => result !== 'cancelled')
  }
  jumpTo(bridgeDestination(bridge, ARCHIVE_ROOM_PROGRESS))
  return Promise.resolve(true)
}
