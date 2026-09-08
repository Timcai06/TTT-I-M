import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

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
for (const name of ['Walnut_oiled', 'Plaster_warm', 'Linen_natural', 'Paper_fiber', 'Ceramic_speckle', 'Warm oatmeal upholstery', 'Warm muted clay wool']) {
  const material = model.materials.find(item => item.name === `RoomBake_${name}`)
  assert.ok(material?.pbrMetallicRoughness?.baseColorTexture, `${name}: color map missing`)
  assert.ok(material?.normalTexture, `${name}: normal map missing`)
  assert.ok(material?.pbrMetallicRoughness?.metallicRoughnessTexture, `${name}: roughness map missing`)
  const texture = model.textures[material.pbrMetallicRoughness.baseColorTexture.index]
  const image = model.images[texture.source]
  const view = model.bufferViews[image.bufferView]
  const offset = 28 + bytes.readUInt32LE(12) + (view.byteOffset ?? 0)
  const metadata = await sharp(bytes.subarray(offset, offset + view.byteLength)).metadata()
  assert.equal(metadata.width, name === 'Walnut_oiled' ? 2048 : 1024, `${name}: texture resolution regressed`)
}
const room = model.meshes.find(mesh => mesh.name === 'ArchiveArchitecture' || mesh.primitives.some(p => model.materials[p.material]?.extras?.archive_lightmap))
assert.ok(room, 'Baked room geometry missing')
const originalLight = await sharp(path.join(root, 'art/personal-archive/textures/web-cinema/static-indirect.png')).removeAlpha().raw().toBuffer()
const checkedImages = new Set()
for (const primitive of room.primitives) {
  const material = model.materials[primitive.material]
  if (!material.extras?.archive_lightmap) continue
  const slot = material.occlusionTexture
  assert.ok(primitive.attributes[`TEXCOORD_${slot.texCoord ?? 0}`] !== undefined, 'Lightmap atlas coordinates missing')
  const image = model.images[model.textures[slot.index].source]
  const packed = material.pbrMetallicRoughness?.metallicRoughnessTexture
  if (packed) assert.notEqual(model.textures[packed.index].source, model.textures[slot.index].source, 'RGB light must not overwrite packed roughness')
  if (checkedImages.has(image.bufferView)) continue
  const view = model.bufferViews[image.bufferView], offset = 28 + bytes.readUInt32LE(12) + (view.byteOffset ?? 0)
  assert.equal(image.mimeType, 'image/png', 'Irradiance must stay lossless')
  assert.deepEqual(await sharp(bytes.subarray(offset, offset + view.byteLength)).removeAlpha().raw().toBuffer(), originalLight, 'RGB indirect light was corrupted during export')
  checkedImages.add(image.bufferView)
}
assert.ok(checkedImages.size > 0, 'No irradiance image checked')
assert.ok(model.meshes.length <= 100, 'Static batching regressed')
assert.ok(bytes.length < 20 * 1024 * 1024, 'Shared model exceeds its explicit 20 MiB texture budget')
const contract = JSON.parse(readFileSync(path.join(root, 'apps/landing/src/assets/personal-archive/scene-contract.json'), 'utf8'))
for (const name of Object.values(contract.surfaces).flat().concat(contract.monitorStates)) {
  assert.ok(model.nodes.some(node => node.name === name), `${name}: web handoff anchor missing`)
}
for (const name of ['WorkDrawerOpen', 'WorkFolderLift']) assert.ok(model.animations.some(clip => clip.name === name), `${name}: animation missing`)

// Hidden Blender states must retain their transforms, not export at world origin.
for (const node of model.nodes.filter(node => /^(StackPhotoViewerSurface|MonitorPhoto_|Batch_MonitorState_photo_)/.test(node.name))) {
  assert.ok(node.translation?.[1] > 1 && node.translation?.[1] < 1.5, `${node.name}: photo UI is not on the monitor`)
  assert.ok(Math.abs(node.translation[2] + 1.155) < .003, `${node.name}: photo UI depth is wrong`)
}
const photo = model.nodes.find(node => node.name === 'StackPhotoViewerSurface')
assert.ok(Math.abs(photo.translation[0] - .54) < 1e-5)
assert.ok(Math.abs(photo.rotation[0] - Math.SQRT1_2) < 1e-5 && Math.abs(photo.rotation[3] - Math.SQRT1_2) < 1e-5, 'Photo plane must face out of the monitor')

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
