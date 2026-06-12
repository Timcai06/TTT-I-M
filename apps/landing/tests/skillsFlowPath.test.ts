import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSkillsFlowGeometry, buildSkillsFlowPathD } from '../src/lib/skillsFlowPath.ts'

const frame = { viewportWidth: 1440, startY: 200, endY: 2200 }

void test('flow path anchors span screen-left entry to screen-right exit', () => {
  const { start, segments } = buildSkillsFlowGeometry(frame)
  assert.equal(start.x, 0)
  assert.equal(start.y, frame.startY - 120)

  const end = segments[2].to
  assert.equal(end.x, frame.viewportWidth)
  assert.equal(end.y, frame.endY + 120)
})

void test('serpentine bends sit at 72% and 28% of the viewport width', () => {
  const { segments } = buildSkillsFlowGeometry(frame)
  assert.equal(segments[0].to.x, frame.viewportWidth * 0.72)
  assert.equal(segments[1].to.x, frame.viewportWidth * 0.28)
})

void test('curve is C1-continuous at both bends (vertical tangents)', () => {
  const { segments } = buildSkillsFlowGeometry(frame)

  // At P1: segment 0 enters and segment 1 leaves on the same vertical tangent
  // (control points share P1's x), so there's no visible kink.
  assert.equal(segments[0].cp2.x, segments[0].to.x)
  assert.equal(segments[1].cp1.x, segments[0].to.x)

  // Same at P2.
  assert.equal(segments[1].cp2.x, segments[1].to.x)
  assert.equal(segments[2].cp1.x, segments[1].to.x)
})

void test('curve y is monotonically increasing (lengthAtY bisection relies on it)', () => {
  const { start, segments } = buildSkillsFlowGeometry(frame)
  const ys = [
    start.y,
    ...segments.flatMap(({ cp1, cp2, to }) => [cp1.y, cp2.y, to.y]),
  ]
  for (let i = 1; i < ys.length; i += 1) {
    assert.ok(ys[i] >= ys[i - 1], `control y must not decrease at index ${i}`)
  }
})

void test('path d serializes as one move plus three cubic segments', () => {
  const d = buildSkillsFlowPathD(frame)
  assert.match(d, /^M -?\d+\.\d,-?\d+\.\d( C (-?\d+\.\d,-?\d+\.\d ){2}-?\d+\.\d,-?\d+\.\d){3}$/)
})
