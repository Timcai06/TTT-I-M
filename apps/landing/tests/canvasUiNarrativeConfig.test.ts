import test from 'node:test'
import assert from 'node:assert/strict'

import { FRAME_PARTICLE_CONFIG } from '../src/lib/canvas-ui/particleScrollConfig.ts'

void test('Frame Particle Scroll retains the CanvasUI demo values', () => {
  assert.deepEqual(FRAME_PARTICLE_CONFIG, {
    point: 0.68,
    band: 420,
    density: 2,
    size: 1.25,
    spread: 220,
    gravity: 0.35,
    drift: 0.7,
    swirl: 60,
    stagger: 0.7,
    fade: 0.85,
    settle: 1.2,
    smoothing: 0.6,
  })
})
