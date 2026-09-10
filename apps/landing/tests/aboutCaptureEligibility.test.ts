import assert from 'node:assert/strict'
import test from 'node:test'
import { canCaptureAbout, observeAboutCapture } from '../src/components/effects/aboutCaptureEligibility.ts'

// A small semantic DOM harness, not a browser or HTML-in-Canvas implementation.
function fixture() {
  const listeners = new Map<string, () => void>()
  let notifyMutation = () => {}
  let disconnected = false
  const observed: Array<{ node: unknown; options: MutationObserverInit }> = []
  class Observer {
    constructor(callback: () => void) { notifyMutation = callback }
    observe(node: unknown, options: MutationObserverInit) { observed.push({ node, options }) }
    disconnect() { disconnected = true }
  }
  const document = {
    hidden: false,
    defaultView: { MutationObserver: Observer, getComputedStyle: (node: ElementNode) => node.style },
    getElementById: () => about,
    addEventListener: (name: string, callback: () => void) => { listeners.set(name, callback) },
    removeEventListener: (name: string) => { listeners.delete(name) },
    get documentElement() { return html },
  }
  class ElementNode {
    isConnected = true
    inert = false
    hidden = false
    attributes = new Map<string, string>()
    style = { display: 'block', visibility: 'visible', opacity: '1' }
    ownerDocument = document
    parentElement: ElementNode | null
    copy = false
    constructor(parent: ElementNode | null) { this.parentElement = parent }
    hasAttribute(name: string) { return this.attributes.has(name) }
    getAttribute(name: string) { return this.attributes.get(name) ?? null }
    closest(selector: string): ElementNode | null { return selector === '#about' ? about : this.copy ? this : null }
  }
  const html = new ElementNode(null)
  const main = new ElementNode(html)
  const about = new ElementNode(main)
  const node = new ElementNode(about)
  return {
    node, about, main, html, document, observed, listeners,
    host: node as unknown as HTMLElement,
    mutate: () => { if (!disconnected) notifyMutation() },
    disconnected: () => disconnected,
  }
}

void test('real About is eligible, but a preview/capture copy and detached host are not', () => {
  const f = fixture()
  assert.equal(canCaptureAbout(f.host), true)
  f.node.copy = true
  assert.equal(canCaptureAbout(f.host), false)
  f.node.copy = false
  f.node.isConnected = false
  assert.equal(canCaptureAbout(f.host), false)
  assert.equal(canCaptureAbout(null), false)
})

void test('entry reading can stay true while semantic inert or route disables capture', () => {
  const f = fixture()
  assert.equal(canCaptureAbout(f.host), true)
  f.about.inert = true
  assert.equal(canCaptureAbout(f.host), false)
  f.about.inert = false
  f.html.attributes.set('data-archive-routing', 'true')
  assert.equal(canCaptureAbout(f.host), false)
  f.html.attributes.delete('data-archive-routing')
  assert.equal(canCaptureAbout(f.host), true)
})

void test('ancestor invisibility, aria hiding and background documents retain fallback', () => {
  const f = fixture()
  for (const key of ['display', 'visibility', 'opacity'] as const) {
    const before = f.main.style[key]
    f.main.style[key] = key === 'display' ? 'none' : key === 'opacity' ? '0' : 'hidden'
    assert.equal(canCaptureAbout(f.host), false)
    f.main.style[key] = before
  }
  f.about.attributes.set('aria-hidden', 'true')
  assert.equal(canCaptureAbout(f.host), false)
  f.about.attributes.delete('aria-hidden')
  f.about.hidden = true
  assert.equal(canCaptureAbout(f.host), false)
  f.about.hidden = false
  f.document.hidden = true
  assert.equal(canCaptureAbout(f.host), false)
})

void test('observer follows reading leave/return, coalesces unchanged mutations and fully detaches', () => {
  const f = fixture()
  const transitions: boolean[] = []
  const stop = observeAboutCapture(f.host, () => transitions.push(canCaptureAbout(f.host)))
  assert.equal(f.observed.length, 4)
  assert.ok(f.observed.every(({ options }) => options.attributes && !options.subtree && !options.childList))
  f.mutate()
  assert.deepEqual(transitions, [])
  f.about.inert = true
  f.mutate()
  f.mutate()
  f.about.inert = false
  f.mutate()
  f.document.hidden = true
  f.listeners.get('visibilitychange')?.()
  assert.deepEqual(transitions, [false, true, false])
  stop()
  assert.equal(f.disconnected(), true)
  assert.equal(f.listeners.size, 0)
  f.document.hidden = false
  f.mutate()
  assert.deepEqual(transitions, [false, true, false])
})

void test('eligibility recheck sees a route change before its observer callback runs', async () => {
  const f = fixture()
  const stop = observeAboutCapture(f.host, () => {})
  const delayedAdmission = Promise.resolve().then(() => canCaptureAbout(f.host))
  f.html.attributes.set('data-archive-routing', 'true')
  // Deliberately do not deliver the observer: async capture boundaries must read DOM now.
  assert.equal(await delayedAdmission, false)
  stop()
})
