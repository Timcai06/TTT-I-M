import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera } from 'three'
import { projectArchiveQuad, samplePageLayout } from '../src/components/personal-archive/archiveReadingSurface.ts'
import { solveArchiveCamera, type FinalArchiveCamera } from '../src/components/personal-archive/archiveCameraRig.ts'
import { sampleStory } from '../src/core/narrative/sampleStory.ts'
import { PERSONAL_ARCHIVE_SAMPLE_STORY as story } from '../src/core/narrative/specs.ts'
import type { SampleSegment } from '../src/core/narrative/types.ts'
const camera = new PerspectiveCamera(90, 2, .01, 80)
camera.position.set(0, 0, 2); camera.updateMatrixWorld(true)
const final: FinalArchiveCamera = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), view: camera.matrixWorldInverse.toArray(), projection: camera.projectionMatrix.toArray(), fov: 90, aspect: 2, near: .01, far: 80, focus: 2 }
const points = [[-2, 1, 0], [2, 1, 0], [2, -1, 0], [-2, -1, 0]]
const layout = { width: 1000, height: 500, pageWidth: 640, pageHeight: 300, originX: 25, originY: 10 }
void test('projects four corners using viewport dimensions and page-local homography independently', () => {
  const result = projectArchiveQuad(points, final, layout, 0, 0)
  const expected = [[225, 115], [725, 115], [725, 365], [225, 365]]
  result.corners.forEach((p, i) => { assert.ok(Math.abs(p.x - expected[i][0]) < 1e-6); assert.ok(Math.abs(p.y - expected[i][1]) < 1e-6) })
  const m = result.matrix
  for (const [i, [x, y]] of [[0, 0], [640, 0], [640, 300], [0, 300]].entries()) {
    const w = m[3] * x + m[7] * y + m[15]
    assert.ok(Math.abs((m[0] * x + m[4] * y + m[12]) / w - expected[i][0]) < 1e-6)
    assert.ok(Math.abs((m[1] * x + m[5] * y + m[13]) / w - expected[i][1]) < 1e-6)
  }
  assert.ok(Object.isFrozen(result.matrix))
})
void test('rejects near-plane, nonfinite, and degenerate source or target quads', () => {
  assert.throws(() => projectArchiveQuad(points.map(p => [p[0], p[1], 1.999]), final, layout, 0, .0018), /near/)
  assert.throws(() => projectArchiveQuad(points.map(() => [0, 0, 0]), final, layout, 0, 0), /Degenerate/)
  assert.throws(() => projectArchiveQuad([[NaN, 0, 0], ...points.slice(1)], final, layout, 0, 0), /Nonfinite/)
})

const plane = (x: number, y: number, z: number) => [[x-.7,y+.45,z],[x+.7,y+.45,z],[x+.7,y-.45,z],[x-.7,y-.45,z]]
const anchors = {
  AboutReading: plane(-1.2, .3, 0), LifeReading: plane(-.4, .2, -.1),
  FrameReading: plane(.5, .25, -.2), StackReading: plane(1.2, .1, -.15),
  WorkReading: plane(.8, -.1, -.3), ContactReading: plane(.2, -.3, -.5),
}
const storyFrame = (segment: SampleSegment, progress: number, inspection = 0) => sampleStory({
  position: { segment, progress }, storyVersion: story.storyVersion, contentVersion: story.contentVersion,
  user: { indexInspection: inspection },
})
const solved = (segment: SampleSegment, progress: number, inspection = 0) => solveArchiveCamera(storyFrame(segment, progress, inspection), anchors, { width: 1440, height: 900 })
const closeCamera = (left: FinalArchiveCamera, right: FinalArchiveCamera) => {
  for (const key of ['position','quaternion','view','projection'] as const) left[key].forEach((value, index) => assert.ok(Math.abs(value - right[key][index]) < 1e-9, `${key}[${index}]`))
  assert.ok(Math.abs(left.fov - right.fov) < 1e-9)
  assert.ok(Math.abs(left.focus - right.focus) < 1e-9)
}

void test('Index camera stays canonical while its real monitor content remains interactive', () => {
  closeCamera(solved('index', .999), solved('entry', 0))
  closeCamera(solved('entry', 1), solved('about-reading', .5))
  const base = solved('index', .5, 0)
  const inspected = solved('index', .5, 1)
  closeCamera(inspected, base)
  closeCamera(solved('index', .1, .7), solved('index', .9, .7))
})

void test('every physical handoff shares exact reading endpoints and finite mid-stops', () => {
  const transitions = [
    ['about-reading', 'about-life', 'life-reading'],
    ['life-reading', 'life-frame', 'frame-reading'],
    ['frame-reading', 'frame-stack', 'stack-reading'],
    ['stack-reading', 'stack-work', 'work-reading'],
    ['work-reading', 'work-contact', 'contact-reading'],
  ] as const
  for (const [source, handoff, target] of transitions) {
    closeCamera(solved(source, .4), solved(handoff, 0))
    closeCamera(solved(handoff, 1), solved(target, .6))
    for (const progress of [.18, .41, .64, .82]) {
      const stopped = solved(handoff, progress)
      assert.ok([...stopped.position, ...stopped.quaternion, ...stopped.view, ...stopped.projection, stopped.focus].every(Number.isFinite))
      closeCamera(stopped, solved(handoff, progress))
    }
  }
  closeCamera(solved('contact-reading', 0), solved('contact-reading', .5))
  closeCamera(solved('contact-reading', .5), solved('contact-reading', 1))
})

void test('long-form handoffs remain continuous and keep every visible page outside the near plane', () => {
  for (const segment of ['about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact'] as const) {
    let previous = solved(segment, 0)
    for (let index = 1; index <= 100; index++) {
      const progress = index / 100
      const frame = storyFrame(segment, progress)
      const current = solveArchiveCamera(frame, anchors, { width: 1440, height: 900 })
      const step = Math.hypot(...current.position.map((value, axis) => value - previous.position[axis]))
      assert.ok(step < .16, `${segment} camera jumped ${step} in one percent of scroll`)
      if (frame.camera.mode === 'handoff') {
        if (frame.presentation.sourceReveal > 0 && frame.presentation.sourceSurface) {
          projectArchiveQuad(anchors[frame.presentation.sourceSurface], current, layout, frame.presentation.sourceExpand, .0018)
        }
        if (frame.presentation.targetReveal > 0 && frame.presentation.targetSurface) {
          projectArchiveQuad(anchors[frame.presentation.targetSurface], current, layout, frame.presentation.targetExpand, .0015)
        }
      }
      previous = current
    }
  }
})

// A projected page is measured in viewport space. The Index panel is
// `position: fixed` inside `.hero`, which scrolls, and a fixed element has no
// offsetParent — so the old `?? page.parentElement` fallback added `.hero`'s
// rect.top (exactly -scrollY) to an origin that must not move. The corner
// formula subtracts originY, so the panel slid down one pixel per pixel
// scrolled. This pins the invariant rather than the symptom: a fixed page's
// origin does not depend on where its ancestors have scrolled to.
class FakeElement {}
const previousHTMLElement = globalThis.HTMLElement
const scrollingAncestor = (top: number) => Object.assign(new FakeElement(), {
  getBoundingClientRect: () => ({ top, left: 0 }),
}) as unknown as HTMLElement
const fixedPage = (ancestorTop: number) => ({
  offsetParent: null,
  parentElement: scrollingAncestor(ancestorTop),
  offsetWidth: 640, offsetHeight: 300, offsetLeft: 0, offsetTop: 0,
  ownerDocument: { defaultView: { getComputedStyle: () => ({ position: 'fixed' }) } },
}) as unknown as HTMLElement

void test('a fixed projected page keeps one origin however far its ancestors scroll', () => {
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement
  try {
    const atTop = samplePageLayout(fixedPage(0), 1000, 500)
    for (const scrolled of [-200, -600, -800, -4000]) {
      const layout = samplePageLayout(fixedPage(scrolled), 1000, 500)
      assert.equal(layout.originY, atTop.originY, `origin moved with a ${-scrolled}px scroll`)
      assert.equal(layout.originX, atTop.originX)
    }
    assert.equal(atTop.originY, 0)
    // The old code produced exactly the scroll offset, which is the bug's signature.
    assert.notEqual(samplePageLayout(fixedPage(-800), 1000, 500).originY, -800)
  } finally {
    globalThis.HTMLElement = previousHTMLElement
  }
})

void test('an in-flow projected page still measures against its offset parent', () => {
  globalThis.HTMLElement = FakeElement as unknown as typeof FakeElement & typeof HTMLElement
  try {
    const page = {
      offsetParent: scrollingAncestor(40),
      parentElement: scrollingAncestor(-999),
      offsetWidth: 640, offsetHeight: 300, offsetLeft: 12, offsetTop: 7,
      ownerDocument: { defaultView: { getComputedStyle: () => ({ position: 'static' }) } },
    } as unknown as HTMLElement
    const layout = samplePageLayout(page, 1000, 500)
    assert.equal(layout.originY, 47)
    assert.equal(layout.originX, 12)
  } finally {
    globalThis.HTMLElement = previousHTMLElement
  }
})
