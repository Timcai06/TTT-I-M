// Preserve website photo bytes and split movable paper from static transport.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { readGlb, writeGlb, imageSource } from './glb_io.mjs'

const root = new URL('../../../', import.meta.url)
const work = new URL('output/web-refinement/', root)
const { doc, bin } = await readGlb(new URL('source-export.glb', work))
const baseline = await readGlb(new URL('baseline/original.glb', work))
const changes = new Map(), restored = [], dynamic = []
const appendView = bytes => {
  const i = doc.bufferViews.length
  doc.bufferViews.push({ buffer: 0, byteLength: bytes.length }); changes.set(i, bytes)
  return i
}
const importedTextures = new Map()
function preserveTexture(info) {
  if (!importedTextures.has(info.index)) {
    const oldTexture = baseline.doc.textures[info.index], oldImage = baseline.doc.images[imageSource(oldTexture)]
    const view = baseline.doc.bufferViews[oldImage.bufferView]
    const bytes = baseline.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
    const source = doc.images.length
    doc.images.push({ ...oldImage, bufferView: appendView(bytes) })
    const texture = structuredClone(oldTexture)
    if (texture.source !== undefined) texture.source = source
    for (const extension of ['EXT_texture_webp', 'KHR_texture_basisu']) if (texture.extensions?.[extension]) texture.extensions[extension].source = source
    if (texture.sampler !== undefined) {
      doc.samplers ??= []; texture.sampler = doc.samplers.push(structuredClone(baseline.doc.samplers[texture.sampler])) - 1
    }
    importedTextures.set(info.index, doc.textures.push(texture) - 1)
  }
  return { ...info, index: importedTextures.get(info.index) }
}
const authoredPhotos = new Map()
for (const name of ['LifeMemoryPhoto','ArchivePhoto_01','ArchivePhoto_02','ArchivePhoto_03','ArchivePhoto_04','StackPhotoViewerSurface','StackScreenSurface']) {
  const current = doc.nodes.find(n => n.name === name), old = baseline.doc.nodes.find(n => n.name === name)
  assert.ok(current && old, name)
  const material = doc.materials[doc.meshes[current.mesh].primitives[0].material]
  authoredPhotos.set(material, baseline.doc.materials[baseline.doc.meshes[old.mesh].primitives[0].material])
}
for (const m of doc.materials) {
  // PBR source graphs are unchanged for these legacy materials. Preserve the
  // previously delivered photographic files exactly, including the football.
  const old = authoredPhotos.get(m) ?? baseline.doc.materials.find(b => b.name === m.name || b.name === 'RoomBake_' + m.name)
  if (old && !m.name.startsWith('WebRefine /')) {
    for (const slot of ['baseColorTexture', 'emissiveTexture']) {
      const info = slot === 'baseColorTexture' ? old.pbrMetallicRoughness?.[slot] : old[slot]
      if (!info) continue
      const target = slot === 'baseColorTexture' ? (m.pbrMetallicRoughness ??= {}) : m
      target[slot] = preserveTexture(info)
      restored.push(m.name + ':' + slot)
    }
  }
  delete m.occlusionTexture
  for (const key of Object.keys(m.extras ?? {})) if (/^archive_(lightmap|bake)|^archiveLightTexture$/.test(key)) delete m.extras[key]
  if (m.extensions) delete m.extensions.KHR_materials_anisotropy
}
const parents = new Map()
doc.nodes.forEach((n, i) => n.children?.forEach(c => parents.set(c, i)))
const movingName = name => /^(Notebook|About_|ArchivePhoto_|PhotoMount_|LifeMemoryPhoto$|Life_PhotoPaper$|LifeEnvelopeFlap$)/.test(name)
const movingNode = i => movingName(doc.nodes[i].name) || (parents.has(i) && movingNode(parents.get(i)))
const clones = new Map()
for (const [i, n] of doc.nodes.entries()) {
  if (n.mesh === undefined || !movingNode(i)) continue
  const mesh = structuredClone(doc.meshes[n.mesh]); n.mesh = doc.meshes.push(mesh) - 1
  for (const p of mesh.primitives) {
    if (!clones.has(p.material)) {
      const m = structuredClone(doc.materials[p.material])
      m.name += ' / realtime'; m.extras = { ...m.extras, archive_dynamic_surface: true }
      clones.set(p.material, doc.materials.push(m) - 1)
    }
    p.material = clones.get(p.material)
  }
  dynamic.push(n.name)
}
// Only the newly baked color atlases are encoded here. All original photographs
// above retain their exact bytes, and data maps are handled by the KTX stage.
for (const m of doc.materials.filter(m => m.name.startsWith('WebRefine /'))) {
  const info = m.pbrMetallicRoughness?.baseColorTexture
  if (!info) continue
  const image = doc.images[imageSource(doc.textures[info.index])]
  if (changes.has(image.bufferView)) continue
  const view = doc.bufferViews[image.bufferView]
  const bytes = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
  const encoded = await sharp(bytes).removeAlpha().jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toBuffer()
  if (encoded.length < bytes.length) { changes.set(image.bufferView, encoded); image.mimeType = 'image/jpeg' }
}
doc.extensionsUsed = [...new Set([...(doc.extensionsUsed ?? []), ...(baseline.doc.extensionsUsed ?? []).filter(e => e === 'EXT_texture_webp')])].filter(e => e !== 'KHR_materials_anisotropy')
doc.extensionsRequired = (doc.extensionsRequired ?? []).filter(e => e !== 'KHR_materials_anisotropy')
assert.ok(dynamic.includes('LifeMemoryPhoto') && dynamic.includes('PhotoMount_04'))
await writeGlb(new URL('baseline/personal-space.glb', work), doc, bin, changes)
const prepared = await readGlb(new URL('baseline/personal-space.glb', work))
await fs.writeFile(new URL('baseline/model.json', work), JSON.stringify(prepared.doc))
await fs.copyFile(new URL('art/personal-archive/textures/sunrise-bake/environment.json', root), new URL('environment.json', work))
await fs.writeFile(new URL('prepared.json', work), JSON.stringify({ restored, dynamic, nodes: doc.nodes.length, meshes: doc.meshes.length }, null, 2))
console.log(JSON.stringify({ restored: restored.length, movingSurfaces: dynamic.length, nodes: doc.nodes.length }))
