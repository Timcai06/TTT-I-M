import test from 'node:test'
import assert from 'node:assert/strict'

import { LASER_CONFIG } from '../src/lib/canvas-ui/laserConfig.ts'

void test('project Laser preserves CanvasUI material defaults with a Stack-red hue', () => {
  assert.deepEqual(LASER_CONFIG.color, [1, 0.055, 0.035])
  assert.equal(LASER_CONFIG.speed, 0.3)
  assert.equal(LASER_CONFIG.offset, 140)
  assert.equal(LASER_CONFIG.thickness, 6)
  assert.equal(LASER_CONFIG.core, 1)
  assert.equal(LASER_CONFIG.radius, 20)
  assert.equal(LASER_CONFIG.glow, 2)
  assert.equal(LASER_CONFIG.wave, 10)
  assert.equal(LASER_CONFIG.width, 0.68)
  assert.equal(LASER_CONFIG.flicker, 0.2)
  assert.equal(LASER_CONFIG.reveal, 400)
  assert.equal(LASER_CONFIG.heat, 1.5)
  assert.equal(LASER_CONFIG.shimmer, 12)
  assert.equal(LASER_CONFIG.sparkle, 0.25)
  assert.equal(LASER_CONFIG.reactivity, 1)
})
