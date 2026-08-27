import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

// Deferred-image byte budget (2026-06-10 audit follow-up).
//
// The loader's deferred tier eagerly background-fetches every curated landing
// image after the intro exits (manifest.ts → collectImageUrls: frame archive,
// life photos, project shots, portraits/hero texture). That whole-site preheat
// is intentional — but its total byte cost is invisible in code review: one
// new frame theme can silently add many MB to what every visitor downloads.
// This guard makes the budget explicit. The directory set below mirrors
// collectImageUrls' sources; if the manifest grows a new image root, add it
// here (the cross-check beneath fails loudly if a known root disappears).
//
// Baseline 2026-06-12: ~24.0 MiB (frame 22.3 + projects 1.1 + life 0.3 +
// portrait 0.3). Budget = baseline + ~8% headroom. Raising it is allowed but
// must be a conscious decision in a diff, not an accident.
const BUDGET_BYTES = 26 * 1024 * 1024

const DEFERRED_IMAGE_ROOTS = ['dist/frame', 'dist/life', 'dist/projects', 'dist/portrait']
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

function walkBytes(dir) {
  return readdirSync(dir).reduce((sum, entry) => {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) return sum + walkBytes(full)
    return sum + (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase()) ? stats.size : 0)
  }, 0)
}

const missing = DEFERRED_IMAGE_ROOTS.filter((dir) => !existsSync(dir))
if (missing.length > 0) {
  throw new Error(
    `Deferred image roots missing from dist (build first, or update this guard if the manifest moved):\n  - ${missing.join('\n  - ')}`
  )
}

const breakdown = DEFERRED_IMAGE_ROOTS.map((dir) => ({ dir, bytes: walkBytes(dir) }))
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
    `Deferred preheat image set is ${mib(totalBytes)} MiB, over the ${mib(BUDGET_BYTES)} MiB budget:\n${lines}\n` +
      'Either shrink/re-encode the new assets or consciously raise BUDGET_BYTES with justification.'
  )
}

console.log(
  `[deferred-image-budget-guards] ${mib(totalBytes)} MiB of ${mib(BUDGET_BYTES)} MiB budget (` +
    breakdown.map(({ dir, bytes }) => `${dir.replace('dist/', '')} ${mib(bytes)}`).join(', ') +
    ')'
)
