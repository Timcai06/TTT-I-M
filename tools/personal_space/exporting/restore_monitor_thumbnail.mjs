// Repair the already baked delivery without rebaking or replacing room detail.
// Future exports preserve this node in export_refined_scene.py instead.
import assert from 'node:assert/strict'
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three'
import { readGlb, writeGlb } from './glb_io.mjs'

const [targetPath, baselinePath] = process.argv.slice(2)
assert.ok(targetPath && baselinePath, 'Usage: restore_monitor_thumbnail.mjs target.glb baseline.glb')
const { doc, bin } = await readGlb(targetPath)
const baseline = await readGlb(baselinePath)
const name = 'MonitorPhoto_Thumbnail'
assert.ok(!doc.nodes.some(node => node.name === name), 'Thumbnail already preserved')
const original = baseline.doc.nodes.find(node => node.name === name)
assert.ok(original)
const batch = doc.nodes.find(node => node.name === 'Batch_MonitorState_photo')
const parent = doc.nodes.find(node => node.name === 'MonitorState_photo')
assert.ok(batch && parent?.children.includes(doc.nodes.indexOf(batch)))
const mesh = doc.meshes[batch.mesh]
const matches = mesh.primitives.filter(p => doc.materials[p.material].name === name + '_paper_ink')
assert.equal(matches.length, 1, 'Expected one isolated thumbnail primitive')
const primitive = structuredClone(matches[0])
const matrix = node => node.matrix
  ? new Matrix4().fromArray(node.matrix)
  : new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])))
const originalMatrix = matrix(original), batchMatrix = matrix(batch)
const transform = originalMatrix.clone().invert().multiply(batchMatrix)
const normals = new Matrix3().getNormalMatrix(transform)
const replacements = new Map()
let maxWorldError = 0
for (const semantic of ['POSITION', 'NORMAL']) {
  const accessor = doc.accessors[primitive.attributes[semantic]]
  assert.equal(accessor.type, 'VEC3'); assert.equal(accessor.componentType, 5126)
  assert.ok(!accessor.sparse)
  const view = doc.bufferViews[accessor.bufferView], data = Buffer.alloc(accessor.count * 12)
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < accessor.count; i++) {
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * (view.byteStride ?? 12)
    const before = new Vector3(...[0, 4, 8].map(k => bin.readFloatLE(offset + k)))
    const after = semantic === 'POSITION' ? before.clone().applyMatrix4(transform) : before.clone().applyMatrix3(normals).normalize()
    after.toArray().forEach((value, k) => {
      data.writeFloatLE(value, i * 12 + k * 4)
      min[k] = Math.min(min[k], value); max[k] = Math.max(max[k], value)
    })
    if (semantic === 'POSITION') maxWorldError = Math.max(maxWorldError, before.applyMatrix4(batchMatrix).distanceTo(after.applyMatrix4(originalMatrix)))
  }
  const bufferView = doc.bufferViews.push({ buffer: 0, byteLength: data.length, target: 34962 }) - 1
  replacements.set(bufferView, data)
  primitive.attributes[semantic] = doc.accessors.push({ componentType: 5126, type: 'VEC3', count: accessor.count, bufferView, ...(semantic === 'POSITION' ? { min, max } : {}) }) - 1
}
assert.ok(maxWorldError < 1e-6, 'Unbatching must preserve the world-space surface')
mesh.primitives = mesh.primitives.filter(p => p !== matches[0])
const restored = structuredClone(original)
restored.mesh = doc.meshes.push({ name, primitives: [primitive] }) - 1
parent.children.push(doc.nodes.push(restored) - 1)
const bytes = await writeGlb(targetPath, doc, bin, replacements)
console.log(JSON.stringify({ restored: name, bytes, maxWorldError, nodes: doc.nodes.length }))
