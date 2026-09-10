import assert from 'node:assert/strict'
import test from 'node:test'
import { isArchiveReadingFallbackReady } from '../src/lib/resources/preloadReadiness.ts'

void test('only a fully settled archive-renderer failure can enter reading fallback', () => {
  assert.equal(isArchiveReadingFallbackReady({ completed: 12, total: 12, failed: ['renderer:personal-archive'] }), true)
  assert.equal(isArchiveReadingFallbackReady({ completed: 11, total: 12, failed: ['renderer:personal-archive'] }), false)
  assert.equal(isArchiveReadingFallbackReady({ completed: 12, total: 12, failed: ['layout:chapter-pages'] }), false)
  assert.equal(isArchiveReadingFallbackReady({ completed: 12, total: 12, failed: ['renderer:personal-archive', 'fonts:document'] }), false)
  assert.equal(isArchiveReadingFallbackReady({ completed: 12, total: 12, failed: [] }), false)
})
