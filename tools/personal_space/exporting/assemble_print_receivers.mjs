// Texture-only correction: retain the shipping node, mesh, UV and animation data.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { readGlb, writeGlb, imageSource } from './glb_io.mjs'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('Usage: assemble_print_receivers.mjs input.glb output.glb')
const { doc, bin } = await readGlb(input)
const source = await readGlb('output/material-optimization/baked-uncompressed.glb')
const report = JSON.parse(await fs.readFile('output/print-lighting/receivers.json'))
const replacements = new Map()
function bytes(glb, texture) {
  const image = glb.doc.images[imageSource(glb.doc.textures[texture.index])]
  const view = glb.doc.bufferViews[image.bufferView]
  return glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
}
function addTexture(name, png, previous) {
  const view = doc.bufferViews.length
  doc.bufferViews.push({ buffer: 0, byteLength: png.length })
  replacements.set(view, png)
  const image = doc.images.length
  doc.images.push({ name, bufferView: view, mimeType: 'image/png' })
  const index = doc.textures.length
  doc.textures.push({ sampler: doc.textures[previous.index].sampler, source: image })
  return { ...previous, index }
}
for (const record of Object.values(report.materials)) {
  const material = doc.materials.find(m => m.name === record.name)
  const original = source.doc.materials.find(m => m.name === record.name)
  assert.ok(material && original, record.name)
  const pbr = material.pbrMetallicRoughness
  const { data, info } = await sharp(bytes(source, original.pbrMetallicRoughness.metallicRoughnessTexture)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.equal(info.channels, 3)
  const ao = await sharp(record.ao.png).resize(info.width, info.height).extractChannel(0).raw().toBuffer()
  // Preserve the authored roughness/metal channels; replace only the baked AO.
  for (let i = 0; i < ao.length; i++) data[i * 3] = ao[i]
  const orm = await sharp(data, { raw: info }).png().toBuffer()
  const texture = addTexture(record.name + '-PrintReceiver-ORM', orm, pbr.metallicRoughnessTexture)
  pbr.metallicRoughnessTexture = texture
  material.occlusionTexture = { ...material.occlusionTexture, index: texture.index }
  material.extras.archiveLightTexture = addTexture(record.name + '-PrintReceiver-IndirectRGB', await fs.readFile(record.indirect.png), material.extras.archiveLightTexture)
  material.extras.archive_lightmap_scale = record.indirect.scale * Math.PI
  material.extras.archive_bake = 'sunrise-print-receivers-20260912'
}
await writeGlb(output, doc, bin, replacements)
console.log('Updated receiver AO and indirect RGB:', Object.values(report.materials).map(r => r.name))
