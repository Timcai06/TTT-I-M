import assert from 'node:assert/strict'
import test from 'node:test'
import { createMediaQueryStore } from '../src/lib/mediaQueryStore.ts'

void test('one native media-query listener fans out and detaches after the last consumer', () => {
  const originalWindow = globalThis.window
  const callbacks = new Set<() => void>()
  let matches = false
  let nativeAdds = 0
  let nativeRemoves = 0
  const mediaQuery = {
    get matches() { return matches },
    addEventListener(_type: string, listener: () => void) {
      nativeAdds += 1
      callbacks.add(listener)
    },
    removeEventListener(_type: string, listener: () => void) {
      nativeRemoves += 1
      callbacks.delete(listener)
    },
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: () => mediaQuery },
  })

  try {
    const store = createMediaQueryStore('(portfolio-capability)')
    let notifications = 0
    const first = store.subscribe(() => { notifications += 1 })
    const second = store.subscribe(() => { notifications += 1 })

    assert.equal(nativeAdds, 1)
    assert.equal(store.getSnapshot(), false)
    matches = true
    callbacks.forEach((listener) => listener())
    assert.equal(notifications, 2)
    assert.equal(store.getSnapshot(), true)

    first()
    assert.equal(nativeRemoves, 0)
    second()
    assert.equal(nativeRemoves, 1)
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    })
  }
})
