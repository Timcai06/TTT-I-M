import { existsSync, readFileSync } from 'node:fs'

const loaderSource = readFileSync('src/components/Loader.tsx', 'utf8')
const heroSource = readFileSync('src/components/Hero.tsx', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
if (!existsSync('src/lib/sitePreload.ts')) {
  throw new Error('Missing src/lib/sitePreload.ts for the whole-site preload manifest.')
}

const preloadSource = readFileSync('src/lib/sitePreload.ts', 'utf8')
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

if (!loaderSource.includes('useIntroPretextInteraction')) {
  throw new Error('Loader must attach the Pretext-powered intro text interaction hook.')
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

const requiredPreloadInputs = [
  'archiveImages',
  'projects',
  'photos',
  'preloadLazyChapters',
  'TextParticles',
  'TextureLoader',
  'document.fonts.ready',
  'srcSet',
  '@chenglou/pretext',
  'decode().catch',
  'FONT_READY_DEV_TIMEOUT_MS',
  'priorityTasks',
  'imageTasks',
  'chunks:pretext',
  'texture:hero',
  '__portfolioPreloadDebug',
  'console.table',
  'pending',
  'rejected',
]

const missingInputs = requiredPreloadInputs.filter((needle) => !preloadSource.includes(needle))
if (missingInputs.length > 0) {
  throw new Error(`Whole-site preload manifest is missing: ${missingInputs.join(', ')}`)
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
  'waitForFontsBeforePretext',
  'FONT_READY_INTERACTION_TIMEOUT_MS',
]

const missingIntroInputs = requiredIntroPretextInputs.filter((needle) => !introPretextSource.includes(needle))
if (missingIntroInputs.length > 0) {
  throw new Error(`Pretext intro interaction is missing: ${missingIntroInputs.join(', ')}`)
}

console.log('[loader-preload-guards] Loader progress and intro text interaction are tied to Pretext-backed preload paths.')
