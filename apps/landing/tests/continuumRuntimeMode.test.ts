import test from 'node:test'
import assert from 'node:assert/strict'
import { getContinuumFrameloop, shouldRunContinuumFrame } from '../src/lib/continuum/continuumRuntimeMode.ts'

void test('continuum does not run while the site is not live', () => {
  assert.equal(shouldRunContinuumFrame('booting', 0.2), false)
  assert.equal(shouldRunContinuumFrame('intro', 0.2), false)
  assert.equal(shouldRunContinuumFrame('transitioning', 0.2), false)
})

void test('continuum only runs when visible during live stage', () => {
  assert.equal(shouldRunContinuumFrame('live', 0), false)
  assert.equal(shouldRunContinuumFrame('live', 0.0005), false)
  assert.equal(shouldRunContinuumFrame('live', 0.02), true)
})

void test('continuum frameloop follows the runtime gate', () => {
  assert.equal(getContinuumFrameloop('live', 0.02), 'always')
  assert.equal(getContinuumFrameloop('live', 0), 'never')
  assert.equal(getContinuumFrameloop('transitioning', 0.2), 'never')
})
