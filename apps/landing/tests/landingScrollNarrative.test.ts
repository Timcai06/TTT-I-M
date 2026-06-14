import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveLandingScrollNarrative } from '../src/lib/landingScrollNarrative.ts'
import { getChapterTheme } from '../src/lib/chapterThemeTokens.ts'
import type { ChapterRectSnapshot } from '../src/lib/activeChapter.ts'

void test('derives progress fills, chapter blend, and theme mix from one rect snapshot', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'about', top: -720, bottom: -120 },
    { id: 'frame', top: 720, bottom: 1800 },
  ]

  const state = resolveLandingScrollNarrative(rects, 720, 'about')

  assert.equal(state.activeId, 'about')
  assert.equal(state.fromId, 'about')
  assert.equal(state.toId, 'frame')
  assert.equal(Number(state.blend.toFixed(2)), 0.5)
  assert.deepEqual(state.progressFills.map((value) => Number(value.toFixed(2))), [0.5, 0])
  assert.notEqual(state.theme.bg.toLowerCase(), getChapterTheme('about').bg.toLowerCase())
  assert.notEqual(state.theme.bg.toLowerCase(), getChapterTheme('frame').bg.toLowerCase())
  assert.notEqual(state.theme.cover.toLowerCase(), getChapterTheme('about').cover.toLowerCase())
  assert.notEqual(state.theme.cover.toLowerCase(), getChapterTheme('frame').cover.toLowerCase())
})

void test('uses the final chapter as both ends after the last segment starts', () => {
  const rects: ChapterRectSnapshot[] = [
    { id: 'contact', top: -200, bottom: 1000 },
  ]

  const state = resolveLandingScrollNarrative(rects, 720, 'hero')

  assert.equal(state.activeId, 'contact')
  assert.equal(state.fromId, 'contact')
  assert.equal(state.toId, 'contact')
  assert.equal(Number(state.blend.toFixed(2)), 0.42)
  assert.deepEqual(state.progressFills.map((value) => Number(value.toFixed(2))), [0.42])
  assert.equal(state.theme.bg.toLowerCase(), getChapterTheme('contact').bg.toLowerCase())
})
