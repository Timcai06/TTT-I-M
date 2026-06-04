import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

const requiredHeroPreloads = ['three-vendor']
  .filter((needle) => !htmlSource.includes(needle))
if (requiredHeroPreloads.length > 0) {
  throw new Error(`Hero WebGL assets are not preloaded from index.html: ${requiredHeroPreloads.join(', ')}`)
}

if (!indexSource.includes('ParticlePortrait')) {
  throw new Error(`Entry chunk ${indexChunk} does not contain the eager Hero particle layer.`)
}

const deferredAboutAssets = ['TextParticles']
  .filter((needle) => htmlSource.includes(needle))
if (deferredAboutAssets.length > 0) {
  throw new Error(`Non-hero WebGL assets should remain deferred: ${deferredAboutAssets.join(', ')}`)
}

if (indexSource.includes('TextParticles')) {
  throw new Error(`Entry chunk ${indexChunk} still references deferred About WebGL assets.`)
}

console.log(`[chunk-guards] ${indexChunk} preloads Hero WebGL while deferring About WebGL.`)
