import test from 'node:test'
import assert from 'node:assert/strict'

import { WORK_TRANSITION_NARRATIVE } from '../src/core/narrative/specs.ts'
import { defineNarrativeSpec } from '../src/core/narrative/types.ts'

void test('Work transition owns one decision-complete narrative geometry contract', () => {
  assert.equal(WORK_TRANSITION_NARRATIVE.desktopHeight, '680svh')
  assert.equal(WORK_TRANSITION_NARRATIVE.mobileHeight, '300svh')
  assert.deepEqual(
    WORK_TRANSITION_NARRATIVE.phases.map(({ id, enter, exit }) => [id, enter, exit]),
    [
      ['potential', 0.02, 0.26],
      ['system', 0.32, 0.57],
      ['proof', 0.7, 0.91],
    ],
  )
  assert.deepEqual(WORK_TRANSITION_NARRATIVE.gate, {
    progress: 0.985,
    release: 'explicit-cta',
  })
})

void test('narrative specs reject invalid progress before reaching a controller', () => {
  assert.throws(
    () => defineNarrativeSpec({
      chapter: 'invalid',
      phases: [{ id: 'broken', enter: 0.8, exit: 0.4 }],
    }),
    /must enter before it exits/,
  )
  assert.throws(
    () => defineNarrativeSpec({
      chapter: 'invalid-gate',
      gate: { progress: 1.2, release: 'explicit-cta' },
    }),
    /must be between 0 and 1/,
  )
})
