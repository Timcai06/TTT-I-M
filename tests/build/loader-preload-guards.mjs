import { existsSync, readFileSync } from 'node:fs'

const loaderSource = readFileSync('src/components/Loader.tsx', 'utf8')
const aboutSource = readFileSync('src/components/About.tsx', 'utf8')
const deferredTextParticlesSource = readFileSync('src/components/DeferredTextParticles.tsx', 'utf8')
const heroSource = readFileSync('src/components/Hero.tsx', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

// The whole-site preload was refactored from the monolithic src/lib/sitePreload.ts
// into a tiered resources/ module (plan 01 · §4): manifest (what + tier) +
// loaders (how, per type) + preloadController (the failure-tolerant hook).
const resourceFiles = {
  manifest: 'src/lib/resources/manifest.ts',
  loaders: 'src/lib/resources/loaders.ts',
  controller: 'src/lib/resources/preloadController.ts',
}
for (const [name, path] of Object.entries(resourceFiles)) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} for the whole-site preload ${name}.`)
  }
}

const manifestSource = readFileSync(resourceFiles.manifest, 'utf8')
const loadersSource = readFileSync(resourceFiles.loaders, 'utf8')
const controllerSource = readFileSync(resourceFiles.controller, 'utf8')
const aboutTextParticlesSource = readFileSync('src/lib/aboutTextParticles.ts', 'utf8')
const registrySource = readFileSync('src/chapters/registry.ts', 'utf8')
const packageSource = readFileSync('package.json', 'utf8')
const introPretextPath = 'src/lib/pretextIntroText.ts'

if (!existsSync(introPretextPath)) {
  throw new Error('Missing src/lib/pretextIntroText.ts for the interactive Pretext intro text.')
}

const introPretextSource = readFileSync(introPretextPath, 'utf8')

if (!packageSource.includes('test:build:loader')) {
  throw new Error('test:build must run the loader preload guard.')
}

if (!loaderSource.includes('useWholeSitePreload')) {
  throw new Error('Loader must be driven by the real whole-site preload hook.')
}

if (!loaderSource.includes("resources/preloadController")) {
  throw new Error('Loader must import the preload hook from the resources/ controller.')
}

if (!loaderSource.includes('useIntroPretextInteraction')) {
  throw new Error('Loader must attach the Pretext-powered intro text interaction hook.')
}

if (!manifestSource.includes('preloadAboutTextParticles') || !manifestSource.includes('particles:about-manifesto')) {
  throw new Error('Preload manifest must include the About manifesto particle text, not wait for scroll.')
}

if (!aboutSource.includes('ABOUT_PARTICLE_TEXT') || !aboutTextParticlesSource.includes('Built by hand, frame by frame.')) {
  throw new Error('About manifesto particle text must be shared with the preload manifest.')
}

if (deferredTextParticlesSource.includes('IntersectionObserver')) {
  throw new Error('DeferredTextParticles must not wait for scroll intersection before loading.')
}

if (!loaderSource.includes('introReady && !done && !exiting')) {
  throw new Error('Loader must wait until the intro title has landed before measuring Pretext glyphs.')
}

if (!loaderSource.includes('intro__stage')) {
  throw new Error('Loader must show a compact current preload stage while the full-site gate is active.')
}

if (!loaderSource.includes('intro__text-wrap--interactive')) {
  throw new Error('Loader must release the intro text mask while the Pretext interaction is active.')
}

if (!heroSource.includes('usePretextTextInteraction') || !heroSource.includes('pretext-glyph')) {
  throw new Error('Hero title must reuse the Pretext text interaction used by the intro.')
}

if (loaderSource.includes('v: 100') || loaderSource.includes('duration: 1.6')) {
  throw new Error('Loader still contains the old fake 0-100 timed counter animation.')
}

// ── Manifest: still the whole-site (curated) asset set, now explicitly tiered ──
const requiredManifestInputs = [
  'archiveImages',
  'projects',
  'photos',
  'preloadLazyChapters',
  'srcSet',
  'chunks:pretext',
  'texture:hero',
  'particles:about-manifesto',
  "tier: 'critical'",
  "tier: 'deferred'",
]
const missingManifest = requiredManifestInputs.filter((needle) => !manifestSource.includes(needle))
if (missingManifest.length > 0) {
  throw new Error(`Whole-site preload manifest is missing: ${missingManifest.join(', ')}`)
}

// ── Loaders: the per-type load implementations ──
const requiredLoaderInputs = [
  'TextureLoader',
  'document.fonts.ready',
  'decode',
  '@chenglou/pretext',
  'TextParticles',
  'FONT_READY_DEV_TIMEOUT_MS',
]
const missingLoaders = requiredLoaderInputs.filter((needle) => !loadersSource.includes(needle))
if (missingLoaders.length > 0) {
  throw new Error(`Preload loaders are missing: ${missingLoaders.join(', ')}`)
}

// ── Controller: keeps debug + the A1 fix (no permanent black screen) ──
const requiredControllerInputs = [
  'useWholeSitePreload',
  '__portfolioPreloadDebug',
  'console.table',
  'TASK_TIMEOUT_MS',
  'withTimeout',
  'non-fatal',
  'ready: true',
]
const missingController = requiredControllerInputs.filter((needle) => !controllerSource.includes(needle))
if (missingController.length > 0) {
  throw new Error(`Preload controller is missing: ${missingController.join(', ')}`)
}

// A1 regression guard: a single failed/slow resource must never leave the intro
// stranded. Only the initial state may be ready:false — a second occurrence
// signals a fatal completion path (the old "block intro on failure" bug).
const readyFalseCount = (controllerSource.match(/ready: false/g) ?? []).length
if (readyFalseCount > 1) {
  throw new Error('Preload controller has a ready:false completion path (A1): failures must be non-fatal.')
}

if (!registrySource.includes('lazyChapterLoaders') || !registrySource.includes('preloadLazyChapters')) {
  throw new Error('Lazy chapter loaders must be reusable by the preload manifest.')
}

if (!packageJson.dependencies?.['@chenglou/pretext']) {
  throw new Error('package.json must include @chenglou/pretext as a runtime dependency.')
}

const requiredIntroPretextInputs = [
  '@chenglou/pretext',
  'prepareWithSegments',
  'measureNaturalWidth',
  'usePretextTextInteraction',
  'useIntroPretextInteraction',
  'requestAnimationFrame',
  'press',
  'catch',
  'waitForFontsBeforePretext',
  'FONT_READY_INTERACTION_TIMEOUT_MS',
]

const missingIntroInputs = requiredIntroPretextInputs.filter((needle) => !introPretextSource.includes(needle))
if (missingIntroInputs.length > 0) {
  throw new Error(`Pretext intro interaction is missing: ${missingIntroInputs.join(', ')}`)
}

console.log('[loader-preload-guards] Tiered resources/ preload (manifest + loaders + controller) is wired to the Loader, keeps Pretext paths, and is failure-tolerant (A1).')
