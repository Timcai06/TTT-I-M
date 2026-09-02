import test from 'node:test'
import assert from 'node:assert/strict'

import { getVisualEffectDefinition, visualEffectManifest } from '../src/shared/effects/manifest.ts'

void test('every visual effect declares fallback, motion, GPU and license policy', () => {
  const ids = new Set<string>()
  for (const effect of visualEffectManifest) {
    assert.equal(ids.has(effect.id), false, `duplicate effect id: ${effect.id}`)
    ids.add(effect.id)
    assert.ok(effect.chapter.length > 0)
    assert.ok(effect.trigger.length > 0)
    assert.ok(effect.fallback.length > 0)
    assert.ok(effect.license.length > 0)
    assert.ok(effect.contextCost === 0 || effect.contextCost === 1)
  }
})

void test('GPU effects cost one context and DOM evidence tools cost none', () => {
  for (const id of ['horizontal-bend', 'project-laser', 'particle-portal', 'footer-liquid-cursor']) {
    assert.equal(getVisualEffectDefinition(id)?.contextCost, 1)
  }
  for (const id of [
    'project-case-dialog',
    'project-evidence-lightbox',
    'project-metric-number-flow',
    'project-mobile-carousel',
  ]) {
    assert.equal(getVisualEffectDefinition(id)?.contextCost, 0)
  }
})
