import assert from 'node:assert/strict'
import test from 'node:test'

import { DECRYPT_REVEAL_CONFIG } from '../src/lib/canvas-ui/decryptRevealConfig.ts'
import { PROJECT_GLASS_CONFIG } from '../src/lib/canvas-ui/glassConfig.ts'
import { CANVAS_UI_SOURCE } from '../src/lib/canvas-ui/provenance.ts'

void test('Decrypt Reveal keeps Canvas UI demo optics and only applies portfolio colors', () => {
  assert.deepEqual(DECRYPT_REVEAL_CONFIG, {
    radius: 400,
    softness: 0.5,
    cell: 10,
    aspect: 0.75,
    colored: 1,
    color: '#d6c5a8',
    brightness: 1,
    legibility: 1,
    contrast: 1,
    exposure: 1,
    scramble: 0.1,
    scrambleSpeed: 6,
    edgeWidth: 0.2,
    edgeFlicker: 1,
    edgeGlow: 2,
    edgeTint: 0.75,
    aberration: 10,
    passthrough: 0.15,
    threshold: 0.025,
    background: '#0a0a0a',
    smoothing: 0.2,
  })
})

void test('Project Glass keeps the official 120px-radius physical lens profile', () => {
  assert.deepEqual(PROJECT_GLASS_CONFIG, {
    shape: 'circle',
    size: 120,
    aspect: 1.7,
    corner: 32,
    ior: 1.5,
    edge: 0.7,
    bevel: 4,
    depth: 250,
    aberration: 1,
    blur: 0,
    reflection: 1,
    shine: 0.01,
    zoom: 1.5,
    follow: 0.2,
    targets: '.media-frame__stage, .project-card__title, .project-card__link, .media-thumb',
  })
})

void test('identity effects are pinned to an auditable Canvas UI source revision', () => {
  assert.equal(CANVAS_UI_SOURCE.license, 'MIT + Commons Clause')
  assert.equal(
    CANVAS_UI_SOURCE.imports.decryptReveal.commit,
    'a4b40d03ad92a6210af114df7a1900a2675fe288',
  )
  assert.equal(
    CANVAS_UI_SOURCE.imports.glass.commit,
    CANVAS_UI_SOURCE.imports.decryptReveal.commit,
  )
})
