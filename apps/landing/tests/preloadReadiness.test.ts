import assert from 'node:assert/strict'
import test from 'node:test'
import { isReadingFallbackReady } from '../src/lib/resources/preloadReadiness.ts'

const optional = new Set([
  'renderer:personal-archive', 'layout:chapter-pages', 'media:site',
  'chunks:interactions', 'shader:liquid-metal', 'renderer:spark-badge',
  'image:/portrait/about_me.jpg', 'responsive-image:/frame/scenery/scenery-01.webp',
])

void test('only enhancement failures may enter reading fallback', () => {
  const at = (failed: string[], completed = 12) =>
    isReadingFallbackReady({ completed, total: 12, failed, optional })

  // The room alone, as before.
  assert.equal(at(['renderer:personal-archive']), true)
  // The real slow-connection shape: room, chapter prewarm and media time out
  // together in one bandwidth window. This used to strand the intro forever.
  assert.equal(at(['renderer:personal-archive', 'layout:chapter-pages', 'media:site']), true)
  assert.equal(at(['layout:chapter-pages']), true)
  assert.equal(at(['shader:liquid-metal', 'renderer:spark-badge']), true)

  // Anything the reader would actually see missing still blocks.
  assert.equal(at(['fonts:document']), false)
  assert.equal(at(['renderer:personal-archive', 'fonts:document']), false)
  // Image prewarm is not the only load path; the <img> refetches on render.
  assert.equal(at(['image:/portrait/about_me.jpg']), true)
  assert.equal(at(['responsive-image:/frame/scenery/scenery-01.webp']), true)
  assert.equal(at(['chunks:chapters']), false)
  assert.equal(at(['texture:hero']), false)

  // Nothing failed is not a fallback, and an unsettled run never is.
  assert.equal(at([]), false)
  assert.equal(at(['renderer:personal-archive'], 11), false)
})
