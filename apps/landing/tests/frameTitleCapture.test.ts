import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canPromoteFrameTitleCapture,
  clearFrameTitleRevealStyles,
  cloneStaticFrameTitleCapture,
  pixelBufferHasVisibleAlpha,
} from '../src/components/frame/frameTitleCapture.ts'

void test('Frame capture clears only GSAP reveal paint state from cloned word spans', () => {
  const removed: string[][] = [[], []]
  const words = removed.map((properties) => ({
    style: {
      removeProperty(property: string) {
        properties.push(property)
      },
    },
  }))
  const capture = {
    querySelectorAll(selector: string) {
      assert.equal(selector, '.word')
      return words
    },
  }

  clearFrameTitleRevealStyles(capture as unknown as HTMLElement)
  assert.deepEqual(removed, [
    ['opacity', 'transform', 'filter'],
    ['opacity', 'transform', 'filter'],
  ])
})

void test('Frame static clone clears hidden words while leaving the semantic title untouched', () => {
  const originalRemoved: string[] = []
  const cloneRemoved: string[] = []
  const makeWord = (removed: string[]) => ({
    style: { removeProperty: (property: string) => { removed.push(property) } },
  })
  const clone = {
    attributes: new Map<string, string>(),
    style: { margin: '42px' },
    removeAttribute(name: string) { this.attributes.delete(name) },
    setAttribute(name: string, value: string) { this.attributes.set(name, value) },
    querySelectorAll() { return [makeWord(cloneRemoved)] },
  }
  const original = {
    cloneNode() { return clone },
    querySelectorAll() { return [makeWord(originalRemoved)] },
  }

  const result = cloneStaticFrameTitleCapture(original as unknown as HTMLElement) as unknown as typeof clone
  assert.equal(result, clone)
  assert.deepEqual(originalRemoved, [])
  assert.deepEqual(cloneRemoved, ['opacity', 'transform', 'filter'])
  assert.equal(clone.attributes.get('data-frame-title-particle-capture'), '')
  assert.equal(clone.attributes.get('aria-hidden'), 'true')
  assert.equal(clone.style.margin, '0')
})

void test('Frame capture becomes usable only when the sampled pixels contain alpha', () => {
  assert.equal(pixelBufferHasVisibleAlpha(new Uint8ClampedArray(16)), false)
  assert.equal(pixelBufferHasVisibleAlpha(new Uint8ClampedArray([
    255, 255, 255, 0,
    0, 0, 0, 1,
  ])), true)
})

void test('Frame enhancement cannot promote before handle acceptance or after invalidation', () => {
  assert.equal(canPromoteFrameTitleCapture({
    handleAccepted: false,
    pixelsReady: true,
    live: true,
  }), false)
  assert.equal(canPromoteFrameTitleCapture({
    handleAccepted: true,
    pixelsReady: true,
    live: false,
  }), false)
  assert.equal(canPromoteFrameTitleCapture({
    handleAccepted: true,
    pixelsReady: true,
    live: true,
  }), true)
})
