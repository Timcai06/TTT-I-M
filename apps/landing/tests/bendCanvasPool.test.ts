import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

interface Canvas { id: number; remove(): void }
type Release = (discard?: boolean) => void
interface Lease { release(): void }
const source = readFileSync(new URL('../src/lib/canvas-ui/bendCanvasPool.ts', import.meta.url), 'utf8').replaceAll('import.meta.hot', 'undefined')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function harness() {
  let active = 0, allocations = 0, observe: (entries: { isIntersecting: boolean }[]) => void = () => {}
  const destroyed: number[] = []
  const pending = new Set<() => void>()
  const exports = {} as { acquireBendCanvas: (callback: (canvas: Canvas, release: Release) => void) => () => void }
  function acquire(_name: string, callback: (lease: Lease) => void) {
    let cancelled = false, delivered = false
    const attempt = () => {
      if (cancelled || delivered || active >= 2) return
      delivered = true; active++; pending.delete(attempt)
      let released = false
      callback({ release() {
        if (released) return
        released = true; active--
        for (const next of [...pending]) next()
      } })
    }
    pending.add(attempt); attempt()
    return () => { cancelled = true; pending.delete(attempt) }
  }
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      if (name.endsWith('contextRegistry')) return { acquireOptionalContextWhenAvailable: acquire }
      if (name.endsWith('horizontalBend')) return { disposeHorizontalBendCanvas: (canvas: Canvas) => destroyed.push(canvas.id) }
      throw new Error(name)
    },
    document: { getElementById: () => ({}), createElement: () => ({ id: ++allocations, remove() {} }) },
    IntersectionObserver: class {
      constructor(callback: typeof observe) { observe = callback }
      observe() {}
      disconnect() {}
    },
  })
  return { acquire: exports.acquireBendCanvas, leave: () => observe([{ isIntersecting: false }]), destroyed, counts: () => ({ active, allocations, pending: pending.size }) }
}

void test('chapter handoff reuses the same canvas without reallocating a context', () => {
  const h = harness()
  let first: Canvas | undefined, second: Canvas | undefined, release: Release = () => {}
  h.acquire((canvas, done) => { first = canvas; release = done })
  release(); release()
  h.acquire((canvas, done) => { second = canvas; release = done })
  assert.equal(first, second)
  assert.equal(h.counts().allocations, 1)
  release(); h.leave()
  assert.equal(h.counts().active, 0)
  assert.deepEqual(h.destroyed, [first!.id])
})

void test('a waiting chapter receives the released slot while a cancelled chapter never mounts', () => {
  const h = harness(), releases: Release[] = []
  let first: Canvas | undefined, next: Canvas | undefined
  h.acquire((canvas, done) => { first = canvas; releases.push(done) })
  h.acquire((_canvas, done) => releases.push(done))
  const cancel = h.acquire(() => assert.fail('Cancelled chapter mounted'))
  cancel()
  h.acquire((canvas, done) => { next = canvas; releases.push(done) })
  assert.equal(h.counts().pending, 1)
  releases[0]()
  assert.equal(first, next)
  assert.deepEqual(h.counts(), { active: 2, allocations: 2, pending: 0 })
  releases[1](); releases[2](); h.leave()
  assert.equal(h.counts().active, 0)
})

void test('failed contexts are discarded and late releases outside Frame cannot become cached', () => {
  const h = harness()
  let release: Release = () => {}
  h.acquire((_canvas, done) => { release = done })
  release(true)
  assert.equal(h.counts().active, 0)
  h.acquire((_canvas, done) => { release = done })
  h.leave(); release()
  assert.deepEqual(h.destroyed, [1, 2])
  assert.equal(h.counts().active, 0)
})
