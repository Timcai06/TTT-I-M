import assert from 'node:assert/strict'
import test from 'node:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { prepareArchiveBookMaterials } from '../src/components/personal-archive/archiveBookMaterials.ts'

void test('book lighting is isolated from shared room materials and preserves surface textures', () => {
  const root = new Group(), hinge = new Group()
  hinge.name = 'NotebookHinge'
  root.add(hinge)
  const surface = new Texture(), ao = new Texture(), bounce = new Texture()
  const paper = new MeshStandardMaterial({ map: surface, normalMap: surface, roughnessMap: surface, aoMap: ao, lightMap: bounce })
  paper.userData = { archive_lightmap: true, archive_lightmap_version: 2, archiveLightTexture: { index: 48 }, authored: 'paper' }
  const geometry = new BoxGeometry()
  const page = new Mesh(geometry, paper), endpaper = new Mesh(geometry, paper), room = new Mesh(geometry, paper)
  page.name = 'NotebookReadingSurface'
  endpaper.name = 'Cinema_BookInnerEndpaper'
  room.name = 'WorkFile'
  root.add(page, room)
  hinge.add(endpaper)
  const restore = prepareArchiveBookMaterials(root)
  assert.notEqual(page.material, paper)
  assert.equal(endpaper.material, page.material, 'book copies should share one program per original material')
  assert.equal(room.material, paper)
  assert.equal(paper.aoMap, ao)
  assert.equal(paper.lightMap, bounce)
  assert.equal(page.material.aoMap, null)
  assert.equal(page.material.lightMap, null)
  assert.equal(page.material.map, surface)
  assert.equal(page.material.normalMap, surface)
  assert.equal(page.material.roughnessMap, surface)
  assert.equal(page.material.userData.archive_lightmap_version, undefined)
  assert.equal(page.material.userData.authored, 'paper')
  assert.equal(paper.userData.archive_lightmap_version, 2)
  let disposed = 0, textureDisposals = 0
  page.material.addEventListener('dispose', () => disposed++)
  for (const texture of [surface, ao, bounce]) texture.addEventListener('dispose', () => textureDisposals++)
  restore()
  restore()
  assert.equal(page.material, paper)
  assert.equal(endpaper.material, paper)
  assert.equal(disposed, 1)
  assert.equal(textureDisposals, 0, 'the model owns shared textures')
  paper.dispose()
  geometry.dispose()
  for (const texture of [surface, ao, bounce]) texture.dispose()
})

void test('multi-material book meshes restore their original array', () => {
  const root = new Group(), material = new MeshStandardMaterial({ aoMap: new Texture() })
  const original = [material, material], mesh = new Mesh(new BoxGeometry(), original)
  mesh.name = 'About_TurnedMargin'
  root.add(mesh)
  const restore = prepareArchiveBookMaterials(root)
  assert.notEqual(mesh.material, original)
  assert.equal(mesh.material[0], mesh.material[1])
  assert.equal(mesh.material[0]?.aoMap, null)
  restore()
  assert.equal(mesh.material, original)
  material.aoMap?.dispose()
  material.dispose()
  mesh.geometry.dispose()
})
