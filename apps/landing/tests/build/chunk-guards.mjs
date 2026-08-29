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

const requiredHeroPreloads = ['three-core', 'react-three-fiber']
  .filter((needle) => !htmlSource.includes(needle))
if (requiredHeroPreloads.length > 0) {
  throw new Error(`Hero WebGL assets are not preloaded from index.html: ${requiredHeroPreloads.join(', ')}`)
}

if (indexSource.includes('ParticleContinuum')) {
  throw new Error(`Entry chunk ${indexChunk} still contains the retired global Particle Continuum layer.`)
}

if (!indexSource.includes('ParticlePortrait')) {
  throw new Error(`Entry chunk ${indexChunk} must keep the accepted original Hero ParticlePortrait subject.`)
}


const forbiddenDebugNeedles = ['leva', '__CONTINUUM_DEBUG__', 'continuumQualityForTier']
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
  'three-core': 220,
  'react-three-fiber': 60,
  'react-vendor': 72,
  'gsap-vendor': 66,
  'index': 41,
  'layout': 24,
  'workHandoff': 5,
  'projects': 18,
  'ProjectCaseDialog': 20,
  'photoswipe.esm': 30,
  'MobileProjectCarousel': 12,
  'ProjectMetrics': 8,
}
const TOTAL_JS_BUDGET_KB = 540
const TOTAL_CSS_BUDGET_KB = 160

const jsFiles = readdirSync(distDir).filter((file) => file.endsWith('.js'))
const gzipKb = (file) => gzipSync(readFileSync(resolve(distDir, file))).length / 1024

const productionLabLeaks = readdirSync(distDir).filter((file) => /VisualLab|visual-lab/i.test(file))
if (productionLabLeaks.length > 0 || jsFiles.some((file) => readFileSync(resolve(distDir, file), 'utf8').includes('Visual systems lab'))) {
  throw new Error(`Development-only Visual Lab leaked into production assets: ${productionLabLeaks.join(', ') || 'inline source'}`)
}

const liquidSourceAsset = readdirSync(distDir)
  .find((file) => /^liquid-metal-button-.*\.html$/.test(file))
if (!liquidSourceAsset) {
  throw new Error('Liquid Metal source must be emitted as a static HTML asset.')
}
const liquidSourceEmbeddedInJs = jsFiles.some((file) => {
  const source = readFileSync(resolve(distDir, file), 'utf8')
  return source.includes('<!DOCTYPE html>') && source.includes('<title>Liquid Metal Button</title>')
})
if (liquidSourceEmbeddedInJs) {
  throw new Error('Liquid Metal source regressed into the JavaScript graph instead of loading as an asset.')
}

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

const cssFiles = readdirSync(distDir).filter((file) => file.endsWith('.css'))
const totalCssKb = cssFiles.reduce((sum, file) => sum + gzipKb(file), 0)
if (totalCssKb > TOTAL_CSS_BUDGET_KB) {
  budgetFailures.push(`total CSS is ${totalCssKb.toFixed(1)} KB gzip, over the ${TOTAL_CSS_BUDGET_KB} KB budget`)
}

if (budgetFailures.length > 0) {
  throw new Error(`Chunk size budget exceeded:\n  - ${budgetFailures.join('\n  - ')}`)
}

console.log(`[chunk-guards] ${indexChunk} keeps Hero WebGL eager while chapter-scoped effects remain lazy.`)
console.log(`[chunk-guards] total JS ${totalKb.toFixed(1)} KB gzip within ${TOTAL_JS_BUDGET_KB} KB budget.`)
console.log(`[chunk-guards] total CSS ${totalCssKb.toFixed(1)} KB gzip within ${TOTAL_CSS_BUDGET_KB} KB budget.`)
