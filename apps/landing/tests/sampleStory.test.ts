import test from 'node:test'
import assert from 'node:assert/strict'

import { PERSONAL_ARCHIVE_SAMPLE_STORY, sampleStory } from '../src/core/narrative/index.ts'
import type { SampleInput, SampleSegment } from '../src/core/narrative/types.ts'

const versions = {
  storyVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion,
  contentVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion,
} as const

function frameAt(segment: SampleSegment, progress: number) {
  return sampleStory({ position: { segment, progress }, ...versions })
}

void test('samples the fixed semantic world at reading and extraction boundaries', () => {
  assert.deepEqual(frameAt('about-reading', 0.37).world, {
    notebook: { openness: 1 },
    envelope: { openness: 0 },
    photo: { contentId: 'life-football-action', extraction: 0, placement: { kind: 'life' } },
    wallPrints: { settling: 0 },
    cabinet: { drawerOpenness: 0, folderLift: 0 },
    screen: { mode: 'inactive', contentId: 'frame-final-horizon' },
  })
  assert.deepEqual(frameAt('about-life', 0).world, frameAt('about-reading', 1).world)
  // Read the window from the spec rather than pinning literals, so restaging the
  // beat cannot silently drift the contract these assertions exist to protect:
  // the envelope is shut before extraction opens, open after, and strictly
  // monotonic in between.
  const extraction = PERSONAL_ARCHIVE_SAMPLE_STORY.timing.extraction
  assert.equal(frameAt('about-life', extraction.start).world.envelope.openness, 0)
  assert.equal(frameAt('about-life', extraction.start).world.photo.extraction, 0)
  assert.equal(frameAt('about-life', extraction.end).world.envelope.openness, 1)
  assert.equal(frameAt('about-life', extraction.end).world.photo.extraction, 1)
  assert.ok(frameAt('about-life', extraction.start + 1e-6).world.envelope.openness > 0)
  assert.ok(frameAt('about-life', extraction.end - 1e-6).world.envelope.openness < 1)
  // The Life reading surface is anchored to the print itself, so its corners are
  // occluded by construction until the print is out. Extraction must therefore
  // finish before the target page starts revealing, or the page appears before the
  // object it is printed on does — which the line-of-sight guard in
  // archivePhotoTransfer catches as walnut blocking LifeReading.
  assert.ok(extraction.end <= PERSONAL_ARCHIVE_SAMPLE_STORY.timing.targetReveal.start,
    'the print must clear the envelope before the Life page starts revealing')

  const extractedWorld = {
    notebook: { openness: 1 },
    envelope: { openness: 1 },
    photo: { contentId: 'life-football-action', extraction: 1, placement: { kind: 'life' } },
    wallPrints: { settling: 0 },
    cabinet: { drawerOpenness: 0, folderLift: 0 },
    screen: { mode: 'inactive', contentId: 'frame-final-horizon' },
  }
  assert.deepEqual(frameAt('about-life', 1).world, extractedWorld)
  assert.deepEqual(frameAt('life-reading', 0.48).world, extractedWorld)
  assert.deepEqual(frameAt('life-frame', 0).world, extractedWorld)
})

void test('normalizes photo transfer endpoints and samples its interior', () => {
  assert.deepEqual(frameAt('life-frame', 0.18).world.photo.placement, { kind: 'life' })
  const midpoint = frameAt('life-frame', 0.41).world.photo.placement
  assert.equal(midpoint.kind, 'life-to-frame')
  if (midpoint.kind === 'life-to-frame') assert.ok(Math.abs(midpoint.progress - 0.5) < 1e-12)
  assert.ok(Math.abs(frameAt('life-frame', 0.41).world.wallPrints.settling - 0.5) < 1e-12)
  assert.deepEqual(frameAt('life-frame', 0.64).world.photo.placement, { kind: 'frame-wall' })

  const framedWorld = {
    notebook: { openness: 1 },
    envelope: { openness: 1 },
    photo: { contentId: 'life-football-action', extraction: 1, placement: { kind: 'frame-wall' } },
    wallPrints: { settling: 1 },
    cabinet: { drawerOpenness: 0, folderLift: 0 },
    screen: { mode: 'inactive', contentId: 'frame-final-horizon' },
  }
  assert.deepEqual(frameAt('life-frame', 1).world, framedWorld)
  assert.deepEqual(frameAt('frame-reading', 0.71).world, framedWorld)
})

void test('samples Index through Contact canonically', () => {
  assert.deepEqual(frameAt('index', .4).world, {
    notebook: { openness: 0 }, envelope: { openness: 0 },
    photo: { contentId: 'life-football-action', extraction: 0, placement: { kind: 'life' } },
    wallPrints: { settling: 0 }, cabinet: { drawerOpenness: 0, folderLift: 0 },
    screen: { mode: 'inactive', contentId: 'frame-final-horizon' },
  })
  assert.deepEqual(frameAt('entry', 0).world, frameAt('index', 1).world)
  assert.equal(frameAt('entry', .22).world.notebook.openness, 0)
  assert.equal(frameAt('entry', .48).world.notebook.openness, 1)
  assert.equal(frameAt('frame-stack', .03).world.screen.mode, 'inactive')
  assert.deepEqual(frameAt('frame-stack', .030001).world.screen, { mode: 'photo', contentId: 'frame-final-horizon' })
  assert.deepEqual(frameAt('stack-reading', .5).world, frameAt('frame-stack', 1).world)
  assert.deepEqual(frameAt('stack-reading', .5).presentation.readingOwner, 'skills')
  assert.deepEqual(frameAt('work-reading', .5).world.cabinet, { drawerOpenness: 1, folderLift: 1 })
  assert.equal(frameAt('work-reading', .5).presentation.readingOwner, 'projects')
  assert.deepEqual(frameAt('contact-reading', .5).world.cabinet, { drawerOpenness: .35, folderLift: 0 })
  assert.equal(frameAt('contact-reading', .5).presentation.readingOwner, 'contact')
  for (const key of ['world', 'camera', 'presentation'] as const) {
    assert.deepEqual(frameAt('contact-reading', 0)[key], frameAt('contact-reading', .5)[key])
    assert.deepEqual(frameAt('contact-reading', .5)[key], frameAt('contact-reading', 1)[key])
  }
  assert.deepEqual(frameAt('stack-work', 0).world, frameAt('stack-reading', 1).world)
  assert.deepEqual(frameAt('work-contact', 0).world, frameAt('work-reading', 1).world)
})

void test('keeps camera and presentation intent equivalent at story boundaries', () => {
  const aboutStart = frameAt('about-life', 0)
  const lifeEnd = frameAt('about-life', 1)
  const frameEnd = frameAt('life-frame', 1)

  assert.deepEqual(aboutStart.camera, {
    mode: 'handoff',
    sourceView: 'about',
    targetView: 'life',
    sourceSurface: 'AboutReading',
    targetSurface: 'LifeReading',
    travel: 0,
    leave: 1,
    align: 0,
    dolly: 0,
    inspect: 0,
    arc: 0,
  })
  assert.deepEqual(lifeEnd.presentation, {
    sourceSurface: 'AboutReading',
    targetSurface: 'LifeReading',
    sourceReveal: 0,
    sourceExpand: 0,
    targetReveal: 1,
    targetExpand: 1,
    readingOwner: 'life',
    roomHitEnabled: false,
    focusEnabled: false,
    aperture: 0,
  })
  assert.equal(lifeEnd.camera.mode, 'handoff')
  if(lifeEnd.camera.mode!=='handoff')return
  const lifeReadingCamera=frameAt('life-reading',0).camera
  assert.equal(lifeReadingCamera.mode,'surface-fit')
  if(lifeReadingCamera.mode!=='surface-fit')return
  assert.equal(lifeEnd.camera.targetSurface, lifeReadingCamera.targetSurface)
  assert.equal(frameEnd.camera.mode, 'handoff')
  if(frameEnd.camera.mode!=='handoff')return
  const frameReadingCamera=frameAt('frame-reading',0).camera
  assert.equal(frameReadingCamera.mode,'surface-fit')
  if(frameReadingCamera.mode!=='surface-fit')return
  assert.equal(frameEnd.camera.targetSurface, frameReadingCamera.targetSurface)

  const midpoint = frameAt('life-frame', 0.41)
  assert.equal(midpoint.camera.mode, 'handoff')
  assert.ok(Math.abs(midpoint.camera.travel - 0.5) < 1e-12)
  assert.equal(midpoint.camera.arc, 1)
  assert.equal(midpoint.presentation.readingOwner, null)
})

void test('rejects unknown segments, versions, and invalid progress explicitly', () => {
  assert.throws(
    () => sampleStory({ position: { segment: 'unknown', progress: 0 } as never, ...versions }),
    /Unknown sample story segment/,
  )
  for (const progress of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(() => frameAt('about-reading', progress), /finite and between 0 and 1/)
  }
  assert.throws(
    () => sampleStory({ position: { segment: 'about-reading', progress: 0 }, ...versions, storyVersion: 'old' }),
    /Unsupported story version/,
  )
  assert.throws(
    () => sampleStory({ position: { segment: 'about-reading', progress: 0 }, ...versions, contentVersion: 'old' }),
    /Unsupported content version/,
  )
})

void test('the index segment is the opening pull-back, not a held pose', () => {
  // The visit opens tight on the monitor and the first scroll backs the camera out
  // to the room. This is the invariant the old `inspection` field cannot express:
  // it is scroll, not a click, and it is monotonic.
  assert.deepEqual(frameAt('index', 0).camera, { mode: 'index', pullback: 0 })
  let previous = -1
  for (let step = 0; step <= 100; step++) {
    const camera = frameAt('index', step / 100).camera
    assert.equal(camera.mode, 'index')
    const pullback = camera.mode === 'index' ? camera.pullback : Number.NaN
    assert.ok(pullback >= previous, `pull-back went backwards at ${step / 100}`)
    previous = pullback
  }
  // It lands before the segment ends, so the last quarter is a held room shot
  // rather than a camera still arriving when the About flight takes over.
  assert.equal(previous, 1)
  const pullbackAt = (progress: number) => {
    const camera = frameAt('index', progress).camera
    assert.equal(camera.mode, 'index')
    return camera.mode === 'index' ? camera.pullback : Number.NaN
  }
  assert.equal(pullbackAt(.75), 1)
  assert.ok(pullbackAt(.74) < 1)
  // The Index never leaves the monitor: what moves is where the camera stands.
  assert.equal(frameAt('index', 0).presentation.targetExpand, 0)
  assert.equal(frameAt('index', 1).presentation.targetExpand, 0)
})

void test('is deterministic across forward, reverse, shuffled, and repeated sampling', () => {
  const checkpoints: Array<readonly [SampleSegment, number]> = [
    ['index', 0.35],
    ['entry', 0.48],
    ['about-reading', 0.35],
    ['about-life', 0.4],
    ['life-reading', 0.2],
    ['life-frame', 0.4],
    ['frame-reading', 0.75],
    ['frame-stack', 0.5],
    ['stack-reading', 0.3],
    ['stack-work', 0.6],
    ['work-reading', 0.25],
    ['work-contact', 0.7],
    ['contact-reading', 0.4],
  ]
  const key = ([segment, progress]: readonly [SampleSegment, number]) => `${segment}:${progress}`
  const forward = new Map(checkpoints.map(position => [key(position), frameAt(...position)]))
  const reverse = new Map([...checkpoints].reverse().map(position => [key(position), frameAt(...position)]))
  const shuffled = [checkpoints[8], checkpoints[0], checkpoints[12], checkpoints[4], checkpoints[2], checkpoints[10], checkpoints[6], checkpoints[1], checkpoints[11], checkpoints[5], checkpoints[9], checkpoints[3], checkpoints[7]]

  for (const position of shuffled) {
    assert.deepEqual(frameAt(...position), forward.get(key(position)))
    assert.deepEqual(reverse.get(key(position)), forward.get(key(position)))
  }

  const target = frameAt('about-life', 0.4)
  const repeated = frameAt('about-life', 0.4)
  assert.deepEqual(repeated, target)
  assert.notEqual(repeated, target)
  assert.notEqual(repeated.world, target.world)
  assert.doesNotMatch(
    JSON.stringify(target),
    /NotebookOpen|LifeEnvelopeOpen|LifePhotoExtract|FramePrintSettle|WorkDrawerOpen|WorkFolderLift|CinemaRailTravel|"clips?"|"nodes?"|"actions?"/i,
  )
})

void test('does not mutate its input or expose shared mutable output', () => {
  const input: SampleInput = {
    position: { segment: 'life-frame', progress: 0.4 },
    ...versions,
  }
  const original = structuredClone(input)
  const first = sampleStory(input)
  const firstSnapshot = structuredClone(first)
  const second = sampleStory(input)

  assert.deepEqual(input, original)
  assert.deepEqual(first, firstSnapshot)
  assert.deepEqual(second, firstSnapshot)
  assert.notEqual(first.position, input.position)
  assert.notEqual(first.world.photo.placement, second.world.photo.placement)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.world))
  assert.ok(Object.isFrozen(first.world.photo.placement))
  assert.throws(() => {
    ;(first.world.notebook as { openness: number }).openness = 0
  }, TypeError)
  assert.deepEqual(first, firstSnapshot)
})
