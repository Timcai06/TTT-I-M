import assert from 'node:assert/strict'
import test from 'node:test'
import {
  glassRectContains,
  resolveGlassSourceGeometry,
  type GlassRect,
} from '../src/lib/canvas-ui/vendor/Glass/viewportGeometry.ts'

const viewport: GlassRect = {
  top: 0,
  right: 1200,
  bottom: 900,
  left: 0,
  width: 1200,
  height: 900,
}

const project: GlassRect = {
  top: 200,
  right: 1100,
  bottom: 700,
  left: 100,
  width: 1000,
  height: 500,
}

void test('maps a local project capture into a viewport-sized WebGL output', () => {
  assert.deepEqual(resolveGlassSourceGeometry(viewport, project, 2), {
    originX: 200,
    originY: 400,
    width: 2000,
    height: 1000,
  })
})

void test('keeps matching source and output geometry at the original origin', () => {
  assert.deepEqual(resolveGlassSourceGeometry(viewport, viewport, 1), {
    originX: 0,
    originY: 0,
    width: 1200,
    height: 900,
  })
})

void test('scope hit testing includes edges and rejects inter-chapter points', () => {
  assert.equal(glassRectContains(project, 100, 200), true)
  assert.equal(glassRectContains(project, 1100, 700), true)
  assert.equal(glassRectContains(project, 99, 450), false)
  assert.equal(glassRectContains(project, 600, 701), false)
})

void test('source coverage lasts until the whole lens clears the capture bounds', () => {
  assert.equal(glassRectContains(project, 1160, 450, 60), true)
  assert.equal(glassRectContains(project, 1161, 450, 60), false)
})
