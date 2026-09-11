import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { canPrepareLocalEffect, canRunLocalEffect } from '../src/components/effects/localEffectEligibility.ts'

function eligibilityFixture() {
  const document = {
    hidden: false,
    defaultView: { getComputedStyle: (node: ElementNode) => node.style },
    getElementById: (id: string) => id === 'projects' ? owner : null,
    documentElement: null as unknown as ElementNode,
  }
  class ElementNode {
    isConnected = true
    inert = false
    hidden = false
    attributes = new Map<string, string>()
    style = { display: 'block', visibility: 'visible', opacity: '1' }
    ownerDocument = document
    parentElement: ElementNode | null

    constructor(parentElement: ElementNode | null) { this.parentElement = parentElement }
    hasAttribute(name: string) { return this.attributes.has(name) }
    getAttribute(name: string) { return this.attributes.get(name) ?? null }
    closest(selector: string): ElementNode | null {
      if (selector === '#projects') return owner
      if (selector.includes('[data-archive-clone]')) return null
      return null
    }
  }
  const html = new ElementNode(null)
  document.documentElement = html
  const owner = new ElementNode(html)
  const capture = new ElementNode(owner)
  const decorativeHost = new ElementNode(owner)
  decorativeHost.attributes.set('aria-hidden', 'true')
  return {
    capture: capture as unknown as HTMLElement,
    decorativeHost: decorativeHost as unknown as HTMLElement,
    disconnectCapture: () => { capture.isConnected = false },
    hideOwner: () => { owner.style.opacity = '0' },
  }
}

void test('Project Laser qualifies the connected semantic capture, not its aria-hidden host', () => {
  const fixture = eligibilityFixture()
  assert.equal(canRunLocalEffect(fixture.decorativeHost, 'projects'), false)
  assert.equal(canRunLocalEffect(fixture.capture, 'projects'), true)
  fixture.disconnectCapture()
  assert.equal(canRunLocalEffect(fixture.capture, 'projects'), false)
})

void test('Project Laser entry and lease callback check the same captureRef target', () => {
  const source = readFileSync(new URL('../src/components/ProjectLaser.tsx', import.meta.url), 'utf8')
  // Still exactly twice, still `capture` and never `host` — the entry check and the
  // lease callback have to agree on which element they are qualifying. What changed
  // is which predicate: the Work chapter is held invisible behind the archive's
  // projection until its page finishes expanding, so gating construction on
  // visibility built the WebGL context on that frame and cost a measured 33-52ms
  // against an 8.3ms median. Preparation is now allowed while the chapter is unseen.
  assert.equal((source.match(/canPrepareLocalEffect\(capture, 'projects'\)/g) ?? []).length, 2)
  assert.equal(source.includes("canPrepareLocalEffect(host, 'projects')"), false)
  assert.equal(source.includes("canRunLocalEffect("), false, 'construction must not wait on visibility')
  assert.ok(source.includes("aria-hidden=\"true\""))
})

void test('the laser may be built while its chapter is still held invisible', () => {
  const fixture = eligibilityFixture()
  fixture.hideOwner()
  assert.equal(canRunLocalEffect(fixture.capture, 'projects'), false)
  assert.equal(canPrepareLocalEffect(fixture.capture, 'projects'), true)
})
