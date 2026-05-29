#!/usr/bin/env node
/**
 * Prepares public/ assets from the untracked ../sources/ input dir:
 *   1. Copies Tim's portrait into public/portrait/tim.jpg for the WebGL hero.
 *   2. Encodes the life-gallery photos (multi-MB PNGs) into lean public/life
 *      WebP. The PNG originals live in ../sources/life and never ship.
 * Idempotent — safe to run on every dev/build (skips up-to-date outputs).
 */

import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const repoRoot = resolve(projectRoot, '..')

const candidates = [
  'sources/Weixin Image_20260528134123_371_7.jpg',
  'sources/Weixin Image_20260528134356_378_7.jpg',
  'sources/Weixin Image_20260528134354_377_7.jpg',
]

const dest = resolve(projectRoot, 'public/portrait/tim.jpg')

let copied = false
for (const rel of candidates) {
  const src = resolve(repoRoot, rel)
  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
    console.log(`[setup-assets] ${rel} → public/portrait/tim.jpg`)
    copied = true
    break
  }
}

if (!copied) {
  console.warn('[setup-assets] No source portrait found. Hero will fall back to placeholder.')
}

/* ── Life gallery: PNG sources → optimized WebP ── */
const lifeSrcDir = resolve(repoRoot, 'sources/life')
const lifeOutDir = resolve(projectRoot, 'public/life')
const LIFE_MAX_EDGE = 1280
const LIFE_QUALITY = 80

if (existsSync(lifeSrcDir)) {
  const { default: sharp } = await import('sharp')
  mkdirSync(lifeOutDir, { recursive: true })

  const pngs = readdirSync(lifeSrcDir).filter((f) => /\.png$/i.test(f))
  for (const file of pngs) {
    const src = resolve(lifeSrcDir, file)
    const out = resolve(lifeOutDir, `${basename(file, extname(file))}.webp`)

    // Skip if the WebP is already newer than its source.
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue

    await sharp(src)
      .resize({ width: LIFE_MAX_EDGE, height: LIFE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: LIFE_QUALITY, effort: 5 })
      .toFile(out)
    console.log(`[setup-assets] sources/life/${file} → public/life/${basename(out)}`)
  }
} else {
  console.warn('[setup-assets] No sources/life dir. Life gallery WebP not generated.')
}
