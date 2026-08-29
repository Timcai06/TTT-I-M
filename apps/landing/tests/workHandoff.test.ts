import assert from 'node:assert/strict'
import test from 'node:test'
import { consumePendingWorkHandoff, markWorkHandoffPending } from '../src/lib/workHandoff.ts'

void test('a Work handoff survives a late subscriber and can be consumed only once', () => {
  assert.equal(consumePendingWorkHandoff(), false)
  markWorkHandoffPending()
  assert.equal(consumePendingWorkHandoff(), true)
  assert.equal(consumePendingWorkHandoff(), false)
})
