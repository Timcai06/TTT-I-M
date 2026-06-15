import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = resolve('dist/assets')
const indexHtml = resolve('dist/index.html')

if (!existsSync(distDir) || !existsSync(indexHtml)) {
  throw new Error('dist/assets is missing. Run npm run build before chunk guards.')
}

const indexChunk = readdirSync(distDir).find((file) => /^index-.*\.js$/.test(file))

if (!indexChunk) {
  throw new Error('Could not find the built app entry chunk.')
}

const indexSource = readFileSync(resolve(distDir, indexChunk), 'utf8')
const htmlSource = readFileSync(indexHtml, 'utf8')

const requiredHeroPreloads = ['three-vendor']
  .filter((needle) => !htmlSource.includes(needle))
if (requiredHeroPreloads.length > 0) {
  throw new Error(`Hero WebGL assets are not preloaded from index.html: ${requiredHeroPreloads.join(', ')}`)
}

if (!indexSource.includes('ParticleContinuum')) {
  throw new Error(`Entry chunk ${indexChunk} does not contain the App-level Particle Continuum layer.`)
}

if (!indexSource.includes('ParticlePortrait')) {
  throw new Error(`Entry chunk ${indexChunk} must keep the accepted original Hero ParticlePortrait subject.`)
}


const forbiddenDebugNeedles = ['leva', '__CONTINUUM_DEBUG__']
const debugLeaks = forbiddenDebugNeedles.filter((needle) => indexSource.includes(needle))
if (debugLeaks.length > 0) {
  throw new Error(`Production entry chunk contains debug-only Continuum tooling: ${debugLeaks.join(', ')}`)
}

const runtimePreloadedAssets = ['TextParticles']
  .filter((needle) => htmlSource.includes(needle))
if (runtimePreloadedAssets.length > 0) {
  throw new Error(`Runtime-preloaded WebGL assets should not be forced directly from index.html: ${runtimePreloadedAssets.join(', ')}`)
}

const textParticleChunk = readdirSync(distDir).find((file) => /^TextParticles-.*\.js$/.test(file))
if (textParticleChunk) {
  throw new Error(`Retired About TextParticles chunk should not be emitted after M1b: ${textParticleChunk}`)
}

const pretextChunk = readdirSync(distDir).find((file) => /^layout-.*\.js$/.test(file))
if (!pretextChunk) {
  throw new Error('Could not find the split Pretext layout chunk for intro text interaction.')
}

// ── Chunk size budgets (gzip KB) — plan 02 · A10 ──
// Per-chunk ceilings with headroom above current sizes, plus a total-JS cap, so
// a dependency bump or an accidental eager import of three/gsap fails CI instead
// of silently regressing load. Raise a budget deliberately when a chunk grows
// for a real reason.
const PER_CHUNK_BUDGET_KB = {
  'three-vendor': 260,
  'react-vendor': 72,
  'gsap-vendor': 66,
  'index': 40,
  'layout': 24,
}
const TOTAL_JS_BUDGET_KB = 460

const jsFiles = readdirSync(distDir).filter((file) => file.endsWith('.js'))
const gzipKb = (file) => gzipSync(readFileSync(resolve(distDir, file))).length / 1024

const budgetFailures = []
for (const [prefix, budget] of Object.entries(PER_CHUNK_BUDGET_KB)) {
  const file = jsFiles.find((name) => new RegExp(`^${prefix}-[A-Za-z0-9_-]+\\.js$`).test(name))
  if (!file) {
    budgetFailures.push(`missing chunk for "${prefix}" (cannot enforce its budget)`)
    continue
  }
  const size = gzipKb(file)
  if (size > budget) {
    budgetFailures.push(`${file} is ${size.toFixed(1)} KB gzip, over its ${budget} KB budget`)
  }
}

const totalKb = jsFiles.reduce((sum, file) => sum + gzipKb(file), 0)
if (totalKb > TOTAL_JS_BUDGET_KB) {
  budgetFailures.push(`total JS is ${totalKb.toFixed(1)} KB gzip, over the ${TOTAL_JS_BUDGET_KB} KB budget`)
}

if (budgetFailures.length > 0) {
  throw new Error(`Chunk size budget exceeded:\n  - ${budgetFailures.join('\n  - ')}`)
}

console.log(`[chunk-guards] ${indexChunk} preloads Hero WebGL and keeps ${pretextChunk} available for loader-time preloading.`)
console.log(`[chunk-guards] total JS ${totalKb.toFixed(1)} KB gzip within ${TOTAL_JS_BUDGET_KB} KB budget.`)
