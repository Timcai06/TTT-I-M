import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
// Fixture boundaries only; the production TSX is transpiled and executed below.
interface CanvasUiHtmlElements { hasVisibleCapture(): boolean; onFirstFrame(): void }
interface CanvasUiHtmlInstance {
  setOptions(): void; resize(): void; pause(): void; resume(): void; destroy(): void
}

// Execute the real component's startup effect with controlled hooks/resources.
// This checks cancellation and leases, never browser rasterization or React scheduling.
const source = readFileSync(new URL('../src/components/effects/CanvasUiHtmlSurface.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
function harness(factory: (elements: CanvasUiHtmlElements) => CanvasUiHtmlInstance | null) {
  let allowed = true, releases = 0, creates = 0, refIndex = 0, stateIndex = 0
  let elements: CanvasUiHtmlElements | undefined
  const readyWrites: unknown[] = []
  const timers = new Map<number, () => void>()
  const effects: Array<() => (() => void) | undefined> = []
  class Node {
    attributes: never[] = []
    childNodes: never[] = []
    width = 32
    height = 32
    cloneNode() { return new Node() }
    removeAttribute() {}
    setAttribute() {}
    replaceChildren() {}
    querySelectorAll() { return [] }
    listeners = new Map<string, (event: { preventDefault(): void }) => void>()
    addEventListener(name: string, callback: (event: { preventDefault(): void }) => void) { this.listeners.set(name, callback) }
    removeEventListener(name: string) { this.listeners.delete(name) }
    getContext() { return { drawImage() {}, getImageData: () => ({ data: new Uint8Array([0, 0, 0, 255]) }) } }
  }
  const output = new Node()
  const refs = [{ current: new Node() }, { current: new Node() }, { current: output }, { current: null }, { current: true }]
  const exports: { default?: (props: object) => unknown } = {}
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      if (name === 'react') return {
        useCallback: (f: unknown) => f,
        useEffect: (f: () => (() => void) | undefined) => { effects.push(f) },
        useRef: () => refs[refIndex++],
        useState: () => { const index = stateIndex++; return [index === 2 ? 0 : false, (value: unknown) => { if (index === 1) readyWrites.push(value) }] },
        useSyncExternalStore: () => true,
      }
      if (name === 'react/jsx-runtime') return { jsx() {}, jsxs() {} }
      if (name === 'react-dom') return { createPortal() {} }
      if (name.endsWith('/runtime')) return { supportsHtmlInCanvas: () => true }
      if (name.endsWith('/canvasSurfaceSlots')) return { useCanvasSurfaceSlot: () => true }
      if (name.endsWith('/device')) return { useMobileExperience: () => false }
      if (name.endsWith('/motion')) return { useReducedMotion: () => false }
      if (name.endsWith('/useGLSurface')) return { useGLSurface: () => ({ ref: { current: new Node() }, visible: true, mounted: true }) }
      if (name.endsWith('/contextRegistry')) return {
        acquireOptionalContextWhenAvailable: (_owner: string, grant: (lease: { release(): void }) => void) => { grant({ release() { releases++ } }); return () => {} },
        forceLoseCanvasWebGLContext() {}, getWebGLRecoveryDelay: () => null,
      }
      throw new Error('Unexpected import')
    },
    document: { hidden: false, createElement: () => new Node() },
    window: {
      setTimeout(callback: () => void) { const id = timers.size + 1; timers.set(id, callback); return id },
      clearTimeout(id: number) { timers.delete(id) },
      requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    },
    MutationObserver: class { observe() {} disconnect() {} },
  })
  assert.ok(exports.default)
  let resolveFactory!: (create: (elements: CanvasUiHtmlElements) => CanvasUiHtmlInstance | null) => void
  const pending = new Promise<(elements: CanvasUiHtmlElements) => CanvasUiHtmlInstance | null>((resolve) => { resolveFactory = resolve })
  exports.default({ className: 'test', effectId: 'test', options: {}, isCaptureAllowed: () => allowed, loadFactory: () => pending })
  const cleanup = effects[2]?.()
  return {
    readyWrites, timers,
    loseContext: () => output.listeners.get('webglcontextlost')?.({ preventDefault() {} }),
    close: () => { allowed = false },
    cleanup: () => cleanup?.(),
    elements: () => elements,
    releases: () => releases,
    creates: () => creates,
    async resolve() { resolveFactory((next) => { creates++; elements = next; return factory(next) }); for (let i = 0; i < 6; i++) await Promise.resolve() },
  }
}
function instance(destroy: () => void = () => {}): CanvasUiHtmlInstance {
  return { setOptions() {}, resize() {}, pause() {}, resume() {}, destroy }
}

void test('leaving reading before factory resolution never creates a renderer', async () => {
  const h = harness(() => instance())
  h.close()
  await h.resolve()
  assert.equal(h.creates(), 0)
  assert.ok(!h.readyWrites.includes(true))
  h.cleanup()
})

void test('startup failure blocks a late factory and its first frame', async () => {
  const h = harness(() => instance())
  h.timers.values().next().value?.()
  await h.resolve()
  assert.equal(h.creates(), 0)
  assert.ok(!h.readyWrites.includes(true))
  h.cleanup()
})

void test('capture handshake with mock pixels admits a synchronous first frame only after a successful factory', async () => {
  const h = harness((elements) => { assert.equal(elements.hasVisibleCapture(), true); elements.onFirstFrame(); return instance() })
  await h.resolve()
  assert.ok(h.readyWrites.includes(true))
  h.cleanup()
  assert.equal(h.releases(), 1)
})

void test('null factory and late route frames cannot mark content ready', async () => {
  const nullFactory = harness((elements) => { elements.hasVisibleCapture(); elements.onFirstFrame(); return null })
  await nullFactory.resolve()
  assert.ok(!nullFactory.readyWrites.includes(true))
  nullFactory.cleanup()
  assert.equal(nullFactory.releases(), 1)
  const h = harness(() => instance())
  await h.resolve()
  assert.equal(h.elements()?.hasVisibleCapture(), true)
  h.close()
  h.elements()?.onFirstFrame()
  assert.ok(!h.readyWrites.includes(true))
  h.cleanup()
  assert.equal(h.releases(), 1)
})

void test('cleanup releases lease despite throwing destroy; disposed first frames stay rejected', async () => {
  const h = harness(() => instance(() => { throw new Error('driver teardown failed') }))
  await h.resolve()
  h.elements()?.hasVisibleCapture()
  h.cleanup()
  h.elements()?.onFirstFrame()
  assert.equal(h.releases(), 1)
  assert.ok(!h.readyWrites.includes(true))
})

void test('a first-frame callback without captured pixels keeps fallback pending', async () => {
  const h = harness((elements) => { elements.onFirstFrame(); return instance() })
  await h.resolve()
  assert.ok(!h.readyWrites.includes(true))
  assert.equal(h.timers.size, 1)
  h.cleanup()
})

void test('eligibility revoked inside factory creation destroys its result and releases once', async () => {
  let close = () => {}
  let destroyed = 0
  const h = harness(() => { close(); return instance(() => { destroyed++ }) })
  close = h.close
  await h.resolve()
  h.cleanup()
  assert.equal(destroyed, 1)
  assert.equal(h.releases(), 1)
  assert.ok(!h.readyWrites.includes(true))
})

void test('context loss prevents late first-frame activation and releases the lease', async () => {
  const h = harness(() => instance())
  await h.resolve()
  h.elements()?.hasVisibleCapture()
  h.loseContext()
  h.elements()?.onFirstFrame()
  assert.ok(!h.readyWrites.includes(true))
  h.cleanup()
  assert.equal(h.releases(), 1)
})
