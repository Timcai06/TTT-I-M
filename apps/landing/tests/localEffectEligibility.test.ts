import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canPrepareLocalEffect,
  canRunLocalEffect,
  observeLocalEffectEligibility,
} from '../src/components/effects/localEffectEligibility.ts'

// A small semantic DOM harness, matching the one aboutCaptureEligibility uses.
function fixture() {
  let notifyMutation = () => {}
  class Observer {
    constructor(callback: () => void) { notifyMutation = callback }
    observe() {}
    disconnect() {}
  }
  const document = {
    hidden: false,
    defaultView: { MutationObserver: Observer, getComputedStyle: (node: ElementNode) => node.style },
    getElementById: () => section,
    addEventListener: () => {},
    removeEventListener: () => {},
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
    constructor(parent: ElementNode | null) { this.parentElement = parent }
    hasAttribute(name: string) { return this.attributes.has(name) }
    getAttribute(name: string) { return this.attributes.get(name) ?? null }
    closest(selector: string): ElementNode | null { return selector === '#projects' ? section : null }
  }
  const html = new ElementNode(null)
  const section = new ElementNode(html)
  const host = new ElementNode(section)
  const as = (node: ElementNode) => node as unknown as HTMLElement
  return { document, html, section, host, as, fire: () => notifyMutation() }
}

// The archive holds a chapter at opacity 0 while its page is still projected, and
// reveals it on the frame the page finishes expanding. Building a WebGL effect on
// that frame cost a measured 33-52ms against an 8.3ms median -- one visible hitch,
// at the exact instant the reader is watching the page open. Preparation must
// therefore be allowed while the chapter is invisible but laid out.
void test('a chapter held invisible behind the projection may prepare but not run', () => {
  const { section, host, as } = fixture()
  assert.equal(canPrepareLocalEffect(as(host), 'projects'), true)
  assert.equal(canRunLocalEffect(as(host), 'projects'), true)
  section.style.opacity = '0'
  assert.equal(canPrepareLocalEffect(as(host), 'projects'), true, 'must still be able to build')
  assert.equal(canRunLocalEffect(as(host), 'projects'), false, 'must not claim to be visible')
  section.style.opacity = '1'
  section.style.visibility = 'hidden'
  assert.equal(canPrepareLocalEffect(as(host), 'projects'), true)
  assert.equal(canRunLocalEffect(as(host), 'projects'), false)
})

// Everything that makes initialisation wrong rather than merely unseen still
// refuses both: there is no layout to measure, or the content is deliberately out
// of the experience, or the whole tab is in the background.
void test('structural refusals stop preparation as well as rendering', () => {
  for (const [name, apply] of [
    ['display:none', (f: ReturnType<typeof fixture>) => { f.section.style.display = 'none' }],
    ['inert', (f: ReturnType<typeof fixture>) => { f.section.inert = true }],
    ['aria-hidden', (f: ReturnType<typeof fixture>) => { f.section.attributes.set('aria-hidden', 'true') }],
    ['hidden document', (f: ReturnType<typeof fixture>) => { f.document.hidden = true }],
    ['archive routing', (f: ReturnType<typeof fixture>) => { f.html.attributes.set('data-archive-routing', 'true') }],
    ['detached host', (f: ReturnType<typeof fixture>) => { f.host.isConnected = false }],
  ] as const) {
    const f = fixture()
    apply(f)
    assert.equal(canPrepareLocalEffect(f.as(f.host), 'projects'), false, `${name} must refuse preparation`)
    assert.equal(canRunLocalEffect(f.as(f.host), 'projects'), false, `${name} must refuse rendering`)
  }
})

// The two predicates move one commit apart. An observer watching only one of them
// drops the other transition, which would leave an effect built and never shown.
void test('the observer reports the reveal even when preparability did not change', () => {
  const f = fixture()
  f.section.style.opacity = '0'
  const seen: boolean[] = []
  observeLocalEffectEligibility(f.as(f.host), 'projects', (eligible) => { seen.push(eligible) })
  f.section.style.opacity = '1'
  f.fire()
  assert.deepEqual(seen, [true], 'revealing a preparable chapter must notify')
  f.section.style.opacity = '0'
  f.fire()
  assert.deepEqual(seen, [true, false], 'hiding it again must notify')
})
