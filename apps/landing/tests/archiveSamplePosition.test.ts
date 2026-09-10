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
