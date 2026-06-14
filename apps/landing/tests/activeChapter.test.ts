import test from 'node:test'
import assert from 'node:assert/strict'

import { pickActiveChapterId, type ChapterRectSnapshot } from '../src/lib/activeChapter.ts'
import { computeChapterProgressFills } from '../src/lib/chapterProgress.ts'

void test('keeps a long pinned chapter active while viewport center is inside it', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'hero', top: -9800, bottom: -9100 },
    { id: 'frame', top: -240, bottom: 1180 },
    { id: 'projects', top: 1480, bottom: 2300 },
  ]

  assert.equal(pickActiveChapterId(rects, 720, 'hero'), 'frame')
})

void test('moves to the next chapter only after the viewport center enters it', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'frame', top: -1800, bottom: 80 },
    { id: 'projects', top: 120, bottom: 980 },
  ]

  assert.equal(pickActiveChapterId(rects, 720, 'frame'), 'projects')
})

void test('keeps the previous chapter active while the center is between sections', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'frame', top: -900, bottom: 120 },
    { id: 'skills', top: 520, bottom: 1080 },
  ]

  assert.equal(pickActiveChapterId(rects, 720, 'frame'), 'frame')
})

void test('computes scroll rail fills from progress chapter top boundaries', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'hero', top: -900, bottom: -80 },
    { id: 'about', top: 0, bottom: 720 },
    { id: 'frame', top: 980, bottom: 2400 },
  ]

  assert.deepEqual(
    computeChapterProgressFills(rects, 720).map((value) => Number(value.toFixed(2))),
    [1, 0.37, 0]
  )
})

void test('keeps progress continuous across hidden interstitial sections', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'about', top: -720, bottom: -120 },
    { id: 'frame', top: 720, bottom: 1800 },
  ]

  assert.equal(Number(computeChapterProgressFills(rects, 720)[0]?.toFixed(2)), 0.75)
})

void test('continues filling the previous rail segment while viewport center is between sections', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'frame', top: -900, bottom: 120 },
    { id: 'skills', top: 520, bottom: 1080 },
  ]

  assert.deepEqual(
    computeChapterProgressFills(rects, 720).map((value) => Number(value.toFixed(2))),
    [0.89, 0]
  )
})
