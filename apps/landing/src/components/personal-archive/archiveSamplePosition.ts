import type { StoryPosition, SampleSegment } from '../../core/narrative/types.ts'
import type { ProjectionLayout } from './archiveReadingSurface.ts'

/**
 * Where a RETURN lands inside its bridge segment, and the default start of an OPEN flight.
 * Chosen against the authored story timing: source fade ends at .36 and target reveal starts
 * at .58, so at .4 neither reading page is on screen and the camera still has real path
 * travel left to retrace. The old .48/.56 landed where travel is already ~0.92, which is why
 * a return read as "un-docking in place" instead of moving back through the room.
 */
export const ARCHIVE_ROOM_PROGRESS = .4

export const isSampleChapter = (id: string) => /^(?:(?:hero|about|life|frame|skills|work-transition|projects|contact)(?:$|-)|project-)/.test(id)
export type BridgeRange = Readonly<{ start: number; end: number }>
export type SampleRanges = Readonly<Record<'index' | 'entry' | 'about-life' | 'life-frame' | 'frame-stack' | 'stack-work' | 'work-contact', BridgeRange>>
export interface SampleLayout {
  readonly version: number
  readonly viewport: Readonly<{ width: number; height: number; dpr: number }>
  readonly ranges: SampleRanges
  readonly spans: readonly Readonly<{ segment: SampleSegment; start: number; end: number }>[]
  readonly pages: Readonly<Record<string, ProjectionLayout>>
}

export function createSampleLayout(ranges: SampleRanges, viewport: SampleLayout['viewport'], version: number, pages: SampleLayout['pages'] = {}, storyEnd = ranges['work-contact'].end + 1): SampleLayout {
  const index = ranges.index, e = ranges.entry, al = ranges['about-life'], lf = ranges['life-frame'], fs = ranges['frame-stack'], sw=ranges['stack-work'],wc=ranges['work-contact']
  // Say which constraint failed and with what numbers.
  //
  // This threw a bare 'Invalid sample layout ranges' for all eight conditions at
  // once, and the message is what lands in data-archive-layout-error — the only
  // trace a dead room leaves on the page. Reading it from a machine where the room
  // would not appear told us nothing except that something was wrong, which cost a
  // round of guessing at memory and window size before the real cause was in view.
  const round = (n: number) => Number.isFinite(n) ? Math.round(n) : n
  const complaints: string[] = []
  for (const [name, value] of [['width', viewport.width], ['height', viewport.height], ['dpr', viewport.dpr]] as const) {
    if (!Number.isFinite(value) || value <= 0) complaints.push(`viewport.${name} is ${value}`)
  }
  for (const [name, r] of Object.entries(ranges)) {
    if (!Number.isFinite(r.start) || !Number.isFinite(r.end)) complaints.push(`${name} is [${r.start}, ${r.end}]`)
    else if (r.end <= r.start) complaints.push(`${name} is empty or inverted: [${round(r.start)}, ${round(r.end)}]`)
  }
  // `storyEnd` only bounds the trailing contact-reading span, and the filter below
  // already drops a span with no room in it. Treating `storyEnd <= wc.end` as fatal
  // killed the entire room over the one segment it can cost.
  //
  // It is reachable in normal use: the caller passes ScrollTrigger.maxScroll + 1,
  // the bridges are sized in svh, and the footer's height is content-driven — so
  // widening the window reflows the footer shorter, the document loses scroll
  // length, and the last bridge's end lands past where the page can actually
  // scroll. Measured at 1496x812: maxScroll 53929 against work-contact.end 53930.
  // One pixel, and the room went dark at that width and not at others.
  //
  // A non-finite storyEnd is still fatal, because that is a real corruption.
  if (!Number.isFinite(storyEnd)) complaints.push(`storyEnd is ${storyEnd}`)
  for (const [before, after, beforeName, afterName] of [
    [index, e, 'index', 'entry'], [e, al, 'entry', 'about-life'], [al, lf, 'about-life', 'life-frame'],
    [lf, fs, 'life-frame', 'frame-stack'], [fs, sw, 'frame-stack', 'stack-work'], [sw, wc, 'stack-work', 'work-contact'],
  ] as const) {
    const left = beforeName === 'index' ? before.start : before.end
    if (left > after.start) complaints.push(`${beforeName} ${beforeName === 'index' ? 'starts' : 'ends'} at ${round(left)}, past ${afterName}.start ${round(after.start)}`)
  }
  if (complaints.length) {
    throw new Error(`Invalid sample layout ranges at ${round(viewport.width)}x${round(viewport.height)}: ${complaints.join('; ')}`)
  }
  const spans = [
    { segment: 'index' as const, start: index.start, end: e.start },
    { segment: 'entry' as const, start: e.start, end: e.end },
    { segment: 'about-reading' as const, start: e.end, end: al.start },
    { segment: 'about-life' as const, start: al.start, end: al.end },
    { segment: 'life-reading' as const, start: al.end, end: lf.start },
    { segment: 'life-frame' as const, start: lf.start, end: lf.end },
    { segment: 'frame-reading' as const, start: lf.end, end: fs.start },
    { segment: 'frame-stack' as const, start: fs.start, end: fs.end },
    { segment: 'stack-reading' as const, start: fs.end, end: sw.start },
    { segment: 'stack-work' as const, start: sw.start, end: sw.end },
    { segment: 'work-reading' as const, start: sw.end, end: wc.start },
    { segment: 'work-contact' as const, start: wc.start, end: wc.end },
    { segment: 'contact-reading' as const, start: wc.end, end: storyEnd },
  ].filter(span=>span.end>span.start).map(span => Object.freeze(span))
  const copiedRanges = Object.freeze(Object.fromEntries(Object.entries(ranges).map(([k, v]) => [k, Object.freeze({ ...v })]))) as SampleRanges
  const pageCopies = Object.freeze(Object.fromEntries(Object.entries(pages).map(([key, value]) => [key, Object.freeze({ ...value })])))
  return Object.freeze({ version, viewport: Object.freeze({ ...viewport }), ranges: copiedRanges, spans: Object.freeze(spans), pages: pageCopies })
}

export function positionAtScroll(layout: SampleLayout, scroll: number): StoryPosition | null {
  if (!Number.isFinite(scroll)) return null
  const span = layout.spans.find(s => scroll >= s.start && scroll < s.end)
  return span ? Object.freeze({ segment: span.segment, progress: (scroll - span.start) / (span.end - span.start) }) : null
}
export function scrollAtPosition(layout: SampleLayout, position: StoryPosition): number {
  const span = layout.spans.find(s => s.segment === position.segment)
  if (!span || !Number.isFinite(position.progress) || position.progress < 0 || position.progress > 1) throw new Error('Invalid sample position')
  return span.start + position.progress * (span.end - span.start)
}

let layout: SampleLayout | null = null
let version = 0
let retained: StoryPosition | null = null
export function getSampleLayout() { return layout }
export function getRetainedSamplePosition() { return retained }
export function retainSamplePosition(position: StoryPosition | null) { retained = position }
export function invalidateSampleLayout() { layout = null }
export function publishSampleLayout(ranges: SampleRanges, viewport: SampleLayout['viewport'], pages: SampleLayout['pages'], storyEnd?:number) {
  const next = createSampleLayout(ranges, viewport, version + 1, pages, storyEnd)
  version++; layout = next
  return next
}
