import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acquireOptionalContextWhenAvailable,
  acquireContext,
  activeContextCount,
  activeContextOwners,
  canCreateWebGL2Context,
  forceLoseCanvasWebGLContext,
  getWebGLRecoveryDelay,
  type ContextLease,
  subscribeContextRegistry,
  tryAcquireOptionalContext,
} from '../src/lib/webgl/contextRegistry.ts'

void test('WebGL recovery backoff is bounded and rejects invalid counters', () => {
  assert.equal(getWebGLRecoveryDelay(1), 280)
  assert.equal(getWebGLRecoveryDelay(5), 1_200)
  assert.equal(getWebGLRecoveryDelay(6), 1_200)
  assert.equal(getWebGLRecoveryDelay(7), null)
  assert.throws(() => getWebGLRecoveryDelay(0), /positive integer/)
  assert.throws(() => getWebGLRecoveryDelay(1.5), /positive integer/)
})

void test('canvas teardown explicitly loses its existing WebGL context and fails closed', () => {
  let lost = 0
  const canvas = {
    getContext: (kind: string) => kind === 'webgl2'
      ? { getExtension: () => ({ loseContext: () => { lost += 1 } }) }
      : null,
  } as unknown as HTMLCanvasElement

  forceLoseCanvasWebGLContext(canvas)
  assert.equal(lost, 1)

  const denied = {
    getContext: () => { throw new Error('context denied') },
  } as unknown as HTMLCanvasElement
  assert.doesNotThrow(() => forceLoseCanvasWebGLContext(denied))
})

void test('context leases are owned, observable, and idempotent', () => {
  const baseline = activeContextCount()
  let notifications = 0
  const unsubscribe = subscribeContextRegistry(() => { notifications += 1 })

  const lease = acquireContext('registry-test-required')
  assert.equal(activeContextCount(), baseline + 1)
  assert.ok(activeContextOwners().includes('registry-test-required'))
  lease.release()
  lease.release()
  assert.equal(activeContextCount(), baseline)
  assert.equal(notifications, 2)

  unsubscribe()
  const afterUnsubscribe = acquireContext('registry-test-unsubscribed')
  afterUnsubscribe.release()
  assert.equal(notifications, 2)
  assert.equal(activeContextCount(), baseline)
})

void test('optional acquisition reserves capacity and returns a releasable lease', () => {
  const baseline = activeContextCount()
  const lease = tryAcquireOptionalContext('registry-test-optional')
  assert.ok(lease)
  assert.equal(activeContextCount(), baseline + 1)
  assert.equal(lease.owner, 'registry-test-optional')
  lease.release()
  assert.equal(activeContextCount(), baseline)
})

void test('context owners cannot be empty', () => {
  assert.throws(() => acquireContext('   '), /non-empty owner/)
  assert.throws(() => tryAcquireOptionalContext('   '), /non-empty owner/)
  assert.throws(() => acquireOptionalContextWhenAvailable('   ', () => {}), /non-empty owner/)
})

void test('WebGL2 capability probing fails closed and releases a successful probe', () => {
  const originalDocument = globalThis.document
  let lost = 0
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({
        getContext: () => ({
          getExtension: () => ({ loseContext: () => { lost += 1 } }),
        }),
      }),
    },
  })

  try {
    assert.equal(canCreateWebGL2Context(), true)
    assert.equal(lost, 1)
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ getContext: () => null }) },
    })
    assert.equal(canCreateWebGL2Context(), false)
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    })
  }
})

void test('optional consumers wait for capacity and receive one lease exactly once', () => {
  const blockers = [acquireContext('wait-blocker-a'), acquireContext('wait-blocker-b')]
  let delivered = 0
  const deliveredLeases: ContextLease[] = []
  const cancel = acquireOptionalContextWhenAvailable('waiting-surface', (lease) => {
    delivered += 1
    deliveredLeases.push(lease)
  })

  assert.equal(delivered, 0)
  blockers[0]?.release()
  assert.equal(delivered, 1)
  blockers[1]?.release()
  assert.equal(delivered, 1)

  cancel()
  deliveredLeases[0]?.release()
  assert.equal(activeContextCount(), 0)
})

void test('a cancelled optional waiter never acquires later capacity', () => {
  const blockers = [acquireContext('cancel-blocker-a'), acquireContext('cancel-blocker-b')]
  let delivered = 0
  const cancel = acquireOptionalContextWhenAvailable('cancelled-waiter', () => {
    delivered += 1
  })

  cancel()
  blockers.forEach((lease) => lease.release())

  assert.equal(delivered, 0)
  assert.equal(activeContextCount(), 0)
})

void test('a throwing optional consumer releases its lease and reports the error', () => {
  const originalReportError = globalThis.reportError
  const reported: unknown[] = []
  Object.defineProperty(globalThis, 'reportError', {
    configurable: true,
    value: (error: unknown) => { reported.push(error) },
  })

  try {
    acquireOptionalContextWhenAvailable('throwing-waiter', () => {
      throw new Error('consumer failed')
    })
    assert.equal(activeContextCount(), 0)
    assert.equal(reported.length, 1)
    assert.match(String(reported[0]), /consumer failed/)
  } finally {
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: originalReportError,
    })
  }
})

void test('a throwing registry observer cannot interrupt lease accounting', () => {
  const originalReportError = globalThis.reportError
  const reported: unknown[] = []
  Object.defineProperty(globalThis, 'reportError', {
    configurable: true,
    value: (error: unknown) => { reported.push(error) },
  })
  const unsubscribe = subscribeContextRegistry(() => {
    throw new Error('observer failed')
  })

  try {
    const lease = acquireContext('observer-failure-owner')
    assert.equal(activeContextOwners().includes('observer-failure-owner'), true)
    lease.release()
    assert.equal(activeContextCount(), 0)
    assert.equal(reported.length, 2)
  } finally {
    unsubscribe()
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: originalReportError,
    })
  }
})

void test('a broken reportError hook cannot rethrow an optional consumer failure', () => {
  const originalReportError = globalThis.reportError
  Object.defineProperty(globalThis, 'reportError', {
    configurable: true,
    value: () => { throw new Error('reporting unavailable') },
  })

  try {
    assert.doesNotThrow(() => {
      acquireOptionalContextWhenAvailable('broken-reporter-owner', () => {
        throw new Error('consumer failed')
      })
    })
    assert.equal(activeContextCount(), 0)
  } finally {
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: originalReportError,
    })
  }
})
