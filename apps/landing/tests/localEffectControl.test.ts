import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createLocalEffectCommit,
  normalizeLocalEffectState,
  type LocalEffectState,
} from '../src/lib/canvas-ui/localEffectControl.ts'

interface Handle { id: string }

void test('absolute progress is clamped and the last out-of-order or repeated command wins', () => {
  assert.deepEqual(normalizeLocalEffectState({ progress: 2, delta: -9_000 }), {
    progress: 1,
    delta: -4_000,
  })
  assert.deepEqual(normalizeLocalEffectState({ progress: Number.NaN, delta: Number.POSITIVE_INFINITY }), {
    progress: 0,
    delta: 0,
  })

  const applied: LocalEffectState[] = []
  const commit = createLocalEffectCommit<Handle>({
    apply: (_handle, state) => applied.push({ ...state }),
    destroy: () => {},
  })
  commit.update({ progress: 0.8, delta: 12 })
  const generation = commit.activate()
  assert.equal(commit.accept(generation, { id: 'ready-late' }), true)
  commit.update({ progress: 0.2, delta: -4 })
  commit.update({ progress: 0.8, delta: 0 })
  commit.update({ progress: 0.8, delta: 0 })
  assert.deepEqual(applied.at(-1), { progress: 0.8, delta: 0 })
  assert.deepEqual(commit.snapshot().state, { progress: 0.8, delta: 0 })
})

void test('inactive and stale generations reject late ready without blocking a later activation', () => {
  const destroyed: string[] = []
  const commit = createLocalEffectCommit<Handle>({
    apply: () => {},
    destroy: (handle) => destroyed.push(handle.id),
  })
  const first = commit.activate()
  commit.deactivate()
  assert.equal(commit.accept(first, { id: 'late' }), false)
  const second = commit.activate()
  assert.equal(commit.accept(second, { id: 'second' }), true)
  commit.deactivate()
  const third = commit.activate()
  assert.equal(commit.accept(third, { id: 'strict-remount' }), true)
  assert.deepEqual(destroyed, ['late', 'second'])
})

void test('apply and observer callback failures are isolated and release the resource once', () => {
  let destroys = 0
  const commit = createLocalEffectCommit<Handle>({
    apply: () => { throw new Error('decorative consumer failed') },
    destroy: () => { destroys += 1 },
    onAttach: () => { throw new Error('observer failed') },
    onDetach: () => { throw new Error('observer failed') },
  })
  const generation = commit.activate()
  assert.equal(commit.accept(generation, { id: 'fragile' }), false)
  assert.equal(commit.snapshot().active, false)
  assert.equal(destroys, 1)
  commit.deactivate()
  assert.equal(destroys, 1)
})

void test('destroy rejects future generations and disposes an attached handle exactly once', () => {
  const destroyed: string[] = []
  const commit = createLocalEffectCommit<Handle>({
    apply: () => {},
    destroy: (handle) => destroyed.push(handle.id),
  })
  const generation = commit.activate()
  assert.equal(commit.accept(generation, { id: 'live' }), true)
  commit.destroy()
  commit.destroy()
  assert.deepEqual(destroyed, ['live'])
  assert.equal(commit.accept(commit.activate(), { id: 'post-dispose' }), false)
  assert.deepEqual(destroyed, ['live', 'post-dispose'])
})
