import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cloneProjectLaserCapture,
  rewriteLocalSvgReference,
  stableMaskedHeadingMediaTransform,
} from '../src/lib/canvas-ui/laserCapture.ts'
import { captureHasUsablePixels } from '../src/lib/canvas-ui/captureReadiness.ts'

class FakeStyle {
  private readonly values = new Map<string, string>()

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value)
  }

  get transform() { return this.values.get('transform') ?? '' }
  setProperty(property: string, value: string) { this.values.set(property, value) }
  getPropertyValue(property: string) { return this.values.get(property) ?? '' }
  clone() { return new FakeStyle(Object.fromEntries(this.values)) }
}

class FakeElement {
  readonly style: FakeStyle
  readonly tagName: string
  readonly classes: string[]
  readonly attributes: Map<string, string>
  readonly children: FakeElement[]

  constructor(
    tagName: string,
    classes: string[] = [],
    attributes = new Map<string, string>(),
    children: FakeElement[] = [],
    style: Record<string, string> = {},
  ) {
    this.tagName = tagName
    this.classes = classes
    this.attributes = attributes
    this.children = children
    this.style = new FakeStyle(style)
  }

  cloneNode(deep: boolean): FakeElement {
    const clonedStyle: Record<string, string> = {}
    for (const property of ['opacity', 'visibility', 'clip-path', 'transform', 'transform-origin']) {
      const value = this.style.getPropertyValue(property)
      if (value) clonedStyle[property] = value
    }
    return new FakeElement(
      this.tagName,
      [...this.classes],
      new Map(this.attributes),
      deep ? this.children.map((child) => child.cloneNode(true)) : [],
      clonedStyle,
    )
  }

  setAttribute(name: string, value: string) { this.attributes.set(name, value) }
  getAttribute(name: string) { return this.attributes.get(name) ?? null }

  querySelector<T>(selector: string): T | null {
    return (this.querySelectorAll(selector)[0] as T | undefined) ?? null
  }

  querySelectorAll<T>(selector: string): T[] {
    const selectors = selector.split(',').map((part) => part.trim().replace('\\:', ':'))
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll<FakeElement>('*')])
    if (selector === '*') return descendants as T[]
    return descendants.filter((element) => selectors.some((part) => {
      if (part.startsWith('.')) return element.classes.includes(part.slice(1))
      if (part.startsWith('[')) return element.attributes.has(part.slice(1, -1))
      return element.tagName === part
    })) as T[]
  }
}

function buildMaskedHeading() {
  const mask = new FakeElement('mask', [], new Map([['id', 'masked-heading-r0']]))
  const use = new FakeElement('use', [], new Map([['href', '#masked-heading-r0']]))
  const media = new FakeElement('div', ['masked-heading__media'], new Map(), [], {
    transform: 'translate3d(0px, -9px, 0px) scale(1.12, 1.12)',
  })
  const foreignObject = new FakeElement('foreignObject', [], new Map([
    ['mask', 'url(#masked-heading-r0)'],
    ['style', 'filter: url(#masked-heading-r0)'],
  ]), [media])
  const stage = new FakeElement('svg', ['masked-heading__stage'], new Map(), [mask, use, foreignObject], {
    opacity: '0.18',
    visibility: 'hidden',
    'clip-path': 'inset(0% 100% 0% 0%)',
  })
  return new FakeElement('div', [], new Map(), [stage])
}

void test('Laser capture owns namespaced mask references without mutating the real heading', () => {
  const original = buildMaskedHeading()
  const clone = cloneProjectLaserCapture(original as unknown as HTMLElement, 'laser-test') as unknown as FakeElement
  const originalMask = original.querySelector<FakeElement>('mask')!
  const clonedMask = clone.querySelector<FakeElement>('mask')!
  const clonedForeignObject = clone.querySelector<FakeElement>('foreignObject')!
  const clonedUse = clone.querySelector<FakeElement>('use')!

  assert.equal(originalMask.getAttribute('id'), 'masked-heading-r0')
  assert.equal(original.querySelector<FakeElement>('foreignObject')!.getAttribute('mask'), 'url(#masked-heading-r0)')
  assert.equal(clonedMask.getAttribute('id'), 'laser-test-0-masked-heading-r0')
  assert.equal(clonedForeignObject.getAttribute('mask'), 'url(#laser-test-0-masked-heading-r0)')
  assert.equal(clonedForeignObject.getAttribute('style'), 'filter: url(#laser-test-0-masked-heading-r0)')
  assert.equal(clonedUse.getAttribute('href'), '#laser-test-0-masked-heading-r0')
  assert.ok(clone.querySelectorAll<FakeElement>('[id]').some(
    (element) => element.getAttribute('id') === clonedForeignObject.getAttribute('mask')?.slice(5, -1),
  ))
})

void test('Laser capture removes stage hiding and media translation while retaining fill scale', () => {
  const original = buildMaskedHeading()
  const clone = cloneProjectLaserCapture(original as unknown as HTMLElement, 'laser-static') as unknown as FakeElement
  const originalStage = original.querySelector<FakeElement>('.masked-heading__stage')!
  const clonedStage = clone.querySelector<FakeElement>('.masked-heading__stage')!
  const clonedMedia = clone.querySelector<FakeElement>('.masked-heading__media')!

  assert.equal(originalStage.style.getPropertyValue('opacity'), '0.18')
  assert.equal(originalStage.style.getPropertyValue('clip-path'), 'inset(0% 100% 0% 0%)')
  assert.equal(clonedStage.style.getPropertyValue('opacity'), '1')
  assert.equal(clonedStage.style.getPropertyValue('visibility'), 'visible')
  assert.equal(clonedStage.style.getPropertyValue('clip-path'), 'inset(0% 0% 0% 0%)')
  assert.equal(clonedMedia.style.transform, 'scale(1.12, 1.12)')
})

void test('SVG URL and media transform helpers preserve unrelated values', () => {
  const ids = new Map([['mask-a', 'capture-1-mask-a']])
  assert.equal(rewriteLocalSvgReference('url("#mask-a")', ids), 'url(#capture-1-mask-a)')
  assert.equal(rewriteLocalSvgReference('url(#outside)', ids), 'url(#outside)')
  assert.equal(stableMaskedHeadingMediaTransform('translateY(3px) scale3d(1.2, 1.2, 1)'), 'scale3d(1.2, 1.2, 1)')
})

void test('the vendor readiness qualifier rejects blank or failed capture and accepts later pixels', () => {
  let visible = false
  assert.equal(captureHasUsablePixels(() => visible), false)
  visible = true
  assert.equal(captureHasUsablePixels(() => visible), true)
  assert.equal(captureHasUsablePixels(() => { throw new Error('staging read failed') }), false)
})
