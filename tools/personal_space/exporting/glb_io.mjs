import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'

export async function readGlb(file) {
  const bytes = await fs.readFile(file), n = bytes.readUInt32LE(12)
  return { doc: JSON.parse(bytes.subarray(20, 20 + n)), bin: bytes.subarray(28 + n), bytes }
}

export function walk(value, callback) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) { callback(key, child, value); walk(child, callback) }
}

export const imageSource = texture => texture.extensions?.KHR_texture_basisu?.source ?? texture.extensions?.EXT_texture_webp?.source ?? texture.source

/** Rebuild only storage offsets; geometry, animation and node contracts are retained. */
export async function writeGlb(file, doc, bin, replacements = new Map()) {
  const accessorRefs = []
  const ref = (parent, key) => { if (Number.isInteger(parent[key])) accessorRefs.push([parent, key]) }
  for (const mesh of doc.meshes ?? []) for (const p of mesh.primitives) {
    ref(p, 'indices'); for (const key of Object.keys(p.attributes)) ref(p.attributes, key)
    for (const target of p.targets ?? []) for (const key of Object.keys(target)) ref(target, key)
  }
  for (const animation of doc.animations ?? []) for (const sampler of animation.samplers) { ref(sampler, 'input'); ref(sampler, 'output') }
  for (const skin of doc.skins ?? []) ref(skin, 'inverseBindMatrices')
  const usedAccessors = new Set(accessorRefs.map(([parent, key]) => parent[key])), accessorMap = new Map()
  doc.accessors = doc.accessors.filter((_, i) => { if (!usedAccessors.has(i)) return false; accessorMap.set(i, accessorMap.size); return true })
  for (const [parent, key] of accessorRefs) parent[key] = accessorMap.get(parent[key])
  const infos = []
  walk(doc.materials, (key, value) => { if (key.endsWith('Texture') && Number.isInteger(value?.index)) infos.push(value) })
  const usedTextures = new Set(infos.map(t => t.index)), textureMap = new Map()
  doc.textures = doc.textures.filter((_, i) => { if (!usedTextures.has(i)) return false; textureMap.set(i, textureMap.size); return true })
  for (const t of infos) t.index = textureMap.get(t.index)
  const usedImages = new Set(doc.textures.map(imageSource)), imageMap = new Map(), imageHashes = new Map(), uniqueImages = []
  doc.images.forEach((image, i) => {
    if (!usedImages.has(i)) return
    const v = doc.bufferViews[image.bufferView]
    const data = replacements.get(image.bufferView) ?? bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)
    const hash = image.mimeType + ':' + createHash('sha256').update(data).digest('hex')
    if (!imageHashes.has(hash)) { imageHashes.set(hash, uniqueImages.length); uniqueImages.push(image) }
    imageMap.set(i, imageHashes.get(hash))
  })
  doc.images = uniqueImages
  for (const t of doc.textures) {
    if (t.source !== undefined) t.source = imageMap.get(t.source)
    for (const ext of ['KHR_texture_basisu', 'EXT_texture_webp']) if (t.extensions?.[ext]) t.extensions[ext].source = imageMap.get(t.extensions[ext].source)
  }
  const used = new Set(), map = new Map(), chunks = [], viewHashes = new Map(), uniqueViews = []
  walk(doc, (key, value) => { if (key === 'bufferView' && Number.isInteger(value)) used.add(value) })
  let offset = 0
  doc.bufferViews.forEach((v, i) => {
    if (!used.has(i)) return
    const bytes = replacements.get(i) ?? bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)
    const hash = `${v.target ?? 0}:${v.byteStride ?? 0}:` + createHash('sha256').update(bytes).digest('hex')
    if (viewHashes.has(hash)) { map.set(i, viewHashes.get(hash)); return }
    map.set(i, uniqueViews.length); viewHashes.set(hash, uniqueViews.length); uniqueViews.push(v)
    v.byteOffset = offset; v.byteLength = bytes.length; chunks.push(bytes); offset += bytes.length
    const pad = (4 - offset % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad }
  })
  doc.bufferViews = uniqueViews
  walk(doc, (key, value, parent) => { if (key === 'bufferView' && Number.isInteger(value)) parent[key] = map.get(value) })
  doc.buffers = [{ byteLength: offset }]
  let json = Buffer.from(JSON.stringify(doc)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8)
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8)
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4)
  const result = Buffer.concat([header, json, binHeader, ...chunks])
  await fs.writeFile(file, result)
  return result.length
}
