import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Object3D } from 'three'

export function archivePrintRole(name: string): 'photo' | 'postcard' | 'paper' | null {
  if (name === 'LifeMemoryPhoto' || name === 'ArchivePhoto_04') return 'photo'
  if (/^ArchivePhoto_0[1-3]$/.test(name)) return 'postcard'
  if (/^PhotoMount_0[1-4]$/.test(name) || name === 'Life_PhotoPaper' || name === 'LifeEnvelopeFlap') return 'paper'
  return null
}

/** Moving prints cannot carry the visibility of their original shelf/wall pose. */
export function prepareArchivePrintMaterials(root: Object3D) {
  const originals = new Map<Mesh, { material: Material | Material[]; cast: boolean; receive: boolean }>()
  const copies = new Map<Material, Map<string, MeshStandardMaterial>>()
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    const role = archivePrintRole(object.name)
    if (!role) return
    const mesh = object as Mesh
    originals.set(mesh, { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow })
    const prepare = (original: Material): Material => {
      if (!(original instanceof MeshStandardMaterial)) return original
      let roles = copies.get(original)
      if (!roles) { roles = new Map(); copies.set(original, roles) }
      let material = roles.get(role)
      if (!material) {
        material = original.clone()
        material.aoMap = null
        material.lightMap = null
        for (const key of ['archive_lightmap', 'archive_lightmap_version', 'archive_lightmap_scale', 'archiveLightTexture']) delete material.userData[key]
        material.metalness = 0
        if (material instanceof MeshPhysicalMaterial) {
          material.clearcoat = role === 'photo' ? .06 : 0
          material.clearcoatRoughness = .42
        }
        if (role === 'paper') {
          material.roughness = .92
          material.normalScale.multiplyScalar(.3)
        } else {
          // Satin photo stock and matte postcards share the original image bytes.
          // Their broad reflected highlight comes from the room, never emissive ink.
          material.roughness = role === 'photo' ? .46 : .68
          material.envMapIntensity = 1
        }
        roles.set(role, material)
      }
      return material
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(prepare) : prepare(mesh.material)
    // The ink sits on a closed paper mesh. One silhouette should cast the shadow;
    // a second caster at the image inset makes a dark rectangle on the white border.
    mesh.castShadow = role === 'paper'
    mesh.receiveShadow = true
  })
  return () => {
    for (const [mesh, original] of originals) {
      mesh.material = original.material
      mesh.castShadow = original.cast
      mesh.receiveShadow = original.receive
    }
    for (const roles of copies.values()) for (const material of roles.values()) material.dispose()
    originals.clear()
    copies.clear()
  }
}
