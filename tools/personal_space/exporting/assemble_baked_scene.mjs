import fs from 'node:fs/promises'
import sharp from 'sharp'
import { readGlb, writeGlb, imageSource } from './glb_io.mjs'

const root = new URL('../../../', import.meta.url)
const { doc, bin } = await readGlb(new URL('output/material-optimization/baseline/personal-space.glb', root))
const manifest = JSON.parse(await fs.readFile(new URL('output/material-optimization/bake/portable.json', root)))
const changes = new Map(), seen = new Set()
function addView(bytes, target) {
  const index = doc.bufferViews.length; doc.bufferViews.push({ buffer: 0, byteLength: bytes.length, ...(target ? { target } : {}) }); changes.set(index, bytes); return index
}
function readAccessor(index) {
  const a = doc.accessors[index], v = doc.bufferViews[a.bufferView], width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
  const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType], stride = v.byteStride ?? width * bytes
  const data = Buffer.alloc(a.count * width * bytes), start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0)
  for (let i = 0; i < a.count; i++) bin.copy(data, i * width * bytes, start + i * stride, start + i * stride + width * bytes)
  return { data, width, bytes, definition: a }
}
function addAccessor(data, type, componentType, count, previous = {}, target = 34962) {
  const index = doc.accessors.length
  doc.accessors.push({ ...previous, bufferView: addView(data, target), byteOffset: 0, type, componentType, count })
  return index
}
for (const spec of manifest.uv) {
  const key = `${spec.mesh}:${spec.primitive}`; if (seen.has(key)) throw new Error('Instanced UVs need explicit handling: ' + key); seen.add(key)
  const p = doc.meshes[spec.mesh].primitives[spec.primitive]
  const { uv, vertices, detail } = JSON.parse(await fs.readFile(new URL(spec.json, root)))
  const count = doc.accessors[p.attributes.POSITION].count
  const keys = new Map(), oldVertices = Array.from({ length: count }, (_, i) => i)
  const atlas = Array.from({ length: count }, () => [0, 0]), indices = [], assigned = new Set()
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i], key = `${vertex}:${uv[i][0].toFixed(7)}:${uv[i][1].toFixed(7)}`
    if (!keys.has(key)) {
      const index = assigned.has(vertex) ? oldVertices.length : vertex
      keys.set(key, index); assigned.add(vertex); oldVertices[index] = vertex; atlas[index] = uv[i]
    }
    indices.push(keys.get(key))
  }
  // Closed photo sheets are animated as corresponding front/back grids. Atlas
  // seams duplicate vertices, so pair every duplicate with its opposite layer.
  // Padding vertices are unreferenced; all original triangle corners stay exact.
  if (/^PhotoMount_/.test(doc.meshes[spec.mesh].name)) {
    if (count % 2) throw new Error('Photo sheet must have two equal layers')
    const half = count / 2, buckets = Array.from({ length: count }, () => [])
    oldVertices.forEach((v, i) => buckets[v].push(i))
    const front = [], back = []
    for (let v = 0; v < half; v++) {
      const a = buckets[v], b = buckets[v + half], copies = Math.max(a.length, b.length)
      for (let k = 0; k < copies; k++) { front.push(a[k] ?? a[0]); back.push(b[k] ?? b[0]) }
    }
    const order = [...front, ...back], remap = new Map()
    order.forEach((old, i) => { if (!remap.has(old)) remap.set(old, i) })
    const reorderedVertices = order.map(i => oldVertices[i]), reorderedAtlas = order.map(i => atlas[i])
    oldVertices.splice(0, oldVertices.length, ...reorderedVertices)
    atlas.splice(0, atlas.length, ...reorderedAtlas)
    indices.forEach((v, i) => { indices[i] = remap.get(v) })
  }
  for (const [name, index] of Object.entries(p.attributes)) {
    if (name === 'TEXCOORD_2' || (detail && (name === 'TEXCOORD_1' || name === 'TANGENT'))) { delete p.attributes[name]; continue }
    const { data, width, bytes, definition } = readAccessor(index), stride = width * bytes, out = Buffer.alloc(oldVertices.length * stride)
    oldVertices.forEach((v, i) => data.copy(out, i * stride, v * stride, (v + 1) * stride))
    p.attributes[name] = addAccessor(out, definition.type, definition.componentType, oldVertices.length, definition)
  }
  p.attributes.TEXCOORD_2 = addAccessor(Buffer.from(new Float32Array(atlas.flat()).buffer), 'VEC2', 5126, oldVertices.length)
  if (detail) p.attributes.TEXCOORD_1 = addAccessor(Buffer.from(new Float32Array(oldVertices.flatMap(v => detail[v])).buffer), 'VEC2', 5126, oldVertices.length)
  const indexData = oldVertices.length <= 65536 ? new Uint16Array(indices) : new Uint32Array(indices)
  p.indices = addAccessor(Buffer.from(indexData.buffer), 'SCALAR', indexData.BYTES_PER_ELEMENT === 2 ? 5123 : 5125, indices.length, {}, 34963)
}
function addTexture(name, bytes) {
  const source = doc.images.length; doc.images.push({ name, bufferView: addView(bytes), mimeType: 'image/png' })
  const index = doc.textures.length; doc.textures.push({ source }); return index
}
const originalImage = info => { const image = doc.images[imageSource(doc.textures[info.index])], v = doc.bufferViews[image.bufferView]; return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength) }
for (const [mi, record] of Object.entries(manifest.materials)) {
  const m = doc.materials[mi], p = m.pbrMetallicRoughness ??= {}, old = p.metallicRoughnessTexture
  let roughBytes, width, height, roughChannel = 0, metal = null
  if (record.prop) roughBytes = await fs.readFile(new URL(record.prop.roughness, root))
  else if (old) { roughBytes = originalImage(old); roughChannel = 1; metal = roughBytes }
  else roughBytes = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer()
  ;({ width, height } = await sharp(roughBytes).metadata())
  const ao = await sharp(await fs.readFile(new URL(record.ao.png, root))).resize(width, height).extractChannel(0).raw().toBuffer()
  const rough = await sharp(roughBytes).extractChannel(roughChannel).raw().toBuffer()
  const metallic = metal ? await sharp(metal).extractChannel(2).raw().toBuffer() : Buffer.alloc(width * height, 255)
  const orm = Buffer.alloc(width * height * 3)
  for (let i = 0; i < ao.length; i++) { orm[3*i] = ao[i]; orm[3*i+1] = rough[i]; orm[3*i+2] = metallic[i] }
  const index = addTexture(m.name + '-ORM', await sharp(orm, { raw: { width, height, channels: 3 } }).png().toBuffer())
  p.metallicRoughnessTexture = { ...(old ?? {}), index, ...(record.prop ? { texCoord: 1 } : {}) }
  if (record.prop) p.roughnessFactor = 1
  m.occlusionTexture = { index, texCoord: 2 }
  const lightIndex = addTexture(m.name + '-IndirectRGB', await fs.readFile(new URL(record.indirect.png, root)))
  m.extras = { ...m.extras, archive_lightmap: true, archive_lightmap_version: 2,
    archive_lightmap_scale: record.indirect.scale * Math.PI,
    archiveLightTexture: { index: lightIndex, texCoord: 2 },
    archive_bake: 'sunrise-20260911', archive_bake_slot: m.name.startsWith('RoomBake_') ? m.name : 'RoomBake_' + m.name }
  if (record.prop) {
    m.normalTexture = { index: addTexture(m.name + '-VeinOrFibreNormal', await fs.readFile(new URL(record.prop.normal, root))), texCoord: 1 }
    m.extras.archive_prop_surface = true
  }
}
// Legacy indirect slots on deliberately excluded screens/graphics are removed.
for (const mi of Object.keys(manifest.excluded)) {
  const m = doc.materials[mi]
  if (m.extras?.archive_lightmap) { delete m.occlusionTexture; delete m.extras.archive_lightmap }
}
const bytes = await writeGlb(new URL('output/material-optimization/baked-uncompressed.glb', root), doc, bin, changes)
console.log(JSON.stringify({ bytes, bakedMaterials: Object.keys(manifest.materials).length, propMaterials: Object.values(manifest.materials).filter(m => m.prop).length }))
