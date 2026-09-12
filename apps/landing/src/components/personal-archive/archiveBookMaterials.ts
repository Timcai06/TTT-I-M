import { Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three'

function belongsToBook(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (/^(Notebook|About_)/.test(node.name)) return true
  }
  return false
}

/**
 * The room bake captures the closed notebook. Its occlusion blacks out the paper
 * after the cover opens, and its indirect light cannot follow the moving cover.
 * Use live lighting for the book, including the endpaper under NotebookHinge.
 * Clone before preparing shaders: Paper_fiber and Linen_natural also belong to
 * static props elsewhere, which still need their room bake.
 */
export function prepareArchiveBookMaterials(root: Object3D) {
  const originals = new Map<Mesh, Material | Material[]>()
  const copies = new Map<MeshStandardMaterial, MeshStandardMaterial>()
  const liveMaterial = (original: Material): Material => {
    if (!(original instanceof MeshStandardMaterial)) return original
    let material = copies.get(original)
    if (!material) {
      material = original.clone()
      material.aoMap = null
      material.lightMap = null
      for (const key of ['archive_lightmap', 'archive_lightmap_version', 'archive_lightmap_scale', 'archiveLightTexture']) {
        delete material.userData[key]
      }
      copies.set(original, material)
    }
    return material
  }
  root.traverse(object => {
    if (!(object instanceof Mesh) || !belongsToBook(object)) return
    const mesh = object as Mesh
    originals.set(mesh, mesh.material)
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(liveMaterial)
      : liveMaterial(mesh.material)
  })
  return () => {
    // Restore first so the model's owner can still dispose every source texture.
    // Clones share those textures; only their material programs belong here.
    for (const [mesh, original] of originals) mesh.material = original
    for (const material of copies.values()) material.dispose()
    originals.clear()
    copies.clear()
  }
}
