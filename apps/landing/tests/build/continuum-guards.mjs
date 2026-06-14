import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

const app = read('src/App.tsx')

if (!exists('src/lib/continuum/ParticleContinuum.tsx')) {
  throw new Error('M0 requires src/lib/continuum/ParticleContinuum.tsx')
}

if (!/import\s+ParticleContinuum\s+from\s+['"]\.\/lib\/continuum\/ParticleContinuum['"]/.test(app)) {
  throw new Error('App must import the App-level ParticleContinuum')
}

if (!/<ParticleContinuum\s*\/>/.test(app)) {
  throw new Error('App must render <ParticleContinuum /> outside lazy chapters')
}

const continuum = read('src/lib/continuum/ParticleContinuum.tsx')
const requiredPatterns = [
  [/from ['"]@react-three\/fiber['"]/, 'ParticleContinuum must use the existing R3F stack'],
  [/shouldMountContinuum\(/, 'ParticleContinuum must honor reduced-motion/WebGL2 mount gating'],
  [/createContinuumSimulation\(/, 'ParticleContinuum must run through the GPGPU simulation core'],
  [/buildContinuumPoints\(/, 'ParticleContinuum must render through the shared point renderer'],
  [/className=['"]particle-continuum['"]/, 'ParticleContinuum root must expose the fixed-layer CSS class'],
]

for (const [pattern, message] of requiredPatterns) {
  if (!pattern.test(continuum)) throw new Error(message)
}

console.log('[continuum-guards] Particle Continuum M0 mount contract OK')
