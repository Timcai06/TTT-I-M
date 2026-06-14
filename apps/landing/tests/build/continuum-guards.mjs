import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

const app = read('src/App.tsx')
const hero = read('src/components/Hero.tsx')
const aboutStyles = read('src/styles/components/about.css')
const frameStyles = read('src/styles/components/frame.css')
const lifeStyles = read('src/styles/components/life-gallery.css')

if (!exists('src/lib/continuum/ParticleContinuum.tsx')) {
  throw new Error('M0 requires src/lib/continuum/ParticleContinuum.tsx')
}
if (!exists('src/lib/continuum/useContinuumScroll.ts')) {
  throw new Error('M0 requires src/lib/continuum/useContinuumScroll.ts to connect chapter state to continuum uniforms')
}
if (!exists('src/lib/continuum/forms/registry.ts')) {
  throw new Error('M0 requires a continuum forms registry')
}
if (!exists('src/lib/continuum/forms/portrait.ts')) {
  throw new Error('M0 requires a portrait target form')
}
if (!exists('src/lib/continuum/forms/disintegrate.ts') || !exists('src/lib/continuum/forms/stardust.ts')) {
  throw new Error('M1 requires disintegrate and stardust continuum forms')
}
if (!exists('src/lib/continuum/forms/proceduralTargets.ts')) {
  throw new Error('M1 requires procedural targets for non-portrait continuum forms')
}
if (!exists('src/lib/chapterThemeTokens.ts')) {
  throw new Error('Continuum tint must share the pure chapter theme token source with transitions')
}

if (!/import\s+ParticleContinuum\s+from\s+['"]\.\/lib\/continuum\/ParticleContinuum['"]/.test(app)) {
  throw new Error('App must import the App-level ParticleContinuum')
}

if (!/<ParticleContinuum\s*\/>/.test(app)) {
  throw new Error('App must render <ParticleContinuum /> outside lazy chapters')
}

if (!/ParticlePortrait/.test(hero)) {
  throw new Error('Hero must keep the accepted original ParticlePortrait subject while Continuum is staged behind later chapters')
}

const continuum = read('src/lib/continuum/ParticleContinuum.tsx')
const requiredPatterns = [
  [/from ['"]@react-three\/fiber['"]/, 'ParticleContinuum must use the existing R3F stack'],
  [/shouldMountContinuum\(/, 'ParticleContinuum must honor reduced-motion/WebGL2 mount gating'],
  [/createContinuumSimulation\(/, 'ParticleContinuum must run through the GPGPU simulation core'],
  [/buildContinuumPoints\(/, 'ParticleContinuum must render through the shared point renderer'],
  [/loadContinuumTargetTexture\(/, 'ParticleContinuum must load form-specific targets into the simulation'],
  [/getContinuumForm\('portrait'\)/, 'ParticleContinuum must read the portrait descriptor from the forms registry'],
  [/useContinuumScroll\(/, 'ParticleContinuum must consume the M0 chapter-state/uniform chain'],
  [/\.lerp\(tint, transitionAlpha\)/, 'ParticleContinuum must smoothly interpolate tint instead of jumping colors'],
  [/className=['"]particle-continuum['"]/, 'ParticleContinuum root must expose the fixed-layer CSS class'],
]

for (const [pattern, message] of requiredPatterns) {
  if (!pattern.test(continuum)) throw new Error(message)
}

const registry = read('src/lib/continuum/forms/registry.ts')
if (!registry.includes("fallback: '#hero .hero__portrait-ghost'")) {
  throw new Error('Portrait form must declare the existing Hero fallback selector')
}
if (!registry.includes("export type ContinuumFormId = 'portrait' | 'disintegrate' | 'stardust'")) {
  throw new Error('Continuum form registry must expose portrait, disintegrate, and stardust ids')
}

const scrollState = read('src/lib/continuum/continuumScrollState.ts')
const scrollHook = read('src/lib/continuum/useContinuumScroll.ts')
const proceduralTargets = read('src/lib/continuum/forms/proceduralTargets.ts')
if (!scrollHook.includes('useLandingScrollNarrative')) {
  throw new Error('Continuum must consume landing narrative state rather than discrete active chapter state')
}
if (!scrollState.includes('activeIdOrNarrative.theme.cover')) {
  throw new Error('Continuum chapter tint must derive from the same mixed cover color used by landing narrative')
}
if (!scrollState.includes("about: 'disintegrate'") || !scrollState.includes("frame: 'stardust'")) {
  throw new Error('Continuum scroll state must map About to disintegrate and archive chapters to stardust')
}
if (!proceduralTargets.includes('loadPortraitTargetTexture') || !proceduralTargets.includes('createStardustTargetTexture')) {
  throw new Error('Continuum target loader must preserve portrait target and add stardust target generation')
}

const opaqueSectionBackgrounds = [
  ['about.css', aboutStyles, /\.about\s*\{[^}]*background:\s*var\(--bg\)/s],
  ['frame.css', frameStyles, /\.frame-horizontal\s*\{[^}]*background:\s*var\(--bg\)/s],
  ['life-gallery.css', lifeStyles, /\.life-gallery\s*\{[^}]*background:\s*var\(--bg\)/s],
]
const blockingBackgrounds = opaqueSectionBackgrounds
  .filter(([, source, pattern]) => pattern.test(source))
  .map(([file]) => file)
if (blockingBackgrounds.length > 0) {
  throw new Error(`Continuum must not sit behind opaque section backgrounds: ${blockingBackgrounds.join(', ')}`)
}

console.log('[continuum-guards] Particle Continuum M0/M1 mount and form-target contract OK')
