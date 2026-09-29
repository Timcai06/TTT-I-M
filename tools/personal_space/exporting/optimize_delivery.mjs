// Final web delivery pass. Intermediates live in the system temp directory,
// never in output/ or alongside the authored source model.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { readGlb, writeGlb, imageSource } from './glb_io.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const asset = path.join(root, 'apps/landing/src/assets/personal-archive/personal-space.glb')
const input = path.resolve(process.argv[2] ?? asset)
const output = path.resolve(process.argv[3] ?? asset)
const toktx = process.env.TOKTX ?? 'toktx'
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'personal-space-delivery-'))

// The archive renderer reads archiveLightTexture from material extras. glTF
// Transform cannot see that custom texture reference and prunes its texture
// object while preserving the image. Restore the reference after meshopt.
async function restoreLightmapTextures(source, file) {
  const raw = await fs.readFile(file)
  const jsonLength = raw.readUInt32LE(12)
  const target = JSON.parse(raw.subarray(20, 20 + jsonLength).toString())
  const imageByName = new Map(target.images.map((image, index) => [image.name, index]))
  const materialByName = new Map(target.materials.map(material => [material.name, material]))
  let restored = 0
  for (const sourceMaterial of source.materials) {
    const sourceSlot = sourceMaterial.extras?.archiveLightTexture
    if (!sourceSlot) continue
    const sourceTexture = source.textures[sourceSlot.index]
    const sourceImage = source.images[imageSource(sourceTexture)]
    const imageIndex = imageByName.get(sourceImage.name)
    const material = materialByName.get(sourceMaterial.name)
    if (imageIndex === undefined || !material?.extras?.archiveLightTexture) {
      throw new Error(`Missing archive lightmap: ${sourceMaterial.name}`)
    }
    const textureIndex = target.textures.length
    target.textures.push({ extensions: { KHR_texture_basisu: { source: imageIndex } } })
    material.extras.archiveLightTexture.index = textureIndex
    restored++
  }
  const json = Buffer.from(JSON.stringify(target))
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
  const header = Buffer.from(raw.subarray(0, 20))
  header.writeUInt32LE(20 + padded.length + raw.length - 20 - jsonLength, 8)
  header.writeUInt32LE(padded.length, 12)
  await fs.writeFile(file, Buffer.concat([header, padded, raw.subarray(20 + jsonLength)]))
  return restored
}

function preserveInteractiveGeometry(source, untouched, document) {
  const architecture = source.nodes.find(node => node.name === 'ArchiveArchitecture')?.mesh
  if (architecture === undefined) throw new Error('Static room mesh missing')
  const oldMeshes = untouched.getRoot().listMeshes()
  const meshes = document.getRoot().listMeshes()
  const copyAccessor = original => document.createAccessor(original.getName())
    .setType(original.getType())
    .setArray(original.getArray().slice())
    .setNormalized(original.getNormalized())
  let restored = 0
  for (const [index, mesh] of meshes.entries()) {
    if (index === architecture) continue
    const oldPrimitives = oldMeshes[index].listPrimitives()
    const primitives = mesh.listPrimitives()
    if (oldPrimitives.length !== primitives.length) throw new Error(`Primitive count changed: ${index}`)
    for (const [primitiveIndex, primitive] of primitives.entries()) {
      const original = oldPrimitives[primitiveIndex]
      for (const semantic of original.listSemantics()) {
        primitive.setAttribute(semantic, copyAccessor(original.getAttribute(semantic)))
      }
      if (original.getIndices()) primitive.setIndices(copyAccessor(original.getIndices()))
    }
    restored++
  }
  const oldNodes = untouched.getRoot().listNodes()
  const nodes = document.getRoot().listNodes()
  for (const [index, oldNode] of source.nodes.entries()) {
    if (oldNode.mesh === undefined || oldNode.mesh === architecture) continue
    const node = nodes[index]
    if (node.getName() !== oldNode.name) throw new Error(`Node order changed: ${oldNode.name}`)
    if (!node.getMesh()) {
      const wrapper = node.listChildren().find(child => !child.getName() && child.getMesh())
      if (!wrapper) throw new Error(`Named mesh detached: ${oldNode.name}`)
      node.setMesh(wrapper.getMesh())
      wrapper.dispose()
    }
    node.setMatrix(oldNodes[index].getMatrix())
  }
  return restored
}

try {
  const { doc, bin, bytes } = await readGlb(input)
  const imageBytes = image => {
    const view = doc.bufferViews[image.bufferView]
    return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
  }
  const replacements = new Map(), images = []
  for (const [index, image] of doc.images.entries()) {
    if (image.mimeType === 'image/ktx2') continue
    if (!['image/jpeg', 'image/webp', 'image/png'].includes(image.mimeType)) throw new Error(`Unsupported image ${index}: ${image.mimeType}`)
    const source = imageBytes(image)
    const pngPath = path.join(work, `${index}.png`)
    const ktxPath = path.join(work, `${index}.ktx2`)
    await fs.writeFile(pngPath, await sharp(source).png().toBuffer())
    execFileSync(toktx, [
      '--t2', '--encode', 'etc1s', '--qlevel', '255', '--clevel', '5',
      '--genmipmap', '--assign_oetf', 'srgb', '--assign_primaries', 'bt709',
      '--threads', '4', ktxPath, pngPath,
    ], { stdio: 'pipe' })
    const encoded = await fs.readFile(ktxPath)
    replacements.set(image.bufferView, encoded)
    image.mimeType = 'image/ktx2'
    for (const texture of doc.textures) if (imageSource(texture) === index) {
      delete texture.source
      texture.extensions = { ...texture.extensions, KHR_texture_basisu: { source: index } }
      delete texture.extensions.EXT_texture_webp
    }
    images.push({ name: image.name, before: source.length, after: encoded.length })
    console.log(`KTX2 ${index + 1}/${doc.images.length} ${image.name}: ${source.length} -> ${encoded.length}`)
  }
  doc.extensionsUsed = [...new Set([...(doc.extensionsUsed ?? []).filter(name => name !== 'EXT_texture_webp'), 'KHR_texture_basisu'])]
  doc.extensionsRequired = [...new Set([...(doc.extensionsRequired ?? []).filter(name => name !== 'EXT_texture_webp'), 'KHR_texture_basisu'])]
  const textured = path.join(work, 'textured.glb')
  await writeGlb(textured, doc, bin, replacements)
  if (process.env.PERSONAL_SPACE_TEXTURE_CACHE) await fs.copyFile(textured, path.resolve(process.env.PERSONAL_SPACE_TEXTURE_CACHE))

  const compressed = path.join(work, 'compressed.glb')
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  })
  const [document, untouched] = await Promise.all([io.read(textured), io.read(textured)])
  await document.transform(meshopt({
    encoder: MeshoptEncoder,
    level: 'medium',
    quantizePosition: 16,
    quantizeNormal: 12,
    quantizeTexcoord: 16,
    // Scene bounds keep semantic meshes on their authored named nodes. Per-mesh
    // quantization inserts unnamed wrapper nodes and breaks archive handoffs.
    quantizationVolume: 'scene',
  }))
  const interactiveMeshesRestored = preserveInteractiveGeometry(doc, untouched, document)
  await io.write(compressed, document)
  const restored = await restoreLightmapTextures(doc, compressed)
  const result = await readGlb(compressed)
  if (!result.doc.extensionsRequired?.includes('EXT_meshopt_compression')) throw new Error('Meshopt extension missing')
  if (result.doc.images.some(image => image.mimeType !== 'image/ktx2')) throw new Error('Uncompressed texture remains')
  if (result.doc.meshes.length !== doc.meshes.length || result.doc.animations.length !== doc.animations.length) throw new Error('Scene geometry or animation count changed')
  if (restored !== doc.materials.filter(material => material.extras?.archiveLightTexture).length) throw new Error('Archive lightmap count changed')
  await fs.copyFile(compressed, output)
  console.log(JSON.stringify({ before: bytes.length, afterTextures: (await fs.stat(textured)).size, after: result.bytes.length, interactiveMeshesRestored, images }))
} finally {
  await fs.rm(work, { recursive: true, force: true })
}
