import { existsSync, readFileSync } from 'node:fs'

const loaderSource = readFileSync('src/components/Loader.tsx', 'utf8')
if (!existsSync('src/lib/sitePreload.ts')) {
  throw new Error('Missing src/lib/sitePreload.ts for the whole-site preload manifest.')
}

const preloadSource = readFileSync('src/lib/sitePreload.ts', 'utf8')
const registrySource = readFileSync('src/chapters/registry.ts', 'utf8')
const packageSource = readFileSync('package.json', 'utf8')

if (!packageSource.includes('test:build:loader')) {
  throw new Error('test:build must run the loader preload guard.')
}

if (!loaderSource.includes('useWholeSitePreload')) {
  throw new Error('Loader must be driven by the real whole-site preload hook.')
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
]

const missingInputs = requiredPreloadInputs.filter((needle) => !preloadSource.includes(needle))
if (missingInputs.length > 0) {
  throw new Error(`Whole-site preload manifest is missing: ${missingInputs.join(', ')}`)
}

if (!registrySource.includes('lazyChapterLoaders') || !registrySource.includes('preloadLazyChapters')) {
  throw new Error('Lazy chapter loaders must be reusable by the preload manifest.')
}

console.log('[loader-preload-guards] Loader progress is tied to the whole-site preload manifest.')
