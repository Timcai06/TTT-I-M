import test from 'node:test'
import assert from 'node:assert/strict'
import { BoxGeometry, Mesh, MeshStandardMaterial, Object3D, Texture } from 'three'
import { prepareArchivePrintMaterials } from '../src/components/personal-archive/archivePrintMaterials.ts'

void test('moving prints isolate stale bakes while retaining ink and shared endpoint appearance', () => {
  const root = new Object3D(), map = new Texture(), ao = new Texture(), light = new Texture()
  const original = new MeshStandardMaterial({ map, aoMap: ao, lightMap: light })
  original.userData = { archive_lightmap: true, archive_lightmap_version: 2, archiveLightTexture: { index: 1 }, authored: 'retain' }
  const meshes = ['LifeMemoryPhoto', 'ArchivePhoto_04', 'ArchivePhoto_01', 'PhotoMount_04', 'Life_PhotoPaper', 'LifeEnvelopeFlap', 'UnrelatedPaper'].map(name => {
    const mesh = new Mesh(new BoxGeometry(), original)
    mesh.name = name; mesh.castShadow = true; root.add(mesh); return mesh
  })
  let textureDisposals = 0, materialDisposals = 0
  for (const texture of [map, ao, light]) texture.addEventListener('dispose', () => { textureDisposals++ })
  const restore = prepareArchivePrintMaterials(root)
  const [source, wall, postcard, mount, paper, flap, unrelated] = meshes
  assert.equal(source.material, wall.material)
  assert.equal(mount.material, paper.material)
  assert.equal(paper.material, flap.material)
  assert.notEqual(source.material, original)
  assert.equal(unrelated.material, original)
  assert.equal(original.aoMap, ao); assert.equal(original.lightMap, light)
  assert.equal(original.normalScale.x, 1)
  for (const mesh of meshes.slice(0, -1)) {
    assert.equal(mesh.material.map, map)
    assert.equal(mesh.material.aoMap, null); assert.equal(mesh.material.lightMap, null)
    assert.deepEqual(mesh.material.userData, { authored: 'retain' })
    assert.equal(mesh.receiveShadow, true)
    assert.equal(mesh.material.emissive.getHex(), 0)
  }
  assert.ok(source.material.roughness < postcard.material.roughness)
  assert.ok(postcard.material.roughness < paper.material.roughness)
  assert.equal(source.castShadow, false); assert.equal(postcard.castShadow, false)
  assert.equal(paper.castShadow, true); assert.equal(wall.castShadow, false)
  for (const material of new Set(meshes.slice(0, -1).map(mesh => mesh.material))) material.addEventListener('dispose', () => { materialDisposals++ })
  restore(); restore()
  assert.equal(materialDisposals, 3); assert.equal(textureDisposals, 0)
  for (const mesh of meshes) {
    assert.equal(mesh.material, original); assert.equal(mesh.castShadow, true); assert.equal(mesh.receiveShadow, false)
  }
})
