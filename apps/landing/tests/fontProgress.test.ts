import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fontLoadFraction } from '../src/lib/resources/fontProgress.ts'

void test('reports requested font faces and never retreats when more faces start loading', () => {
  assert.equal(fontLoadFraction(['unloaded', 'unloaded']), 0)
  const first = fontLoadFraction(['loaded', 'loading', 'unloaded'])
  assert.equal(first, 0.5)
  assert.equal(fontLoadFraction(['loaded', 'loading', 'loading', 'loading'], first), first)
  assert.equal(fontLoadFraction(['loaded', 'loaded', 'loaded', 'loading'], first), 0.75)
})
