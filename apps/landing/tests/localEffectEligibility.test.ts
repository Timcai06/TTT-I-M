import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canRunLocalEffect,
  observeLocalEffectEligibility,
} from '../src/components/effects/localEffectEligibility.ts'

function fixture(ownerId: 'frame' | 'projects' | 'contact' = 'projects') {
  const listeners = new Map<string, () => void>()
  const observed: Array<{ node: unknown; options: MutationObserverInit }> = []
  let notifyMutation = () => {}
  let disconnected = false
  class Observer {
    constructor(callback: () => void) { notifyMutation = callback }
    observe(node: unknown, options: MutationObserverInit) { observed.push({ node, options }) }
    disconnect() { disconnected = true }
  }
  const document = {
    hidden: false,
    defaultView: { MutationObserver: Observer, getComputedStyle: (node: ElementNode) => node.style },
    getElementById: (id: string) => id === ownerId ? owner : null,
    addEventListener: (name: string, callback: () => void) => { listeners.set(name, callback) },
    removeEventListener: (name: string) => { listeners.delete(name) },
    get documentElement() { return html },
  }
  class ElementNode {
    isConnected = true
    inert = false
    hidden = false
    excluded = false
    attributes = new Map<string, string>()
    style = { display: 'block', visibility: 'visible', opacity: '1' }
    ownerDocument = document
    parentElement: ElementNode | null
    constructor(parentElement: ElementNode | null) { this.parentElement = parentElement }
    hasAttribute(name: string) { return this.attributes.has(name) }
    getAttribute(name: string) { return this.attributes.get(name) ?? null }
    closest(selector: string): ElementNode | null {
      if (selector === `#${ownerId}`) return owner
      if (selector.includes('[data-archive-clone]')) return this.excluded ? this : null
      return null
    }
  }
  const html = new ElementNode(null)
  const main = new ElementNode(html)
  const owner = new ElementNode(main)
  const node = new ElementNode(owner)
  return {
    document, html, main, owner, node, observed, listeners,
    host: node as unknown as HTMLElement,
    mutate: () => { if (!disconnected) notifyMutation() },
    disconnected: () => disconnected,
  }
}

void test('only the connected real chapter surface is eligible and the read is non-mutating', () => {
  const f = fixture('frame')
  const before = [...f.owner.attributes]
  assert.equal(canRunLocalEffect(f.host, 'frame'), true)
  assert.deepEqual([...f.owner.attributes], before)
  f.node.excluded = true
  assert.equal(canRunLocalEffect(f.host, 'frame'), false)
  f.node.excluded = false
  f.node.isConnected = false
  assert.equal(canRunLocalEffect(f.host, 'frame'), false)
  assert.equal(canRunLocalEffect(null, 'frame'), false)
})

void test('inert, routing, hidden document and invisible ancestors fail closed', () => {
  const f = fixture('contact')
  f.owner.inert = true
  assert.equal(canRunLocalEffect(f.host, 'contact'), false)
  f.owner.inert = false
  f.html.attributes.set('data-archive-routing', 'true')
  assert.equal(canRunLocalEffect(f.host, 'contact'), false)
  f.html.attributes.clear()
  f.main.style.visibility = 'hidden'
  assert.equal(canRunLocalEffect(f.host, 'contact'), false)
  f.main.style.visibility = 'visible'
  f.document.hidden = true
  assert.equal(canRunLocalEffect(f.host, 'contact'), false)
})

void test('bounded observer coalesces transitions, isolates consumers and fully detaches', () => {
  const f = fixture()
  const values: boolean[] = []
  let throws = true
  const stop = observeLocalEffectEligibility(f.host, 'projects', (eligible) => {
    values.push(eligible)
    if (throws) throw new Error('consumer failed')
  })
  assert.equal(f.observed.length, 4)
  assert.ok(f.observed.every(({ options }) => options.attributes && !options.subtree && !options.childList))
  f.mutate()
  f.owner.inert = true
  assert.doesNotThrow(f.mutate)
  f.mutate()
  throws = false
  f.owner.inert = false
  f.mutate()
  assert.deepEqual(values, [false, true])
  stop()
  assert.equal(f.disconnected(), true)
  assert.equal(f.listeners.size, 0)
  f.owner.inert = true
  f.mutate()
  assert.deepEqual(values, [false, true])
})
