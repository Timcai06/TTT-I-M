import assert from 'node:assert/strict'
import test from 'node:test'
import {
  selectWorkGlassSurface,
  type WorkGlassCandidateRect,
} from '../src/lib/canvas-ui/workGlassCoordinator.ts'

const overview: WorkGlassCandidateRect = {
  id: 'overview',
  top: 40,
  bottom: 520,
  left: 0,
  right: 1200,
}

const project: WorkGlassCandidateRect = {
  id: 'project',
  top: 560,
  bottom: 1160,
  left: 0,
  right: 1200,
}

void test('Work Glass follows the surface physically under the pointer', () => {
  assert.equal(selectWorkGlassSurface(
    [overview, project],
    { clientX: 800, clientY: 700, hasMoved: true, active: true },
    1200,
    900,
    'overview',
  ), 'project')
})

void test('semantic hit-testing takes priority over preload registration order', () => {
  assert.equal(selectWorkGlassSurface(
    [overview, project],
    { clientX: 500, clientY: 480, hasMoved: true, active: true },
    1200,
    900,
    'overview',
    'project',
  ), 'project')
})

void test('a short inter-project gap preserves the current optical surface', () => {
  assert.equal(selectWorkGlassSurface(
    [overview, project],
    { clientX: 500, clientY: 548, hasMoved: true, active: true },
    1200,
    900,
    'overview',
  ), 'overview')
})

void test('handoff waits until the lens clears the outgoing project boundary', () => {
  assert.equal(selectWorkGlassSurface(
    [overview, project],
    { clientX: 500, clientY: 620, hasMoved: true, active: true },
    1200,
    900,
    'overview',
    'project',
  ), 'overview')

  assert.equal(selectWorkGlassSurface(
    [overview, project],
    { clientX: 500, clientY: 700, hasMoved: true, active: true },
    1200,
    900,
    'overview',
    'project',
  ), 'project')
})

void test('before the first pointer move the dominant viewport surface prewarms', () => {
  assert.equal(selectWorkGlassSurface(
    [
      { ...overview, top: -450, bottom: 30 },
      { ...project, top: 80, bottom: 680 },
    ],
    { clientX: 0, clientY: 0, hasMoved: false, active: false },
    1200,
    900,
    null,
  ), 'project')
})

void test('Work keeps the current optical source across an intentional interlude', () => {
  assert.equal(selectWorkGlassSurface(
    [
      { ...overview, top: -1500, bottom: -900 },
      { ...project, top: 1400, bottom: 2000 },
    ],
    { clientX: 600, clientY: 450, hasMoved: true, active: true },
    1200,
    900,
    'overview',
    null,
    true,
  ), 'overview')
})
