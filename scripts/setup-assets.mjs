#!/usr/bin/env node
/**
 * Prepares public/ assets from the untracked ../sources/ input dir:
 *   1. Copies Tim's portrait into public/portrait/tim.jpg for the WebGL hero.
 *   2. Encodes the life-gallery photos (multi-MB PNGs) into lean public/life
 *      WebP. The PNG originals live in ../sources/life and never ship.
 * Idempotent — safe to run on every dev/build (skips up-to-date outputs).
 */

import {
  mkdirSync,
  copyFileSync,
  existsSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
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

// Encode-params fingerprint. Bump implicitly by editing MAX_EDGE/QUALITY:
// the cache records the signature it was built with, so changing either value
// forces a full re-encode instead of silently keeping stale outputs.
const LIFE_SIG = `edge${LIFE_MAX_EDGE}-q${LIFE_QUALITY}`
const cacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-life.json')

function readCache() {
  try {
    const c = JSON.parse(readFileSync(cacheFile, 'utf8'))
    return c && c.sig === LIFE_SIG && c.files ? c : { sig: LIFE_SIG, files: {} }
  } catch {
    return { sig: LIFE_SIG, files: {} }
  }
}

if (existsSync(lifeSrcDir)) {
  const { default: sharp } = await import('sharp')
  mkdirSync(lifeOutDir, { recursive: true })

  const cache = readCache()
  const pngs = readdirSync(lifeSrcDir).filter((f) => /\.png$/i.test(f))
  for (const file of pngs) {
    const src = resolve(lifeSrcDir, file)
    const out = resolve(lifeOutDir, `${basename(file, extname(file))}.webp`)
    const srcMtime = statSync(src).mtimeMs

    // Regenerate unless the output exists AND was built from this exact source
    // mtime under the current encode signature.
    const fresh = existsSync(out) && cache.files[file] === srcMtime
    if (fresh) continue

    await sharp(src)
      .resize({ width: LIFE_MAX_EDGE, height: LIFE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: LIFE_QUALITY, effort: 5 })
      .toFile(out)
    cache.files[file] = srcMtime
    console.log(`[setup-assets] sources/life/${file} → public/life/${basename(out)} (${LIFE_SIG})`)
  }

  mkdirSync(dirname(cacheFile), { recursive: true })
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
} else {
  console.warn('[setup-assets] No sources/life dir. Life gallery WebP not generated.')
}
