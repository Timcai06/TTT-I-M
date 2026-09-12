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

// Desktop also prepares original photographs for the lightbox, the selected
// lower-resolution candidate, one retained GLB and the finite film/sound pair.
const desktopFrameBytes = Object.values(frameSources).reduce((sum, candidates) => {
  const largestTwo = [...candidates].sort((a, b) => b.width - a.width).slice(0, 2)
  return sum + largestTwo.reduce((bytes, item) => bytes + statSync(join('dist', item.src)).size, 0)
}, 0)
const modelFiles = readdirSync('dist/assets').filter(name => /^personal-space-.*\.glb$/.test(name))
if (modelFiles.length !== 1) throw new Error('Desktop boot requires exactly one archive asset')
const modelBytes = statSync(join('dist/assets', modelFiles[0])).size
// Audio was counted by naming two files under dist/projects/sciscope, so the six
// room-audio files added later were silently free against the 50 MiB ceiling. Scan
// the prepared roots for audio instead of listing names, and the next file to be
// added is counted whether or not anyone remembers to come back here.
const audioBytes = (() => {
  let total = 0
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(entry.name)) total += statSync(path).size
    }
  }
  walk('dist/projects')
  return total
})()
const mediaBytes = statSync(join('dist/projects/sciscope', 'sciscope-concept-film.mp4')).size + audioBytes
// The transcoder ships in two pieces now. The wasm is still a hashed asset, but
// the JS lives inside dist/archive-basis/ktx2-worker.js, because a worker served
// from a real path carries its own Content-Security-Policy and a blob: worker
// inherits the document's — under which the transcoder cannot start at all. Both
// halves are downloaded by anyone who loads the room, so both are counted.
const decoderFiles = readdirSync('dist/assets').filter(name => /^basis_transcoder-.*\.wasm$/.test(name))
if (decoderFiles.length !== 1) throw new Error('Archive KTX2 requires exactly one WASM transcoder asset')
const workerPath = 'dist/archive-basis/ktx2-worker.js'
if (!existsSync(workerPath)) {
  throw new Error('dist/archive-basis/ktx2-worker.js is missing — the KTX2 worker must ship at a literal path so its CSP rule can match it.')
}
const decoderBytes = decoderFiles.reduce((sum, name) => sum + statSync(join('dist/assets', name)).size, 0)
  + statSync(workerPath).size
const desktopBytes = totalBytes - frameBytes + desktopFrameBytes + modelBytes + mediaBytes + decoderBytes
// 2026-09-12: tim prioritizes the refined model's art. The three source passes
// now ship at 86.1 MiB with full-quality PBR maps; retain a bounded 90 MiB guard.
// See docs/landing/delivery/refined-room-web-20260912.md for this new baseline.
const DESKTOP_BUDGET_MIB = 90
const DESKTOP_BUDGET_BYTES = DESKTOP_BUDGET_MIB * 1024 * 1024
if (desktopBytes > DESKTOP_BUDGET_BYTES) throw new Error(`Desktop prepared assets exceed the revised ${DESKTOP_BUDGET_MIB} MiB budget: ${mib(desktopBytes)}`)
console.log(`[desktop-preparation-budget] ${mib(desktopBytes)} / ${DESKTOP_BUDGET_MIB} MiB for images, room, finite media and KTX2 decoder (${mib(audioBytes)} audio, ${mib(decoderBytes)} decoder); app JS/fonts budget separately.`)
