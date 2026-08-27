import test from 'node:test'
import assert from 'node:assert/strict'

import {
  displayedProgressValue,
  introCharGroup,
  introRiseStagger,
  progressDampFactor,
  stepDisplayedProgress,
} from '../src/lib/loaderTiming.ts'

// Groups are positional over 'Tim Cai.': [T] [im␣] [Cai] [.]
void test('intro chars group as T / im+space / Cai / dot', () => {
  const text = 'Tim Cai.'
  const groups = text.split('').map((_, i) => introCharGroup(i))
  assert.deepEqual(groups, [0, 1, 1, 1, 2, 2, 2, 3])
})

void test('group beats dominate the rise stagger over per-char offsets', () => {
  // Last char of one group must still land before the first char of the next
  // group's beat: max in-group offset (index 7 → 0.126) < group beat (0.16).
  const lastOfGroup = introRiseStagger(0, 7)
  const firstOfNextGroup = introRiseStagger(1, 0)
  assert.ok(lastOfGroup < firstOfNextGroup)

  // Stagger grows monotonically across the real 'Tim Cai.' sequence.
  const seq = Array.from({ length: 8 }, (_, i) => introRiseStagger(introCharGroup(i), i))
  for (let i = 1; i < seq.length; i += 1) {
    assert.ok(seq[i] > seq[i - 1], `stagger must increase at index ${i}`)
  }
})

void test('progress damp accelerates once the render-ready gate opens', () => {
  assert.ok(progressDampFactor(true) > progressDampFactor(false))
})

void test('displayed progress converges to target without overshooting', () => {
  let displayed = 0
  for (let i = 0; i < 300; i += 1) {
    displayed = stepDisplayedProgress(displayed, 1, true)
    assert.ok(displayed <= 1)
  }
  assert.ok(displayed > 0.999, `should converge near 1, got ${displayed}`)
})

void test('display value is capped at 99 until the render-ready gate opens', () => {
  // Even when the damped value sits just under 1, the counter must not show 100
  // before the gate opens — 100% means "the panel may exit now".
  assert.equal(displayedProgressValue(0.999, false), 99)
  assert.equal(displayedProgressValue(1, false), 99)
  assert.equal(displayedProgressValue(0.42, false), 42)
})

void test('display value reaches exactly 100 once the render-ready gate opens', () => {
  assert.equal(displayedProgressValue(0.995, true), 100)
  assert.equal(displayedProgressValue(1, true), 100)
  // ceil, so a freshly-ready low value still rounds up rather than stalling
  assert.equal(displayedProgressValue(0.001, true), 1)
})
