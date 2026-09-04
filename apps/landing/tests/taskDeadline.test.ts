import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ResourceTimeoutError,
  runTaskWithDeadline,
} from '../src/lib/resources/taskDeadline.ts'

void test('deadline aborts the underlying resource task', async () => {
  const parent = new AbortController()
  let underlyingAborted = false
  const result = runTaskWithDeadline(
    (signal) => new Promise<void>((_, reject) => {
      signal.addEventListener('abort', () => {
        underlyingAborted = true
        reject(signal.reason instanceof Error ? signal.reason : new Error('deadline aborted'))
      }, { once: true })
    }),
    15,
    parent.signal,
  )

  await assert.rejects(result, ResourceTimeoutError)
  assert.equal(underlyingAborted, true)
})

void test('parent abort propagates its exact reason to the child task', async () => {
  const parent = new AbortController()
  const reason = new Error('route unmounted')
  let childReason: unknown
  const result = runTaskWithDeadline(
    (signal) => new Promise<void>((_, reject) => {
      signal.addEventListener('abort', () => {
        childReason = signal.reason
        reject(signal.reason instanceof Error ? signal.reason : new Error('parent aborted'))
      }, { once: true })
    }),
    1_000,
    parent.signal,
  )

  parent.abort(reason)
  await assert.rejects(result, /route unmounted/)
  assert.equal(childReason, reason)
})

void test('a completed task is not aborted by a stale deadline', async () => {
  const parent = new AbortController()
  let aborted = false
  await runTaskWithDeadline((signal) => {
    signal.addEventListener('abort', () => { aborted = true }, { once: true })
    return Promise.resolve()
  }, 15, parent.signal)

  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(aborted, false)
})

void test('a synchronous loader failure clears its deadline lifecycle', async () => {
  const parent = new AbortController()
  let childSignal: AbortSignal | undefined
  const result = runTaskWithDeadline((signal) => {
    childSignal = signal
    throw new Error('synchronous loader failure')
  }, 15, parent.signal)

  await assert.rejects(result, /synchronous loader failure/)
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(childSignal?.aborted, false)
})
