import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeFrameScrollDuration,
  FRAME_SCROLL_TIMING,
} from '../src/components/frame/frameScrollMath.ts'

void test('Frame themes cap their vertical pin duration instead of feeling scroll-locked', () => {
  const viewportHeight = 900
  const duration = computeFrameScrollDuration(11_000, viewportHeight)
  const maximum = viewportHeight * (
    FRAME_SCROLL_TIMING.maximumViewports + FRAME_SCROLL_TIMING.exitBreathViewports
  )

  assert.ok(duration <= maximum)
  assert.ok(duration < 11_000)
})

void test('Frame scroll duration stays readable for shorter desktop rails', () => {
  const viewportHeight = 900
  const duration = computeFrameScrollDuration(3_000, viewportHeight)
  const minimum = viewportHeight * (
    FRAME_SCROLL_TIMING.minimumViewports + FRAME_SCROLL_TIMING.exitBreathViewports
  )

  assert.ok(duration >= minimum)
})
