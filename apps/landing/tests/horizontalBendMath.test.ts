import test from 'node:test'
import assert from 'node:assert/strict'

import {
  bendEdgeStrengths,
  calculateCrossAxisScale,
  calculateHorizontalBendGeometry,
  mapPointerToHorizontalBend,
} from '../src/lib/canvas-ui/horizontalBendMath.ts'

void test('right-to-left bend flattens the entering left and leaving right endpoints', () => {
  assert.deepEqual(bendEdgeStrengths(0, 'right-to-left'), { left: 0, right: 1 })
  assert.deepEqual(bendEdgeStrengths(0.5, 'right-to-left'), { left: 1, right: 1 })
  assert.deepEqual(bendEdgeStrengths(1, 'right-to-left'), { left: 1, right: 0 })
})

void test('left-to-right bend mirrors edge strengths', () => {
  assert.deepEqual(bendEdgeStrengths(0, 'left-to-right'), { left: 1, right: 0 })
  assert.deepEqual(bendEdgeStrengths(0.5, 'left-to-right'), { left: 1, right: 1 })
  assert.deepEqual(bendEdgeStrengths(1, 'left-to-right'), { left: 0, right: 1 })
})

void test('pointer mapping preserves the central seventy percent', () => {
  assert.equal(mapPointerToHorizontalBend(500, 1000), 500)
  assert.equal(mapPointerToHorizontalBend(150, 1000), 150)
  assert.notEqual(mapPointerToHorizontalBend(20, 1000), 20)
  assert.notEqual(mapPointerToHorizontalBend(980, 1000), 980)
})

void test('horizontal port preserves Canvas UI physical geometry on wide screens', () => {
  const geometry = calculateHorizontalBendGeometry(1440, 900, {
    zone: 240,
    rounding: 150,
    perspective: 700,
  })

  assert.equal(geometry.zone, 240 / 900)
  assert.equal(geometry.rounding, 150 / 900)
  assert.equal(geometry.perspective, 700 / 900)
  assert.equal(geometry.pixelX, 1.5 / 1440)
  assert.equal(geometry.pixelY, 1.5 / 900)
})

void test('horizontal geometry remains finite and clamps its fold region', () => {
  const geometry = calculateHorizontalBendGeometry(0, 100, {
    zone: 240,
    rounding: 480,
    perspective: 20,
  })

  assert.equal(geometry.zone, 0.49)
  assert.equal(geometry.rounding, 0.49)
  assert.equal(geometry.perspective, 0.5)
  assert.equal(geometry.pixelX, 1.5)
})

void test('cross-axis perspective preserves depth while bounding vertical crop', () => {
  assert.equal(calculateCrossAxisScale(0, 0.78, 0.5, 0.92, 1.06), 1)
  assert.equal(calculateCrossAxisScale(-0.4, 0.78, 0.5, 0.92, 1.06), 0.92)
  assert.equal(calculateCrossAxisScale(0.4, 0.78, 0.5, 0.92, 1.06), 1.06)

  const subtleDepth = calculateCrossAxisScale(-0.08, 0.78, 0.5, 0.92, 1.06)
  assert.ok(subtleDepth < 1)
  assert.ok(subtleDepth > 0.92)
})
