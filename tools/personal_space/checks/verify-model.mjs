import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const modelPath = path.join(root, 'apps/landing/src/assets/personal-archive/personal-space.glb')
const bytes = readFileSync(modelPath)
assert.equal(bytes.toString('utf8', 0, 4), 'glTF')
assert.equal(bytes.readUInt32LE(4), 2)
assert.equal(bytes.readUInt32LE(8), bytes.length)
const model = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
const hinge = model.nodes.findIndex((node) => node.name === 'NotebookHinge')
const cover = model.nodes.findIndex((node) => node.name === 'NotebookCover')
assert.ok(hinge >= 0 && cover >= 0, 'Notebook pivot and cover must remain addressable')
assert.ok(model.nodes[hinge].children.includes(cover), 'Cover must rotate around its spine')
assert.ok(model.nodes.some(node => node.name === 'NotebookReadingSurface'), 'Reading surface missing')
assert.ok(model.nodes.some(node => node.name === 'LifeMemoryPhoto'), 'Life photograph missing')
for (const name of ['LifeEnvelopeOpen', 'LifePhotoExtract']) {
  assert.ok(model.animations.some(clip => clip.name === name), `${name}: animation missing`)
}
const animation = model.animations.find((clip) => clip.name === 'NotebookOpen')
assert.ok(animation?.channels.some((channel) => channel.target.node === hinge && channel.target.path === 'rotation'))
assert.ok(model.images.length >= 4, 'Real portfolio photographs must survive export')
assert.ok(model.images.every((image) => Number.isInteger(image.bufferView)), 'GLB must package its textures')
const refined = model.materials.some((material) => material.name === 'Walnut_oiled')
if (refined) {
  for (const name of ['Walnut_oiled', 'Plaster_warm', 'Linen_natural', 'Paper_fiber', 'Rug_archive', 'Ceramic_speckle']) {
    const material = model.materials.find((item) => item.name === name)
    assert.ok(material?.pbrMetallicRoughness?.baseColorTexture, `${name}: color map missing`)
    assert.ok(material?.normalTexture, `${name}: normal map missing`)
    const image = model.images[model.textures[material.pbrMetallicRoughness.baseColorTexture.index].source]
    const view = model.bufferViews[image.bufferView]
    const png = bytes.subarray(28 + bytes.readUInt32LE(12) + (view.byteOffset ?? 0))
    assert.equal(png.readUInt32BE(16), name === 'Walnut_oiled' ? 1024 : 512, `${name}: texture resolution regressed`)

    assert.ok(material?.pbrMetallicRoughness?.metallicRoughnessTexture, `${name}: roughness map missing`)
  }
  assert.ok(model.meshes.length <= 150, 'Static batching regressed')
}
assert.ok(bytes.length < (refined ? 14 : 4) * 1024 * 1024, 'Shared model exceeds its explicit 14 MiB texture budget')

if (process.argv.includes('--production')) {
  const assets = path.join(root, 'apps/landing/dist/assets')
  const exportedModels = readdirSync(assets).filter((file) => /^personal-space-.*\.glb$/.test(file))
  assert.equal(exportedModels.length, 1, 'Landing must emit exactly one shared archive GLB')
  assert.deepEqual(readFileSync(path.join(assets, exportedModels[0])), bytes, 'Production GLB must match the current source')
  for (const file of readdirSync(assets)) {
    assert.ok(!/SpaceScene|PersonalSpaceLab/i.test(file), `Development interface leaked: ${file}`)
    if (file.endsWith('.js')) assert.ok(!readFileSync(path.join(assets, file), 'utf8').includes('空间灰模 · STUDY'), `Development interface leaked: ${file}`)
  }
}
console.log(`Personal-space contract passed: ${(bytes.length / 1024 / 1024).toFixed(2)} MiB, animated spine, embedded photos${process.argv.includes('--production') ? ', shared production asset with no lab interface' : ''}.`)
