import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve('dist/assets')

if (!existsSync(distDir)) {
  throw new Error('dist/assets is missing. Run npm run build before chunk guards.')
}

const indexChunk = readdirSync(distDir).find((file) => /^index-.*\.js$/.test(file))

if (!indexChunk) {
  throw new Error('Could not find the built app entry chunk.')
}

const indexSource = readFileSync(resolve(distDir, indexChunk), 'utf8')
const forbidden = ['three-vendor', 'ParticlePortrait']
  .filter((needle) => indexSource.includes(needle))

if (forbidden.length > 0) {
  throw new Error(`Entry chunk ${indexChunk} still references deferred WebGL assets: ${forbidden.join(', ')}`)
}

console.log(`[chunk-guards] ${indexChunk} does not directly reference deferred WebGL assets.`)
