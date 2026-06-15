import test from 'node:test'
import assert from 'node:assert/strict'

import { getContinuumForm } from '../src/lib/continuum/forms/registry.ts'
import {
  createGerstnerTargetTexture,
  createMathSurfaceTargetTexture,
  createStardustTargetTexture,
} from '../src/lib/continuum/forms/proceduralTargets.ts'
import { resolveContinuumScrollState } from '../src/lib/continuum/continuumScrollState.ts'
import { getChapterTheme } from '../src/lib/chapterThemeTokens.ts'
import { resolveLandingScrollNarrative } from '../src/lib/landingScrollNarrative.ts'

function narrativeForChapter(id: string) {
  return {
    activeId: id,
    fromId: id,
    toId: id,
    blend: 0,
    progressFills: [],
    theme: getChapterTheme(id),
  }
}

void test('registers M1 disintegrate and stardust forms with distinct motion behavior', () => {
  const portrait = getContinuumForm('portrait')
  const disintegrate = getContinuumForm('disintegrate')
  const stardust = getContinuumForm('stardust')

  assert.ok(disintegrate.behavior.stiffness < portrait.behavior.stiffness)
  assert.ok(disintegrate.behavior.turbulence > portrait.behavior.turbulence)
  assert.ok(stardust.behavior.stiffness <= disintegrate.behavior.stiffness)
  assert.ok(stardust.behavior.turbulence < disintegrate.behavior.turbulence)
})

void test('continuum forms expose a target anchor so scroll positions converge to a stable silhouette', () => {
  const portrait = getContinuumForm('portrait')
  const disintegrate = getContinuumForm('disintegrate')
  const stardust = getContinuumForm('stardust')

  assert.ok(portrait.behavior.anchorStrength > 0)
  assert.ok(disintegrate.behavior.anchorStrength > 0)
  assert.ok(stardust.behavior.anchorStrength > disintegrate.behavior.anchorStrength)
})

void test('maps about to disintegrate without enabling continuum over the hero identity', () => {
  const aboutState = resolveContinuumScrollState(narrativeForChapter('about'))
  const heroState = resolveContinuumScrollState(narrativeForChapter('hero'))

  assert.equal(aboutState.formId, 'disintegrate')
  assert.ok(aboutState.opacity > heroState.opacity)
  assert.ok(aboutState.opacity >= 0.14)
  assert.ok(aboutState.pointScale > heroState.pointScale)
  assert.equal(heroState.formId, 'portrait')
  assert.equal(heroState.opacity, 0)
})

void test('maps frame-like archive chapters to low-presence stardust', () => {
  const state = resolveContinuumScrollState(narrativeForChapter('frame'))

  assert.equal(state.formId, 'stardust')
  assert.ok(state.opacity >= 0.12)
  assert.ok(state.opacity <= 0.18)
  assert.ok(state.pointScale >= 1.15)
})

void test('maps Work to math surface and Contact to bright-safe water', () => {
  const workState = resolveContinuumScrollState(narrativeForChapter('projects'))
  const contactState = resolveContinuumScrollState(narrativeForChapter('contact'))

  assert.equal(workState.formId, 'mathSurface')
  assert.equal(workState.blendMode, 'additive')
  assert.equal(contactState.formId, 'gerstner')
  assert.equal(contactState.blendMode, 'normal')
  assert.ok(contactState.opacity < 0.08)
})

void test('stardust target has a wider galaxy silhouette than a flat dust patch', () => {
  const texture = createStardustTargetTexture(16)
  const data = texture.image.data as Float32Array
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let i = 0; i < data.length; i += 4) {
    minX = Math.min(minX, data[i] ?? 0)
    maxX = Math.max(maxX, data[i] ?? 0)
    minY = Math.min(minY, data[i + 1] ?? 0)
    maxY = Math.max(maxY, data[i + 1] ?? 0)
  }

  assert.ok(maxX - minX > maxY - minY)
  assert.ok(maxX - minX > 2.2)
  texture.dispose()
})

void test('math surface and gerstner targets are finite and deterministic', () => {
  const mathA = createMathSurfaceTargetTexture(16)
  const mathB = createMathSurfaceTargetTexture(16)
  const waterA = createGerstnerTargetTexture(16)
  const waterB = createGerstnerTargetTexture(16)

  for (const [a, b] of [[mathA, mathB], [waterA, waterB]]) {
    const dataA = a.image.data as Float32Array
    const dataB = b.image.data as Float32Array
    assert.equal(dataA.length, dataB.length)
    for (let i = 0; i < dataA.length; i += 1) {
      assert.ok(Number.isFinite(dataA[i]))
      assert.equal(dataA[i], dataB[i])
    }
    a.dispose()
    b.dispose()
  }
})

void test('keeps hero to about blend on portrait until the hero subject leaves the center', () => {
  const narrative = resolveLandingScrollNarrative([
    { id: 'hero', top: -360, bottom: 520 },
    { id: 'about', top: 360, bottom: 1280 },
  ], 720, 'hero')

  const state = resolveContinuumScrollState(narrative)

  assert.equal(state.formId, 'portrait')
  assert.ok(state.opacity > 0)
})
