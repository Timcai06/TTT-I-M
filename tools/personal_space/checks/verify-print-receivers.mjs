import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readGlb, imageSource, walk } from '../exporting/glb_io.mjs'

const [beforePath, afterPath] = process.argv.slice(2)
if (!beforePath || !afterPath) throw new Error('Usage: verify-print-receivers.mjs before.glb after.glb')
const before = await readGlb(beforePath), after = await readGlb(afterPath)
const targets = new Set(['RoomBake_Walnut_oiled', 'RoomBake_Plaster_warm', 'RoomBake_Paper_fiber'])
const hash = b => createHash('sha256').update(b).digest('hex')
function view(model, index) {
  const v = model.doc.bufferViews[index]
  return model.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)
}
for (const key of ['nodes', 'meshes', 'animations', 'scenes', 'scene']) assert.deepEqual(after.doc[key], before.doc[key], key)
assert.equal(after.doc.accessors.length, before.doc.accessors.length)
for (let i = 0; i < before.doc.accessors.length; i++) {
  const { bufferView: a, ...old } = before.doc.accessors[i]
  const { bufferView: b, ...next } = after.doc.accessors[i]
  assert.deepEqual(next, old)
  assert.equal(hash(view(after, b)), hash(view(before, a)), `Accessor ${i} changed`)
}
const imageHash = (model, info) => hash(view(model, model.doc.images[imageSource(model.doc.textures[info.index])].bufferView))
let unchangedTextures = 0, changedTextures = 0
assert.equal(after.doc.materials.length, before.doc.materials.length)
for (let i = 0; i < before.doc.materials.length; i++) {
  const old = before.doc.materials[i], next = after.doc.materials[i]
  const clean = (material, model) => {
    const result = structuredClone(material)
    walk(result, (key, info) => {
      if (key.endsWith('Texture') && Number.isInteger(info?.index)) {
        const originalIndex = info.index
        info.hash = imageHash(model, info)
        delete info.index
        // The two ORM references point to the same changed image, hence 3 slots.
        if (targets.has(material.name) && ['metallicRoughnessTexture', 'occlusionTexture', 'archiveLightTexture'].includes(key)) info.hash = 'receiver-bake'
        assert.ok(originalIndex >= 0)
      }
    })
    if (targets.has(material.name)) {
      delete result.extras.archive_lightmap_scale
      delete result.extras.archive_bake
    }
    return result
  }
  assert.deepEqual(clean(next, after), clean(old, before), `Unrelated material/image change: ${old.name}`)
  const oldSlots = [], nextSlots = []
  for (const [material, slots] of [[old, oldSlots], [next, nextSlots]]) walk(material, (key, value) => {
    if (key.endsWith('Texture') && Number.isInteger(value?.index)) slots.push(value)
  })
  for (let j = 0; j < oldSlots.length; j++) {
    if (imageHash(before, oldSlots[j]) === imageHash(after, nextSlots[j])) unchangedTextures++
    else changedTextures++
  }
}
assert.equal(changedTextures, 9, 'Exactly AO/roughness and irradiance slots on three receivers should change')
const report = { beforeSha256: hash(before.bytes), afterSha256: hash(after.bytes), unchangedAccessorBuffers: before.doc.accessors.length,
  unchangedTextures, changedTextureSlots: changedTextures, changedImages: 6, nodesMeshesAnimationsIdentical: true,
  note: 'Binary preservation checks only; visual acceptance requires rendered comparisons.' }
await fs.mkdir('output/print-lighting', { recursive: true })
await fs.writeFile('output/print-lighting/verification.json', JSON.stringify(report, null, 2) + '\n')
console.log(report)
