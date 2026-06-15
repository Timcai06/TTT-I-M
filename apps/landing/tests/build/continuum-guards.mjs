import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

const app = read('src/App.tsx')
const hero = read('src/components/Hero.tsx')
const about = read('src/components/About.tsx')
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
if (/DeferredTextParticles|ABOUT_PARTICLE_TEXT/.test(about)) {
  throw new Error('M1b requires About to retire its legacy TextParticles canvas and let ParticleContinuum own the particle narrative')
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
  [/useStage\(/, 'ParticleContinuum must subscribe to the runtime stage machine'],
  [/getContinuumFrameloop\(stage,\s*scrollState\.opacity\)/, 'ParticleContinuum Canvas frameloop must be gated by stage and opacity'],
  [/shouldRunContinuumFrame\(stage,\s*scrollState\.opacity\)/, 'ParticleContinuum frame compute must be gated by stage and opacity'],
  [/frameloop=\{frameloop\}/, 'ParticleContinuum Canvas must not use the default always frameloop'],
  [/if \(!bundle \|\| !shouldRun\) return/, 'ParticleContinuum useFrame must stop compute when hidden or transitioning'],
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
for (const formId of ['portrait', 'disintegrate', 'stardust', 'mathSurface', 'gerstner']) {
  if (!registry.includes(formId)) {
    throw new Error(`Continuum form registry must expose ${formId}`)
  }
}
if (!registry.includes('blendMode')) {
  throw new Error('Continuum form registry must expose blendMode for bright-section safety')
}
if (!registry.includes("blendMode: 'normal'")) {
  throw new Error('Portrait/bright-safe forms must be able to use normal blending')
}
if (!exists('src/lib/continuum/forms/mathSurface.ts') || !exists('src/lib/continuum/forms/gerstner.ts')) {
  throw new Error('M2/M3 require mathSurface and gerstner form descriptors')
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
if (scrollState.includes('string | LandingScrollNarrative')) {
  throw new Error('Continuum scroll state must not keep a test-only string path; production consumes landing narrative')
}
if (!scrollState.includes('fromFormId') || !scrollState.includes('toFormId') || !scrollState.includes('morph: fromFormId === toFormId')) {
  throw new Error('M1 requires Continuum scroll state to expose from/to form ids and a narrative-driven morph')
}
if (!scrollState.includes("about: 'disintegrate'") || !scrollState.includes("frame: 'stardust'") || !scrollState.includes("projects: 'mathSurface'") || !scrollState.includes("contact: 'gerstner'")) {
  throw new Error('Continuum scroll state must map About/Frame/Work/Contact to their planned forms')
}
for (const targetFactory of ['loadPortraitTargetTexture', 'createStardustTargetTexture', 'createMathSurfaceTargetTexture', 'createGerstnerTargetTexture']) {
  if (!proceduralTargets.includes(targetFactory)) {
    throw new Error(`Continuum target loader must include ${targetFactory}`)
  }
}
const simulation = read('src/lib/continuum/simulation.ts')
const velocityShader = read('src/lib/continuum/shaders/sim-velocity.glsl')
const positionShader = read('src/lib/continuum/shaders/sim-position.glsl')
const renderShader = read('src/lib/continuum/shaders/render.vert')
for (const [file, source] of [
  ['simulation.ts', simulation],
  ['sim-velocity.glsl', velocityShader],
  ['sim-position.glsl', positionShader],
  ['render.vert', renderShader],
]) {
  if (!source.includes('uFromTarget') || !source.includes('uToTarget') || !source.includes('uMorph')) {
    throw new Error(`${file} must support M1 dual-target morph uniforms`)
  }
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

console.log('[continuum-guards] Particle Continuum M0/M1 mount, form-target, and About ownership contract OK')
