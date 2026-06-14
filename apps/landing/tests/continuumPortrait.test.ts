import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPortraitTargetData } from '../src/lib/continuum/forms/portrait.ts'

function rgba(width: number, height: number, pixels: Array<[number, number, number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4)
  pixels.forEach(([r, g, b, a], index) => {
    const offset = index * 4
    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = a
  })
  return data
}

void test('portrait target maps a bright center pixel near the origin', () => {
  const data = rgba(3, 3, [
    [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255],
    [0, 0, 0, 255], [255, 255, 255, 255], [0, 0, 0, 255],
    [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255],
  ])

  const target = buildPortraitTargetData({ width: 3, height: 3, data }, 2, { threshold: 0.2, jitter: 0 })

  assert.equal(target.length, 2 * 2 * 4)
  assert.equal(target[3], 1)
  assert.ok(Math.abs(target[0] ?? 1) < 0.001)
  assert.ok(Math.abs(target[1] ?? 1) < 0.001)
  assert.ok((target[2] ?? 0) > 0)
})

void test('portrait target preserves horizontal image direction', () => {
  const data = rgba(3, 1, [
    [255, 255, 255, 255], [0, 0, 0, 255], [240, 240, 240, 255],
  ])

  const target = buildPortraitTargetData({ width: 3, height: 1, data }, 2, { threshold: 0.2, jitter: 0 })
  const xs = [target[0], target[4], target[8], target[12]]

  assert.ok(xs.some((x) => x < -0.5), `expected at least one left-side target, got ${xs.join(',')}`)
  assert.ok(xs.some((x) => x > 0.5), `expected at least one right-side target, got ${xs.join(',')}`)
})

void test('portrait target falls back to finite data when the image has no bright pixels', () => {
  const data = rgba(2, 2, [
    [0, 0, 0, 255], [0, 0, 0, 255],
    [0, 0, 0, 255], [0, 0, 0, 255],
  ])

  const target = buildPortraitTargetData({ width: 2, height: 2, data }, 2, { threshold: 0.9, jitter: 0 })

  assert.equal(target.length, 16)
  for (const value of target) assert.ok(Number.isFinite(value))
})
