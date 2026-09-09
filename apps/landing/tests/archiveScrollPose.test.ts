import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveScrollPose, createArchiveProgress } from '../src/components/personal-archive/scrollPose.ts'

void test('book opens before entering paper and the full-screen handoff is reversible', () => {
  assert.equal(archiveScrollPose(-1).cover, 0)
  assert.equal(archiveScrollPose(0.2).cover, 0)
  assert.equal(archiveScrollPose(0.48).cover, 1)
  assert.equal(archiveScrollPose(0.48).approach, 0)
  assert.equal(archiveScrollPose(1).flatten, 1)
  assert.equal(archiveScrollPose(1).departure, 0, 'No room fade before the page fills the viewport')
  for (const key of ['camera', 'cover', 'approach', 'flatten'] as const) {
    assert.equal(archiveScrollPose(1)[key], archiveScrollPose(0, true)[key], `Exit begins on the same ${key} pose`)
  }
  assert.equal(archiveScrollPose(1, true).shelf, 1)
  assert.equal(archiveScrollPose(1, true).flatten, 0)
})

void test('reverse scrolling and a direct jump produce the same model pose', () => {
  const progress = createArchiveProgress()
  const observed: ReturnType<typeof archiveScrollPose>[] = []
  const unsubscribe = progress.subscribe(() => observed.push(archiveScrollPose(progress.get())))
  progress.set(0.55)
  progress.set(1)
  progress.set(0.55)
  assert.deepEqual(observed[0], observed[2])
  unsubscribe()
  progress.set(0)
  assert.equal(observed.length, 3, 'Unmounted scene must stop receiving invalidations')
  assert.equal(progress.get(), 0, 'A remounted scene reads current position, not previous playback')
})

void test('paper homography preserves every corner and becomes identity at full screen', async () => {
  const { pageMatrix } = await import('../src/components/personal-archive/pageProjection.ts')
  const targets = [{ x: 120, y: 180 }, { x: 520, y: 130 }, { x: 650, y: 700 }, { x: 60, y: 680 }]
  const corners = [[0, 0], [1200, 0], [1200, 800], [0, 800]]
  const matrix = pageMatrix(targets, 1200, 800)!
  corners.forEach(([x, y], i) => {
    const w = matrix[3] * x + matrix[7] * y + matrix[15]
    assert.ok(Math.abs((matrix[0] * x + matrix[4] * y + matrix[12]) / w - targets[i].x) < 1e-6)
    assert.ok(Math.abs((matrix[1] * x + matrix[5] * y + matrix[13]) / w - targets[i].y) < 1e-6)
  })
  assert.deepEqual(pageMatrix(corners.map(([x, y]) => ({ x, y })), 1200, 800)?.map(x => x === 0 ? 0 : x), [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])
  assert.equal(pageMatrix([], 1200, 800), null)
})

void test('paper handoff remains an exact identity after common desktop viewport resizes', async () => {
  const { contactReadingPoints, pageMatrix } = await import('../src/components/personal-archive/pageProjection.ts')
  for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080]] as const) {
    const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]
    assert.deepEqual(
      pageMatrix(corners, width, height)?.map(value => value === 0 ? 0 : value),
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      `${width}x${height} must finish without a resize seam`,
    )
    assert.deepEqual(contactReadingPoints(width, height, 1), corners, `${width}x${height} Contact must finish on the real footer viewport`)
    const desk = contactReadingPoints(width, height, 0)
    assert.ok(desk[0].x > 0 && desk[0].y > 0 && desk[2].x < width && desk[2].y < height, 'Contact begins on an inset desk plane, not the Work folder')
  }
})

void test('paper projection rejects non-finite, folded and edge-on surfaces', async () => {
  const { pageMatrix } = await import('../src/components/personal-archive/pageProjection.ts')
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
  assert.equal(pageMatrix(square, Infinity, 800), null)
  assert.equal(pageMatrix([{ x: NaN, y: 0 }, ...square.slice(1)], 1200, 800), null)
  assert.equal(pageMatrix([square[0], square[2], square[1], square[3]], 1200, 800), null)
  assert.equal(pageMatrix(square.map(p => ({ x: p.x, y: 0 })), 1200, 800), null)
  assert.ok(pageMatrix([...square].reverse(), 1200, 800), 'An ordinary reversed winding remains projectable')
})
