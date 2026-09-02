import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateImagePlacement } from '../src/lib/canvas-ui/particlePortalMath.ts'
import {
  onParticlePortalRequest,
  requestParticlePortal,
  type ParticlePortalRequest,
} from '../src/lib/particlePortal.ts'

void test('particle portal preserves cover crop UVs instead of stretching the preview', () => {
  const placement = calculateImagePlacement({
    bounds: { left: 20, top: 30, width: 200, height: 200 },
    naturalWidth: 1600,
    naturalHeight: 1000,
    fit: 'cover',
    positionX: 0.5,
    positionY: 0.5,
  })

  assert.ok(placement)
  assert.deepEqual(placement.rect, { left: 20, top: 30, width: 200, height: 200 })
  assert.equal(Number(placement.uvMin.x.toFixed(4)), 0.1875)
  assert.equal(Number(placement.uvMax.x.toFixed(4)), 0.8125)
  assert.equal(placement.uvMin.y, 0)
  assert.equal(placement.uvMax.y, 1)
})

void test('particle portal maps contain images to their actual rendered rectangle', () => {
  const placement = calculateImagePlacement({
    bounds: { left: 20, top: 30, width: 200, height: 200 },
    naturalWidth: 1600,
    naturalHeight: 1000,
    fit: 'contain',
    positionX: 0.5,
    positionY: 0.5,
  })

  assert.ok(placement)
  assert.deepEqual(placement.rect, { left: 20, top: 67.5, width: 200, height: 125 })
  assert.deepEqual(placement.uvMin, { x: 0, y: 0 })
  assert.deepEqual(placement.uvMax, { x: 1, y: 1 })
})

void test('particle portal request never swallows an action when its app listener is absent', () => {
  const request = {
    source: {} as HTMLImageElement,
    resolveTarget: () => null,
    commit: () => undefined,
    mode: 'case-expand',
    label: 'test',
  } satisfies ParticlePortalRequest

  assert.equal(requestParticlePortal(request), false)
  let received: ParticlePortalRequest | null = null
  const unsubscribe = onParticlePortalRequest((next) => { received = next })
  assert.equal(requestParticlePortal(request), true)
  assert.equal(received, request)
  unsubscribe()
  assert.equal(requestParticlePortal(request), false)
})
