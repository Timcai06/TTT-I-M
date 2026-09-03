import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acquireContext,
  activeContextCount,
  releaseContext,
  subscribeContextRegistry,
} from '../src/lib/webgl/contextRegistry.ts'

void test('context registry notifies deferred surfaces and preserves balanced accounting', () => {
  const baseline = activeContextCount()
  let notifications = 0
  const unsubscribe = subscribeContextRegistry(() => { notifications += 1 })

  acquireContext()
  assert.equal(activeContextCount(), baseline + 1)
  releaseContext()
  assert.equal(activeContextCount(), baseline)
  assert.equal(notifications, 2)

  unsubscribe()
  acquireContext()
  releaseContext()
  assert.equal(notifications, 2)
  assert.equal(activeContextCount(), baseline)
})
