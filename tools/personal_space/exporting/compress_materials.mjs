// Texture-only first stage. TOKTX points to the pinned Khronos 4.4.2 binary.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { readGlb, writeGlb, imageSource, walk } from './glb_io.mjs'

const input = process.argv[2], output = process.argv[3]
if (!input || !output) throw new Error('Usage: compress_materials.mjs input.glb output.glb')
const cache = path.resolve('output/material-optimization/ktx-cache')
await fs.mkdir(cache, { recursive: true })
const { doc, bin, bytes } = await readGlb(input), replacements = new Map()
const imageBytes = i => { const v = doc.bufferViews[doc.images[i].bufferView]; return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength) }
function appendImage(name, data, mimeType) {
  const view = doc.bufferViews.length; doc.bufferViews.push({ buffer: 0, byteLength: data.length }); replacements.set(view, data)
  const source = doc.images.length; doc.images.push({ name, bufferView: view, mimeType }); return source
}
// Separate RGB irradiance from occlusion before packing ORM.
for (const m of doc.materials) if (m.extras?.archive_lightmap && m.occlusionTexture && !m.extras.archiveLightTexture) {
  m.extras.archiveLightTexture = { ...m.occlusionTexture }; m.extras.archive_lightmap_version = 2
  delete m.occlusionTexture
}
// Existing roughness images already carry glTF's G channel. Supply neutral AO in
// R until the scene-space bake is complete; preserve metallic factors and B data.
const packed = new Map()
for (const m of doc.materials) {
  const p = m.pbrMetallicRoughness, info = p?.metallicRoughnessTexture
  if (!info || m.occlusionTexture || m.extras?.archive_dynamic_surface) continue
  const source = imageSource(doc.textures[info.index])
  if (!packed.has(source)) {
    const { data, info: size } = await sharp(imageBytes(source)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let i = 0; i < data.length; i += size.channels) data[i] = 255
    const png = await sharp(data, { raw: size }).png().toBuffer()
    const index = doc.textures.length
    doc.textures.push({ ...doc.textures[info.index], source: appendImage(doc.images[source].name + '-ORM', png, 'image/png'), extensions: undefined })
    packed.set(source, index)
  }
  p.metallicRoughnessTexture = { ...info, index: packed.get(source) }
  m.occlusionTexture = { ...p.metallicRoughnessTexture }
}
const dataImages = new Set(), normalImages = new Set()
walk(doc.materials, (key, value) => {
  if (!key.endsWith('Texture') || !Number.isInteger(value?.index) || key === 'baseColorTexture' || key === 'emissiveTexture') return
  const i = imageSource(doc.textures[value.index]); dataImages.add(i); if (key === 'normalTexture') normalImages.add(i)
})
const report = []
for (const i of dataImages) {
  if (doc.images[i].mimeType === 'image/ktx2') continue
  const src = replacements.get(doc.images[i].bufferView) ?? imageBytes(i)
  // Art-first delivery: highest UASTC quality, with no rate-distortion pass.
  const rdo = []
  const hash = createHash('sha256').update(src).update('uastc4-zstd18-mips-linear-v2' + rdo.join('-')).digest('hex')
  const png = path.join(cache, hash + '.png'), ktx = path.join(cache, hash + '.ktx2')
  await fs.writeFile(png, src)
  try { await fs.access(ktx) } catch {
    execFileSync(process.env.TOKTX ?? 'toktx', ['--t2', '--encode', 'uastc', '--uastc_quality', '4', ...rdo, '--zcmp', '18', '--genmipmap', '--assign_oetf', 'linear', '--assign_primaries', 'bt709', '--threads', '8', ktx, png], { stdio: 'pipe' })
  }
  const encoded = await fs.readFile(ktx)
  replacements.set(doc.images[i].bufferView, encoded); doc.images[i].mimeType = 'image/ktx2'
  for (const t of doc.textures) if (imageSource(t) === i) {
    delete t.source; t.extensions = { ...t.extensions, KHR_texture_basisu: { source: i } }; delete t.extensions.EXT_texture_webp
  }
  report.push({ name: doc.images[i].name, normal: normalImages.has(i), before: src.length, after: encoded.length })
  console.log('KTX2', doc.images[i].name, src.length, '->', encoded.length)
}
doc.extensionsUsed = [...new Set([...(doc.extensionsUsed ?? []), 'KHR_texture_basisu'])]
doc.extensionsRequired = [...new Set([...(doc.extensionsRequired ?? []), 'KHR_texture_basisu'])]
const after = await writeGlb(output, doc, bin, replacements)
await fs.writeFile(output + '.compression.json', JSON.stringify({ before: bytes.length, after, images: report }, null, 2) + '\n')
console.log(JSON.stringify({ before: bytes.length, after, savedMiB: (bytes.length - after) / 1048576 }))
