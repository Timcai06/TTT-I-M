import test from 'node:test'
import assert from 'node:assert/strict'

import { createScrollFrameScheduler } from '../src/lib/scrollFrameScheduler.ts'

void test('keeps one pending frame during continuous scroll updates', () => {
  const cancelled: number[] = []
  const callbacks: FrameRequestCallback[] = []
  const scheduler = createScrollFrameScheduler({
    request: (callback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    cancel: (id) => cancelled.push(id),
    flush: () => undefined,
  })

  scheduler.schedule()
  scheduler.schedule()
  scheduler.schedule()

  assert.equal(callbacks.length, 1)
  assert.deepEqual(cancelled, [])
})

void test('releases the pending frame after it flushes', () => {
  let flushCount = 0
  const callbacks: FrameRequestCallback[] = []
  const scheduler = createScrollFrameScheduler({
    request: (callback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    cancel: () => undefined,
    flush: () => { flushCount += 1 },
  })

  scheduler.schedule()
  callbacks[0]?.(0)
  scheduler.schedule()

  assert.equal(flushCount, 1)
  assert.equal(callbacks.length, 2)
})

void test('cancels only during teardown', () => {
  const cancelled: number[] = []
  const scheduler = createScrollFrameScheduler({
    request: () => 7,
    cancel: (id) => cancelled.push(id),
    flush: () => undefined,
  })

  scheduler.schedule()
  scheduler.cancel()

  assert.deepEqual(cancelled, [7])
})
