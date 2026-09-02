import test from 'node:test'
import assert from 'node:assert/strict'

import { FRAME_PARTICLE_CONFIG } from '../src/lib/canvas-ui/particleScrollConfig.ts'

void test('Frame Particle Scroll converts the final exposure into a responsive signal', () => {
  assert.deepEqual(FRAME_PARTICLE_CONFIG, {
    mode: 'dissolve',
    point: 0.61,
    band: 320,
    density: 2,
    size: 1.1,
    spread: 260,
    gravity: 0.08,
    drift: 0.4,
    swirl: 80,
    stagger: 0.58,
    fade: 0.82,
    settle: 0.82,
    smoothing: 0.26,
    frontStart: 0.18,
    frontEnd: 1.28,
  })
})
