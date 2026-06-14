import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

const app = read('src/App.tsx')
const hero = read('src/components/Hero.tsx')

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
  [/loadPortraitTargetTexture\(/, 'ParticleContinuum must load the portrait target into the simulation'],
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

const scrollState = read('src/lib/continuum/continuumScrollState.ts')
const scrollHook = read('src/lib/continuum/useContinuumScroll.ts')
if (!scrollHook.includes('useLandingScrollNarrative')) {
  throw new Error('Continuum must consume landing narrative state rather than discrete active chapter state')
}
if (!scrollState.includes('activeIdOrNarrative.theme.cover')) {
  throw new Error('Continuum chapter tint must derive from the same mixed cover color used by landing narrative')
}

console.log('[continuum-guards] Particle Continuum M0 mount contract OK')
