import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

// Render-ready image byte budget.
//
// Frame has several srcset candidates per logical image. The Loader now asks the
// browser for exactly one candidate, so summing every generated file would
// measure an impossible request set. We budget the largest candidate per Frame
// image (worst device selection) plus the bounded static roots.
//
// Baseline 2026-08-27: largest Frame selections ~9.9 MiB plus static landing
// imagery. Budget keeps modest headroom without charging all 720/1080/original
// variants to every visitor.
const BUDGET_BYTES = 15 * 1024 * 1024

const STATIC_IMAGE_ROOTS = ['dist/life', 'dist/projects', 'dist/portrait', 'dist/noise']
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

function walkBytes(dir) {
  return readdirSync(dir).reduce((sum, entry) => {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) return sum + walkBytes(full)
    return sum + (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase()) ? stats.size : 0)
  }, 0)
}

const FRAME_SOURCE_MANIFEST = 'src/data/frameImageSources.generated.ts'
const missing = [...STATIC_IMAGE_ROOTS, 'dist/frame', FRAME_SOURCE_MANIFEST].filter((entry) => !existsSync(entry))
if (missing.length > 0) {
  throw new Error(
    `Render-ready image inputs missing (build first, or update this guard if the manifest moved):\n  - ${missing.join('\n  - ')}`
  )
}

const generatedSource = readFileSync(FRAME_SOURCE_MANIFEST, 'utf8')
const frameSources = JSON.parse(generatedSource.slice(generatedSource.indexOf('{'), generatedSource.lastIndexOf('}') + 1))
const frameBytes = Object.values(frameSources).reduce((sum, candidates) => {
  const selected = candidates.reduce((largest, candidate) => candidate.width > largest.width ? candidate : largest)
  return sum + statSync(join('dist', selected.src)).size
}, 0)

const breakdown = [
  { dir: 'dist/frame (largest candidate per image)', bytes: frameBytes },
  ...STATIC_IMAGE_ROOTS.map((dir) => ({ dir, bytes: walkBytes(dir) })),
]
const totalBytes = breakdown.reduce((sum, { bytes }) => sum + bytes, 0)

// Anti-vacuous: an empty image set means the asset pipeline broke upstream,
// not that we got 24 MiB faster.
const empty = breakdown.filter(({ bytes }) => bytes === 0)
if (empty.length > 0) {
  throw new Error(`Deferred image roots are empty (asset pipeline regression?): ${empty.map((e) => e.dir).join(', ')}`)
}

const mib = (bytes) => (bytes / 1024 / 1024).toFixed(1)

if (totalBytes > BUDGET_BYTES) {
  const lines = breakdown.map(({ dir, bytes }) => `  - ${dir}: ${mib(bytes)} MiB`).join('\n')
  throw new Error(
    `Render-ready image set is ${mib(totalBytes)} MiB, over the ${mib(BUDGET_BYTES)} MiB budget:\n${lines}\n` +
      'Either shrink/re-encode the new assets or consciously raise BUDGET_BYTES with justification.'
  )
}

console.log(
  `[render-ready-image-budget-guards] ${mib(totalBytes)} MiB of ${mib(BUDGET_BYTES)} MiB budget (` +
    breakdown.map(({ dir, bytes }) => `${dir.replace('dist/', '')} ${mib(bytes)}`).join(', ') +
    ')'
)
