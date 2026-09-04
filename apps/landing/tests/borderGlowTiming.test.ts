import assert from 'node:assert/strict'
import test from 'node:test'

import { sampleBorderGlowSweep } from '../src/lib/borderGlowTiming.ts'

void test('border glow uses one continuous four-second choreography clock', () => {
  assert.deepEqual(sampleBorderGlowSweep(0), { angle: 110, complete: false, proximity: 0 })
  assert.equal(sampleBorderGlowSweep(500).proximity, 100)
  assert.equal(sampleBorderGlowSweep(2_500).proximity, 100)
  assert.equal(sampleBorderGlowSweep(4_000).proximity, 0)
  assert.equal(sampleBorderGlowSweep(4_000).angle, 465)
  assert.equal(sampleBorderGlowSweep(4_000).complete, true)
})

void test('border glow angle and fade remain monotonic in their active phases', () => {
  const samples = Array.from({ length: 41 }, (_, index) => sampleBorderGlowSweep(index * 100))
  for (let index = 1; index < samples.length; index += 1) {
    assert.ok(samples[index].angle >= samples[index - 1].angle)
  }
  const fade = samples.slice(25).map((sample) => sample.proximity)
  for (let index = 1; index < fade.length; index += 1) {
    assert.ok(fade[index] <= fade[index - 1])
  }
})
