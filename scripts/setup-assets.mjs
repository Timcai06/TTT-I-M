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
const FRAME_BUILDING_MAX_EDGE = 1400
const FRAME_BUILDING_QUALITY = 80
const FRAME_BUILDING_SIG = `edge${FRAME_BUILDING_MAX_EDGE}-q${FRAME_BUILDING_QUALITY}`
const frameBuildingsCacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-frame-buildings.json')
const FRAME_RESPONSIVE_WIDTHS = [720, 1080]
const FRAME_RESPONSIVE_SIG = `responsive-width-v2-${FRAME_RESPONSIVE_WIDTHS.join('-')}`

/* Frame archive: cuisine/scenery sources -> optimized WebP */
const frameCuisineBeautifiedSrcDir = resolve(repoRoot, 'sources/beautified/cuisine')
const frameCuisineRawSrcDir = resolve(repoRoot, 'sources/cuisine')
const frameCuisineOutDir = resolve(projectRoot, 'public/frame/cuisine')
const frameSceneryBeautifiedSrcDir = resolve(repoRoot, 'sources/beautified/scenery')
const frameSceneryRawSrcDir = resolve(repoRoot, 'sources/scenery')
const frameSceneryOutDir = resolve(projectRoot, 'public/frame/scenery')
const FRAME_ARCHIVE_MAX_EDGE = 1400
const FRAME_ARCHIVE_QUALITY = 80
const FRAME_ARCHIVE_SIG = `edge${FRAME_ARCHIVE_MAX_EDGE}-q${FRAME_ARCHIVE_QUALITY}`
const frameCuisineCacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-frame-cuisine.json')
const frameSceneryCacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-frame-scenery.json')
const frameImageSourcesFile = resolve(projectRoot, 'src/data/frameImageSources.generated.ts')

async function encodeFrameResponsiveVariants({
  src,
  outDir,
  baseName,
  cache,
  cacheKey,
  srcMtime,
  quality,
}) {
  const { default: sharp } = await import('sharp')

  for (const width of FRAME_RESPONSIVE_WIDTHS) {
    const variantKey = `${cacheKey}:responsive:${FRAME_RESPONSIVE_SIG}:${width}`
    const out = resolve(outDir, `${baseName}-${width}.webp`)
    const fresh = existsSync(out) && cache.files[variantKey] === srcMtime
    if (fresh) continue

    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(out)

    cache.files[variantKey] = srcMtime
    console.log(`[setup-assets] ${out.replace(`${projectRoot}/`, '')} (${width}w)`)
  }
}

function toPublicPath(file) {
  return `/${file.replace(`${resolve(projectRoot, 'public')}/`, '')}`
}

async function writeFrameImageSourcesManifest() {
  const { default: sharp } = await import('sharp')
  const frameDirs = [frameBuildingsOutDir, frameCuisineOutDir, frameSceneryOutDir]
  const manifest = {}

  for (const dir of frameDirs) {
    if (!existsSync(dir)) continue

    const originals = readdirSync(dir)
      .filter((file) => /\.webp$/i.test(file) && !new RegExp(`-(${FRAME_RESPONSIVE_WIDTHS.join('|')})\\.webp$`, 'i').test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    for (const file of originals) {
      const base = basename(file, extname(file))
      const paths = [
        ...FRAME_RESPONSIVE_WIDTHS.map((width) => resolve(dir, `${base}-${width}.webp`)),
        resolve(dir, file),
      ].filter((candidate) => existsSync(candidate))

      const byWidth = new Map()
      for (const candidate of paths) {
        const metadata = await sharp(candidate).metadata()
        if (!metadata.width) continue
        byWidth.set(metadata.width, toPublicPath(candidate))
      }

      manifest[toPublicPath(resolve(dir, file))] = [...byWidth.entries()]
        .sort(([a], [b]) => a - b)
        .map(([width, src]) => ({ src, width }))
    }
  }

  const content = [
    '// Generated by scripts/setup-assets.mjs. Do not edit by hand.',
    `export const frameImageSources = ${JSON.stringify(manifest, null, 2)} as const`,
    '',
  ].join('\n')

  writeFileSync(frameImageSourcesFile, content)
  console.log(`[setup-assets] ${frameImageSourcesFile.replace(`${projectRoot}/`, '')}`)
}

function readCache(file, sig) {
  try {
    const c = JSON.parse(readFileSync(file, 'utf8'))
    return c && c.sig === sig && c.files ? c : { sig, files: {} }
  } catch {
    return { sig, files: {} }
  }
}

function hasSourceImages(srcDir, extensions = ['.jpg', '.jpeg', '.png']) {
  return existsSync(srcDir)
    && readdirSync(srcDir).some((file) => extensions.some((ext) => file.toLowerCase().endsWith(ext)))
}

async function encodeImageDir({ label, srcDir, outDir, cacheFile, extensions = ['.jpg', '.jpeg', '.png'] }) {
  if (!existsSync(srcDir)) {
    console.warn(`[setup-assets] No ${label} dir at ${srcDir}. Assets not generated.`)
    return
  }

  const { default: sharp } = await import('sharp')
  mkdirSync(outDir, { recursive: true })

  const cache = readCache(cacheFile, FRAME_ARCHIVE_SIG)
  const files = readdirSync(srcDir)
    .filter((file) => extensions.some((ext) => file.toLowerCase().endsWith(ext)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  for (const file of files) {
    const src = resolve(srcDir, file)
    const out = resolve(outDir, `${basename(file, extname(file))}.webp`)
    const srcMtime = statSync(src).mtimeMs

    const fresh = existsSync(out) && cache.files[file] === srcMtime
    if (!fresh) {
      await sharp(src)
        .resize({ width: FRAME_ARCHIVE_MAX_EDGE, height: FRAME_ARCHIVE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: FRAME_ARCHIVE_QUALITY, effort: 5 })
        .toFile(out)
      cache.files[file] = srcMtime
      console.log(`[setup-assets] ${label}/${file} -> ${out.replace(`${projectRoot}/`, '')} (${FRAME_ARCHIVE_SIG})`)
    }

    await encodeFrameResponsiveVariants({
      src,
      outDir,
      baseName: basename(file, extname(file)),
      cache,
      cacheKey: file,
      srcMtime,
      quality: FRAME_ARCHIVE_QUALITY,
    })
  }

  mkdirSync(dirname(cacheFile), { recursive: true })
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
}

function numberedFrameImageEntries({ beautifiedDir, rawDir, rawPrefix }) {
  if (!existsSync(rawDir)) {
    console.warn(`[setup-assets] No raw frame scenery dir at ${rawDir}. Assets not generated.`)
    return []
  }

  const rawFiles = readdirSync(rawDir)
    .filter((file) => /\.(jpe?g|png)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return rawFiles.flatMap((rawFile) => {
    const match = rawFile.match(/(\d+)/)
    if (!match) return []

    const id = match[1].padStart(2, '0')
    const beautifiedFile = existsSync(beautifiedDir)
      ? readdirSync(beautifiedDir).find((file) => {
        const beautifiedMatch = file.match(/(\d+)/)
        return beautifiedMatch?.[1].padStart(2, '0') === id && /\.(jpe?g|png)$/i.test(file)
      })
      : undefined

    const sourceFile = beautifiedFile ?? rawFile
    const sourceDir = beautifiedFile ? beautifiedDir : rawDir
    return [{
      file: sourceFile,
      id,
      label: beautifiedFile ? 'sources/beautified/scenery' : 'sources/scenery',
      outName: `${rawPrefix}-${id}.webp`,
      src: resolve(sourceDir, sourceFile),
    }]
  })
}

async function encodeFrameSceneryDir() {
  const { default: sharp } = await import('sharp')
  mkdirSync(frameSceneryOutDir, { recursive: true })

  const cache = readCache(frameSceneryCacheFile, FRAME_ARCHIVE_SIG)
  const entries = numberedFrameImageEntries({
    beautifiedDir: frameSceneryBeautifiedSrcDir,
    rawDir: frameSceneryRawSrcDir,
    rawPrefix: 'scenery',
  })

  for (const entry of entries) {
    const out = resolve(frameSceneryOutDir, entry.outName)
    const srcMtime = statSync(entry.src).mtimeMs
    const cacheKey = `${entry.outName}:${entry.src}`

    const fresh = existsSync(out) && cache.files[cacheKey] === srcMtime
    if (!fresh) {
      await sharp(entry.src)
        .resize({ width: FRAME_ARCHIVE_MAX_EDGE, height: FRAME_ARCHIVE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: FRAME_ARCHIVE_QUALITY, effort: 5 })
        .toFile(out)
      cache.files[cacheKey] = srcMtime
      console.log(`[setup-assets] ${entry.label}/${entry.file} -> ${out.replace(`${projectRoot}/`, '')} (${FRAME_ARCHIVE_SIG})`)
    }

    await encodeFrameResponsiveVariants({
      src: entry.src,
      outDir: frameSceneryOutDir,
      baseName: basename(entry.outName, extname(entry.outName)),
      cache,
      cacheKey,
      srcMtime,
      quality: FRAME_ARCHIVE_QUALITY,
    })
  }

  mkdirSync(dirname(frameSceneryCacheFile), { recursive: true })
  writeFileSync(frameSceneryCacheFile, JSON.stringify(cache, null, 2))
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
    if (!fresh) {
      await sharp(src)
        .resize({ width: FRAME_BUILDING_MAX_EDGE, height: FRAME_BUILDING_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: FRAME_BUILDING_QUALITY, effort: 5 })
        .toFile(out)
      cache.files[file] = srcMtime
      console.log(`[setup-assets] sources/beautified/buildings/${file} → public/frame/buildings/${basename(out)} (${FRAME_BUILDING_SIG})`)
    }

    await encodeFrameResponsiveVariants({
      src,
      outDir: frameBuildingsOutDir,
      baseName: basename(file, extname(file)),
      cache,
      cacheKey: file,
      srcMtime,
      quality: FRAME_BUILDING_QUALITY,
    })
  }

  mkdirSync(dirname(frameBuildingsCacheFile), { recursive: true })
  writeFileSync(frameBuildingsCacheFile, JSON.stringify(cache, null, 2))
} else {
  console.warn('[setup-assets] No sources/beautified/buildings dir. Frame building WebP not generated.')
}

const frameCuisineSrcDir = hasSourceImages(frameCuisineBeautifiedSrcDir)
  ? frameCuisineBeautifiedSrcDir
  : frameCuisineRawSrcDir

await encodeImageDir({
  label: frameCuisineSrcDir === frameCuisineBeautifiedSrcDir ? 'sources/beautified/cuisine' : 'sources/cuisine',
  srcDir: frameCuisineSrcDir,
  outDir: frameCuisineOutDir,
  cacheFile: frameCuisineCacheFile,
})

await encodeFrameSceneryDir()
await writeFrameImageSourcesManifest()
