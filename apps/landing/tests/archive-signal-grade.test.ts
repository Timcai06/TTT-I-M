import assert from 'node:assert/strict'
import test from 'node:test'
import { signalGradeAt } from '../src/components/personal-archive/archiveSignalGrade.ts'
import type { SampleSegment } from '../src/core/narrative/types.ts'

void test('photo light stays continuous across chapter handoffs and reverse scrubbing', () => {
  const segments: SampleSegment[] = ['frame-reading', 'frame-stack', 'stack-reading', 'stack-work', 'work-reading', 'work-contact', 'contact-reading']
  for (let i = 1; i < segments.length; i++) {
    assert.ok(Math.abs(signalGradeAt({ segment: segments[i - 1], progress: 1 }) - signalGradeAt({ segment: segments[i], progress: 0 })) < 1e-12)
  }
  for (const segment of segments) {
    const forward = Array.from({ length: 101 }, (_, i) => signalGradeAt({ segment, progress: i / 100 }))
    const reverse = Array.from({ length: 101 }, (_, i) => signalGradeAt({ segment, progress: (100 - i) / 100 })).reverse()
    assert.deepEqual(forward, reverse)
    assert.ok(forward.every(value => value >= 0 && value <= .6000000001))
  }
  assert.equal(signalGradeAt({ segment: 'about-reading', progress: .5 }), 0)
})
