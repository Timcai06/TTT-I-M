// Numeric asset integrity only. This never renders or opens the website.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { readGlb, walk, imageSource } from '../exporting/glb_io.mjs'

const root = new URL('../../../', import.meta.url), work = new URL('output/web-refinement/', root)
const model = await readGlb(process.argv[2] ?? new URL('apps/landing/src/assets/personal-archive/personal-space.glb', root))
const baseline = await readGlb(new URL('baseline/original.glb', work))
const pbr = JSON.parse(await fs.readFile(new URL('pbr/manifest.json', work)))
const hash = b => createHash('sha256').update(b).digest('hex')
assert.equal(hash(await fs.readFile(new URL('art/personal-archive/source/tim-cai-personal-archive.blend', root))), pbr.sourceSha256, 'Export must not alter the editable source')
function values(asset, index) {
  const a = asset.doc.accessors[index], view = asset.doc.bufferViews[a.bufferView]
  assert.equal(a.componentType, 5126)
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], result = []
  for (let i = 0; i < a.count; i++) for (let k = 0; k < width; k++) result.push(asset.bin.readFloatLE((view.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (view.byteStride ?? width * 4) + k * 4))
  assert.ok(result.every(Number.isFinite), 'Non-finite accessor ' + index)
  return result
}
function near(a, b, label) { assert.equal(a.length, b.length, label); a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-6, `${label}[${i}] ${v} != ${b[i]}`)) }
function matrix(n) {
  return n.matrix ?? new Matrix4().compose(new Vector3(...(n.translation ?? [0,0,0])), new Quaternion(...(n.rotation ?? [0,0,0,1])), new Vector3(...(n.scale ?? [1,1,1]))).toArray()
}
const contract = JSON.parse(await fs.readFile(new URL('baseline/scene-contract.json', work)))
const protectedNames = new Set(Object.values(contract.surfaces).flat().concat(contract.monitorStates, ['NotebookCover','NotebookReadingSurface','Life_PhotoPaper','PhotoMount_04','Monitor screen']))
const parentName = (doc, index) => doc.nodes.find(n => n.children?.includes(index))?.name ?? null
assert.deepEqual(model.doc.animations.map(a => a.name).sort(), baseline.doc.animations.map(a => a.name).sort())
for (const old of baseline.doc.animations) {
  const current = model.doc.animations.find(a => a.name === old.name)
  assert.equal(current.channels.length, old.channels.length, old.name)
  for (const c of old.channels) {
    const name = baseline.doc.nodes[c.target.node].name; protectedNames.add(name)
    const channel = current.channels.find(x => model.doc.nodes[x.target.node].name === name && x.target.path === c.target.path)
    assert.ok(channel, old.name + ':' + name)
    const a = old.samplers[c.sampler], b = current.samplers[channel.sampler]
    assert.equal(a.interpolation ?? 'LINEAR', b.interpolation ?? 'LINEAR')
    near(values(baseline, a.input), values(model, b.input), old.name + ':times')
    near(values(baseline, a.output), values(model, b.output), old.name + ':values')
  }
}
for (const name of protectedNames) {
  const ai = baseline.doc.nodes.findIndex(n => n.name === name), bi = model.doc.nodes.findIndex(n => n.name === name)
  assert.ok(ai >= 0 && bi >= 0, name)
  near(matrix(baseline.doc.nodes[ai]), matrix(model.doc.nodes[bi]), name + ':transform')
  assert.equal(parentName(model.doc, bi), parentName(baseline.doc, ai), name + ':parent')
}
const activeMaterials = new Set(), checkedAccessors = new Set()
let triangles = 0
for (const n of model.doc.nodes) {
  if (n.mesh === undefined) continue
  for (const p of model.doc.meshes[n.mesh].primitives) {
    triangles += model.doc.accessors[p.indices].count / 3; activeMaterials.add(p.material)
    for (const index of Object.values(p.attributes)) if (!checkedAccessors.has(index)) { values(model, index); checkedAccessors.add(index) }
    walk(model.doc.materials[p.material], (key, info) => {
      if (key.endsWith('Texture') && Number.isInteger(info?.index)) assert.ok(p.attributes['TEXCOORD_' + (info.texCoord ?? 0)] !== undefined, n.name + ':' + key + ' missing UV')
    })
  }
}
for (const group of Object.keys(pbr.groups)) assert.ok([...activeMaterials].some(i => model.doc.materials[i].extras?.archive_refinement === group), group + ' missing from live geometry')
const moving = [...activeMaterials].map(i => model.doc.materials[i]).filter(m => m.extras?.archive_dynamic_surface)
assert.ok(moving.length > 0)
for (const m of moving) { assert.ok(!m.extras.archiveLightTexture, m.name); assert.ok(!m.occlusionTexture, m.name) }
assert.ok(!model.doc.extensionsUsed.includes('KHR_materials_anisotropy'))
function photoBytes(asset, name) {
  const node = asset.doc.nodes.find(n => n.name === name), p = asset.doc.meshes[node.mesh].primitives[0]
  const texture = asset.doc.materials[p.material].pbrMetallicRoughness.baseColorTexture
  const image = asset.doc.images[imageSource(asset.doc.textures[texture.index])], view = asset.doc.bufferViews[image.bufferView]
  return asset.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
}
for (const name of ['LifeMemoryPhoto','ArchivePhoto_01','ArchivePhoto_02','ArchivePhoto_03','ArchivePhoto_04','StackPhotoViewerSurface','StackScreenSurface']) assert.equal(hash(photoBytes(model, name)), hash(photoBytes(baseline, name)), name + ':original image bytes')
const report = { modelSha256: hash(model.bytes), sourceSha256: pbr.sourceSha256, groups: Object.keys(pbr.groups), nodes: model.doc.nodes.length, triangles, animations: model.doc.animations.length, protectedNodes: protectedNames.size, movingMaterials: moving.length, finiteAccessors: checkedAccessors.size, bytes: model.bytes.length, scope: 'Numeric asset integrity; no browser, GPU rendering, or visual acceptance.' }
await fs.writeFile(new URL('integrity.json', work), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
