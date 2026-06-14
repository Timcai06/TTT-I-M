import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveContinuumScrollState } from '../src/lib/continuum/continuumScrollState.ts'
import { getChapterTheme } from '../src/lib/chapterThemeTokens.ts'
import { resolveLandingScrollNarrative } from '../src/lib/landingScrollNarrative.ts'

void test('hero keeps the original portrait particle subject without an extra continuum nebula', () => {
  const state = resolveContinuumScrollState('hero')

  assert.equal(state.formId, 'portrait')
  assert.equal(state.morph, 0)
  assert.equal(state.opacity, 0)
})

void test('later chapters tint the continuum from the chapter transition theme color', () => {
  const state = resolveContinuumScrollState('frame')

  assert.equal(state.formId, 'portrait')
  assert.equal(state.tint.toLowerCase(), getChapterTheme('frame').cover.toLowerCase())
  assert.ok(state.opacity > 0)
  assert.ok(state.opacity <= 0.12)
})

void test('continuum fades in during the hero to about scroll blend without replacing the hero subject', () => {
  const narrative = resolveLandingScrollNarrative([
    { id: 'hero', top: -360, bottom: 520 },
    { id: 'about', top: 360, bottom: 1280 },
  ], 720, 'hero')
  const state = resolveContinuumScrollState(narrative)

  assert.equal(state.formId, 'portrait')
  assert.ok(state.opacity > 0)
  assert.ok(state.opacity < 0.08)
  assert.notEqual(state.tint.toLowerCase(), getChapterTheme('hero').cover.toLowerCase())
})
