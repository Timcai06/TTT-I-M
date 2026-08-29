import test from 'node:test'
import assert from 'node:assert/strict'

import { frameImageSources } from '../src/data/frameImageSources.generated.ts'

void test('Frame manifest exposes intrinsic dimensions for every responsive candidate', () => {
  const entries = Object.entries(frameImageSources)
  assert.ok(entries.length > 0)

  for (const [originalSrc, candidates] of entries) {
    assert.ok(candidates.some((candidate) => candidate.src === originalSrc), `${originalSrc} is missing its original candidate`)

    for (const candidate of candidates) {
      assert.ok(candidate.width > 0, `${candidate.src} must have a positive width`)
      assert.ok(candidate.height > 0, `${candidate.src} must have a positive height`)
    }
  }
})

void test('Frame responsive candidates retain a stable aspect ratio', () => {
  for (const [originalSrc, candidates] of Object.entries(frameImageSources)) {
    const original = candidates.find((candidate) => candidate.src === originalSrc)
    assert.ok(original)

    const originalRatio = original.width / original.height
    for (const candidate of candidates) {
      const ratio = candidate.width / candidate.height
      assert.ok(Math.abs(ratio - originalRatio) < 0.003, `${candidate.src} changed aspect ratio`)
    }
  }
})
