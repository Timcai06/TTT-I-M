import test from 'node:test'
import assert from 'node:assert/strict'
import { createSharedResource } from '../src/lib/resources/sharedResource.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

void test('deduplicates concurrent consumers and caches a successful immutable resource', async () => {
  const pending = deferred<string>()
  let calls = 0
  const resource = createSharedResource(async () => {
    calls += 1
    return pending.promise
  })

  const first = resource.load()
  const second = resource.load()
  pending.resolve('ready')

  assert.equal(await first, 'ready')
  assert.equal(await second, 'ready')
  assert.equal(await resource.load(), 'ready')
  assert.equal(calls, 1)
})

void test('one cancelled consumer cannot abort a request still used by another consumer', async () => {
  const pending = deferred<string>()
  let underlyingAborted = false
  const resource = createSharedResource((signal) => {
    signal.addEventListener('abort', () => { underlyingAborted = true }, { once: true })
    return pending.promise
  })
  const firstController = new AbortController()
  const secondController = new AbortController()
  const first = resource.load(firstController.signal)
  const second = resource.load(secondController.signal)

  firstController.abort(new Error('first left'))
  await assert.rejects(first, /first left/)
  assert.equal(underlyingAborted, false)

  pending.resolve('ready')
  assert.equal(await second, 'ready')
})

void test('leaving the last consumer physically aborts the underlying request and permits retry', async () => {
  let calls = 0
  let aborted = false
  const resource = createSharedResource((signal) => {
    calls += 1
    return new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        aborted = true
        reject(signal.reason instanceof Error ? signal.reason : new Error('underlying request aborted'))
      }, { once: true })
    })
  })
  const controller = new AbortController()
  const request = resource.load(controller.signal)
  await Promise.resolve()
  controller.abort(new Error('viewport left'))

  await assert.rejects(request, /viewport left/)
  await Promise.resolve()
  assert.equal(aborted, true)

  const retryController = new AbortController()
  const retry = resource.load(retryController.signal)
  await Promise.resolve()
  retryController.abort(new Error('retry stopped'))
  await assert.rejects(retry, /retry stopped/)
  assert.equal(calls, 2)
})

void test('a cancelled request that resolves late cannot populate the cache or overwrite a retry', async () => {
  const firstRequest = deferred<string>()
  let calls = 0
  const resource = createSharedResource(() => {
    calls += 1
    return calls === 1 ? firstRequest.promise : Promise.resolve('fresh')
  })
  const controller = new AbortController()
  const stale = resource.load(controller.signal)
  await Promise.resolve()
  controller.abort(new Error('stale consumer left'))
  await assert.rejects(stale, /stale consumer left/)

  const fresh = resource.load()
  assert.equal(await fresh, 'fresh')
  firstRequest.resolve('stale')
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(await resource.load(), 'fresh')
  assert.equal(calls, 2)
})
