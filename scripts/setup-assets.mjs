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

/* ── Frame gallery: beautified building PNGs → optimized WebP ── */
const frameBuildingsSrcDir = resolve(repoRoot, 'sources/beautified/buildings')
const frameBuildingsOutDir = resolve(projectRoot, 'public/frame/buildings')
const FRAME_BUILDING_MAX_EDGE = 1600
const FRAME_BUILDING_QUALITY = 82
const FRAME_BUILDING_SIG = `edge${FRAME_BUILDING_MAX_EDGE}-q${FRAME_BUILDING_QUALITY}`
const frameBuildingsCacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-frame-buildings.json')

function readCache(file, sig) {
  try {
    const c = JSON.parse(readFileSync(file, 'utf8'))
    return c && c.sig === sig && c.files ? c : { sig, files: {} }
  } catch {
    return { sig, files: {} }
  }
}

if (existsSync(lifeSrcDir)) {
  const { default: sharp } = await import('sharp')
  mkdirSync(lifeOutDir, { recursive: true })

  const cache = readCache(cacheFile, LIFE_SIG)
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

if (existsSync(frameBuildingsSrcDir)) {
  const { default: sharp } = await import('sharp')
  mkdirSync(frameBuildingsOutDir, { recursive: true })

  const cache = readCache(frameBuildingsCacheFile, FRAME_BUILDING_SIG)
  const pngs = readdirSync(frameBuildingsSrcDir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  for (const file of pngs) {
    const src = resolve(frameBuildingsSrcDir, file)
    const out = resolve(frameBuildingsOutDir, `${basename(file, extname(file))}.webp`)
    const srcMtime = statSync(src).mtimeMs

    const fresh = existsSync(out) && cache.files[file] === srcMtime
    if (fresh) continue

    await sharp(src)
      .resize({ width: FRAME_BUILDING_MAX_EDGE, height: FRAME_BUILDING_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: FRAME_BUILDING_QUALITY, effort: 5 })
      .toFile(out)
    cache.files[file] = srcMtime
    console.log(`[setup-assets] sources/beautified/buildings/${file} → public/frame/buildings/${basename(out)} (${FRAME_BUILDING_SIG})`)
  }

  mkdirSync(dirname(frameBuildingsCacheFile), { recursive: true })
  writeFileSync(frameBuildingsCacheFile, JSON.stringify(cache, null, 2))
} else {
  console.warn('[setup-assets] No sources/beautified/buildings dir. Frame building WebP not generated.')
}
