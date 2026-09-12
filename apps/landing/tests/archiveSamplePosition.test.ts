import test from 'node:test'
import assert from 'node:assert/strict'
import { createSampleLayout, positionAtScroll, scrollAtPosition } from '../src/components/personal-archive/archiveSamplePosition.ts'
const ranges = { index:{start:0,end:90},entry: { start: 100, end: 200 }, 'about-life': { start: 300, end: 400 }, 'life-frame': { start: 500, end: 600 }, 'frame-stack': { start: 700, end: 800 }, 'stack-work':{start:900,end:1000},'work-contact':{start:1100,end:1200} }
const viewport = { width: 1440, height: 900, dpr: 1 }
void test('uses half-open actual spans in both directions and remaps semantic position', () => {
  const layout = createSampleLayout(ranges, viewport, 1)
  for (const [scroll, segment, progress] of [[0,'index',0],[100,'entry',0],[200, 'about-reading', 0], [350, 'about-life', .5], [400, 'life-reading', 0], [599, 'life-frame', .99], [600, 'frame-reading', 0],[750,'frame-stack',.5],[800,'stack-reading',0],[950,'stack-work',.5],[1000,'work-reading',0],[1150,'work-contact',.5],[1200,'contact-reading',0]] as const) assert.deepEqual(positionAtScroll(layout, scroll), { segment, progress })
  assert.equal(positionAtScroll(layout, -1), null); assert.equal(positionAtScroll(layout, 1201), null)
  assert.equal(scrollAtPosition(layout, { segment: 'life-reading', progress: .75 }), 475)
  const resized = createSampleLayout({ ...ranges, 'life-frame': { start: 550, end: 650 } }, viewport, 2)
  assert.equal(scrollAtPosition(resized, { segment: 'life-reading', progress: .75 }), 512.5)
  assert.ok(Object.isFrozen(layout.spans))
})
void test('rejects reversed overlapping missing and nonfinite layouts and skips zero reading spans', () => {
  assert.throws(() => createSampleLayout({ ...ranges, 'about-life': { start: 190, end: 300 } }, viewport, 1))
  assert.throws(() => createSampleLayout({ ...ranges, entry: { start: NaN, end: 100 } }, viewport, 1))
  assert.throws(() => createSampleLayout(ranges, { ...viewport, width: 0 }, 1))
  const layout = createSampleLayout({ ...ranges, 'about-life': { start: 200, end: 400 } }, viewport, 1)
  assert.deepEqual(positionAtScroll(layout, 200), { segment: 'about-life', progress: 0 })
})

// A document that cannot scroll past its last bridge is a fact about the page, not
// a corrupt layout — and it used to disable the entire room.
//
// The caller passes ScrollTrigger.maxScroll + 1 as storyEnd. The bridges are sized
// in svh; the footer's height comes from its content. Widening the window reflows
// the footer shorter, the document loses scroll length, and work-contact.end lands
// past where the page can actually be scrolled. Measured on the machine that showed
// the fault: at 1496x812, maxScroll 53929 against work-contact.end 53930. One pixel.
//
// `storyEnd` bounds nothing but the trailing contact-reading span, and the span
// filter already drops one with no room in it, so the only honest cost is that
// segment. Everything before it must still work.
void test('a document too short for a trailing read still yields a usable layout', () => {
  const short = createSampleLayout(ranges, viewport, 3, {}, ranges['work-contact'].end)
  assert.equal(short.spans.some((span) => span.segment === 'contact-reading'), false)
  // Every earlier segment is untouched, which is the whole point of not throwing.
  for (const [scroll, segment] of [[0, 'index'], [100, 'entry'], [200, 'about-reading'], [350, 'about-life'], [1150, 'work-contact']] as const) {
    assert.equal(positionAtScroll(short, scroll)?.segment, segment)
  }
  assert.equal(positionAtScroll(short, 1200), null)
  // One pixel of room is all it takes to get the segment back.
  const exact = createSampleLayout(ranges, viewport, 4, {}, ranges['work-contact'].end + 1)
  assert.equal(positionAtScroll(exact, 1200)?.segment, 'contact-reading')
})

void test('a non-finite storyEnd is still refused, and the message names it', () => {
  assert.throws(
    () => createSampleLayout(ranges, viewport, 5, {}, Number.NaN),
    (error: Error) => /storyEnd is NaN/.test(error.message),
  )
})
