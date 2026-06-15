import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const shaderDir = path.join(root, 'src/lib/continuum/shaders')
const shaderFiles = fs.readdirSync(shaderDir).filter((file) => /\.(glsl|vert|frag)$/.test(file))

if (shaderFiles.length === 0) {
  throw new Error('Continuum shader smoke guard found no shader files.')
}

for (const file of shaderFiles) {
  const source = fs.readFileSync(path.join(shaderDir, file), 'utf8')
  const opens = [...source.matchAll(/\{/g)].length
  const closes = [...source.matchAll(/\}/g)].length
  if (opens !== closes) throw new Error(`${file} has unbalanced braces.`)
  if (!/void\s+main\s*\(/.test(source) && !file.includes('lygia/')) {
    throw new Error(`${file} must expose a GLSL main() entrypoint.`)
  }
  if (/uTarget\b/.test(source)) {
    throw new Error(`${file} still references the old single-target uTarget uniform.`)
  }
}

const requiredUniforms = {
  'sim-position.glsl': ['uFromTarget', 'uToTarget', 'uMorph', 'uMorphSpread', 'uAnchorStrength'],
  'sim-velocity.glsl': ['uFromTarget', 'uToTarget', 'uMorph', 'uMorphSpread'],
  'render.vert': ['uFromTarget', 'uToTarget', 'uMorph', 'uMorphSpread'],
}
for (const [file, uniforms] of Object.entries(requiredUniforms)) {
  const source = read(`src/lib/continuum/shaders/${file}`)
  for (const uniform of uniforms) {
    if (!source.includes(uniform)) throw new Error(`${file} must include ${uniform}.`)
  }
}

const qualitySource = read('src/lib/continuum/continuumQuality.ts')
const highMatch = /high:\s*\{\s*particleTexSize:\s*(\d+)/.exec(qualitySource)
if (!highMatch) throw new Error('Could not read high particleTexSize from continuumQuality.ts')
const highTexSize = Number(highMatch[1])
const bytesPerFloatTexture = highTexSize * highTexSize * 4 * 4
const textureCount = 4 // position + velocity + fromTarget + toTarget
const totalBytes = bytesPerFloatTexture * textureCount
const budgetBytes = 6 * 1024 * 1024
if (totalBytes > budgetBytes) {
  throw new Error(`Continuum high-tier GPU textures use ${(totalBytes / 1024 / 1024).toFixed(1)} MiB, over 6 MiB budget.`)
}

console.log(`[continuum-gpu-guards] ${shaderFiles.length} shaders smoke-checked; high-tier texture budget ${(totalBytes / 1024 / 1024).toFixed(1)} MiB / 6.0 MiB.`)
