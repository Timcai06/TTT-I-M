// Repeatable local pipeline. No browser or frontend visual checks are invoked.
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../../', import.meta.url)); process.chdir(root)
const work = 'output/material-optimization', baseline = `${work}/baseline`
await fs.mkdir(baseline, { recursive: true })
const modelPath = 'apps/landing/src/assets/personal-archive/personal-space.glb'
const sourcePath = 'art/personal-archive/source/tim-cai-personal-archive.blend'
const capturePath = 'art/personal-archive/textures/sunrise-bake/environment.json'
if (!existsSync(`${baseline}/personal-space.glb`)) {
  const bytes = execFileSync('git', ['show', `f53ea7638b77b4b7cd155fbfc0e87bc2afad7bc3:${modelPath}`], { maxBuffer: 64 * 1048576 })
  await fs.writeFile(`${baseline}/personal-space.glb`, bytes)
}
const original = await fs.readFile(`${baseline}/personal-space.glb`)
await fs.writeFile(`${baseline}/model.json`, original.subarray(20, 20 + original.readUInt32LE(12)))
if (!existsSync(`${baseline}/source.blend`)) await fs.copyFile(sourcePath, `${baseline}/source.blend`)
if (!existsSync(`${work}/environment.json`)) {
  if (!existsSync(capturePath)) throw new Error(`Missing captured runtime illumination: ${capturePath}`)
  await fs.copyFile(capturePath, `${work}/environment.json`)
}
const blender = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender'
function run(binary, args) { execFileSync(binary, args, { stdio: 'inherit', env: process.env }) }
const node = script => run(process.execPath, [script])
const bake = script => run(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', script])
const scripts = 'tools/personal_space/exporting'
// Stage one must prove a compressed asset exists before the scene bake adds data.
run(process.execPath, [`${scripts}/compress_materials.mjs`, `${baseline}/personal-space.glb`, `${work}/compressed.glb`])
bake(`${scripts}/calibrate_bake_lights.py`)
bake(`${scripts}/bake_sunrise.py`)
bake(`${scripts}/prepare_bake_outputs.py`)
node(`${scripts}/assemble_baked_scene.mjs`)
run(process.execPath, [`${scripts}/compress_materials.mjs`, `${work}/baked-uncompressed.glb`, `${work}/final-quality.glb`])
// Movable prints must not leave their closed/resting pose in static receivers.
bake(`${scripts}/bake_print_receivers.py`)
run(process.execPath, [`${scripts}/assemble_print_receivers.mjs`, `${work}/final-quality.glb`, 'output/print-lighting/receivers-uncompressed.glb'])
run(process.execPath, [`${scripts}/compress_materials.mjs`, 'output/print-lighting/receivers-uncompressed.glb', 'output/print-lighting/final.glb'])
run(process.execPath, ['tools/personal_space/checks/verify-print-receivers.mjs', `${work}/final-quality.glb`, 'output/print-lighting/final.glb'])
await fs.copyFile('output/print-lighting/final.glb', `${work}/final-quality.glb`)
run(process.execPath, ['tools/personal_space/checks/verify-material-optimization.mjs', `${work}/final-quality.glb`])
bake(`${scripts}/update_source_prop_materials.py`)
bake('tools/personal_space/checks/verify-source-materials.py')
node(`${scripts}/finalize_material_delivery.mjs`)
run(process.execPath, ['--test', 'apps/landing/tests/archiveBindingContract.test.ts', 'apps/landing/tests/archiveAnimationRig.test.ts', 'apps/landing/tests/archivePhotoTransfer.test.ts'])
run('npm', ['run', 'build:landing'])
run(process.execPath, ['tools/personal_space/checks/verify-model.mjs', '--production'])
run('npm', ['run', 'test:guards', '--workspace', '@timcai/landing'])
console.log('Sunrise material delivery complete; visual acceptance remains with tim.')
