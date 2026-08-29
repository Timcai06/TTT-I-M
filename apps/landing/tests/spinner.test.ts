import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DOTS12,
  advanceLoaderSpinnerFrame,
  loaderSpinnerGlyph,
  nextSpinnerFrame,
} from '../src/lib/spinner.ts'

void test('dots12 keeps the official interval and complete frame cycle', () => {
  assert.equal(DOTS12.interval, 80)
  assert.equal(DOTS12.frames.length, 56)
  assert.equal(DOTS12.frames[0], '⢀⠀')
  assert.equal(DOTS12.frames.at(-1), '⠀⡀')
  assert.equal(nextSpinnerFrame(DOTS12.frames.length - 1), 0)
})

void test('loader spinner pauses while hidden and for static states', () => {
  assert.equal(advanceLoaderSpinnerFrame({ index: 9, hidden: true, ready: false, reducedMotion: false }), 9)
  assert.equal(advanceLoaderSpinnerFrame({ index: 9, hidden: false, ready: true, reducedMotion: false }), 9)
  assert.equal(advanceLoaderSpinnerFrame({ index: 9, hidden: false, ready: false, reducedMotion: true }), 9)
  assert.equal(advanceLoaderSpinnerFrame({ index: 9, hidden: false, ready: false, reducedMotion: false }), 10)
})

void test('ready and reduced-motion glyphs override animation frames', () => {
  assert.equal(loaderSpinnerGlyph({ frameIndex: 4, ready: true, reducedMotion: false }), '✓')
  assert.equal(loaderSpinnerGlyph({ frameIndex: 4, ready: false, reducedMotion: true }), '·')
  assert.equal(loaderSpinnerGlyph({ frameIndex: 4, ready: false, reducedMotion: false }), DOTS12.frames[4])
})
