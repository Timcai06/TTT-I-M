import test from 'node:test'
import assert from 'node:assert/strict'

import { continuumQualityForTier } from '../src/lib/continuum/continuumQuality.ts'

const tiers = ['high', 'medium', 'low'] as const

void test('every tier renders particles (low must not fall back to static)', () => {
  for (const tier of tiers) {
    const q = continuumQualityForTier(tier, 1.5)
    assert.ok(q.particleCount > 0, `${tier} must render particles`)
    assert.equal(q.particleCount, q.particleTexSize * q.particleTexSize)
  }
})

void test('particleTexSize is even (WebGL2 NPOT is fine; even tiles cleanly)', () => {
  for (const tier of tiers) {
    const n = continuumQualityForTier(tier, 1.5).particleTexSize
    assert.ok(n % 2 === 0 && n >= 64, `${tier} texSize ${n} must be even and >= 64`)
  }
})

void test('particle count decreases monotonically high → medium → low', () => {
  const counts = tiers.map((t) => continuumQualityForTier(t, 1.5).particleCount)
  for (let i = 1; i < counts.length; i += 1) {
    assert.ok(counts[i] < counts[i - 1], `count must drop at tier index ${i}`)
  }
})

void test('noise octaves never increase as the tier weakens', () => {
  const octaves = tiers.map((t) => continuumQualityForTier(t, 1.5).noiseOctaves)
  for (let i = 1; i < octaves.length; i += 1) {
    assert.ok(octaves[i] <= octaves[i - 1], `octaves must not rise at tier index ${i}`)
  }
})

void test('dprMax passes through unchanged', () => {
  assert.equal(continuumQualityForTier('high', 1.5).dprMax, 1.5)
  assert.equal(continuumQualityForTier('low', 1.15).dprMax, 1.15)
})

void test('high tier stays within the 256² budget cap', () => {
  assert.ok(continuumQualityForTier('high', 1.5).particleTexSize <= 256)
})
