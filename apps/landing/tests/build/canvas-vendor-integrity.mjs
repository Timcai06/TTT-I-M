import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const vendorRoot = 'src/lib/canvas-ui/vendor'
const manifest = JSON.parse(readFileSync(`${vendorRoot}/integrity.json`, 'utf8'))

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.name.endsWith('.ts') ? [relative(vendorRoot, path)] : []
  })
}

const actualFiles = sourceFiles(vendorRoot).sort()
const declaredFiles = Object.keys(manifest.files).sort()
if (JSON.stringify(actualFiles) !== JSON.stringify(declaredFiles)) {
  throw new Error(`Canvas UI vendor inventory drifted.\nactual: ${actualFiles.join(', ')}\ndeclared: ${declaredFiles.join(', ')}`)
}

for (const [file, definition] of Object.entries(manifest.files)) {
  if (!/^[a-f\d]{64}$/.test(definition.sha256)) throw new Error(`Invalid SHA-256 declaration for ${file}.`)
  if (definition.revision !== 'local-adapter' && !/^[a-f\d]{40}$/.test(definition.revision)) {
    throw new Error(`Canvas UI ${file} must name an exact upstream commit.`)
  }
  const digest = createHash('sha256').update(readFileSync(join(vendorRoot, file))).digest('hex')
  if (digest !== definition.sha256) {
    throw new Error(`${file} changed without an explicit vendor integrity review. Expected ${definition.sha256}, received ${digest}.`)
  }
}

const gpuEngines = [
  'Bend/BendVanilla.ts',
  'DecryptReveal/DecryptRevealVanilla.ts',
  'Glass/GlassVanilla.ts',
  'Laser/LaserVanilla.ts',
  'Liquid/LiquidVanilla.ts',
  'ParticleScroll/ParticleScrollVanilla.ts',
]
for (const file of gpuEngines) {
  const source = readFileSync(join(vendorRoot, file), 'utf8')
  for (const token of ['compileWebGLShader', 'linkWebGLProgram', 'requireWebGLResource']) {
    if (!source.includes(token)) throw new Error(`${file} bypasses the fail-closed WebGL program boundary (${token}).`)
  }
}

const liquidSource = readFileSync(join(vendorRoot, 'Liquid/LiquidVanilla.ts'), 'utf8')
if (!liquidSource.includes('assertFramebufferComplete')) {
  throw new Error('Liquid render targets must fail closed when a half-float framebuffer is incomplete.')
}

console.log(`[canvas-vendor-integrity] ${declaredFiles.length} pinned Canvas UI files match their reviewed digests.`)
