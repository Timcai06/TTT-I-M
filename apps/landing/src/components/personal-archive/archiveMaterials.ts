import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Material } from 'three'
import { stabilizeArchiveMaterial } from './archiveRenderSafety'
import { preserveBakedIrradiance } from './archiveBakedIrradiance'

/** glTF transports baked RGB irradiance through an explicitly tagged slot. */
export function prepareArchiveMaterials(root: Object3D, maxAnisotropy = 8) {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    // Two different things used to share this exclusion, and only one of them
    // belongs in it.
    //
    // Screen UI and printed ink really are flush with the surface underneath —
    // a lit monitor's interface, a folio number on a page — so casting a second
    // shadow from them produces acne and serrated edges at reading distance.
    //
    // ArchivePhoto_* is not that. Those are physical prints with a mount, and
    // PhotoMount_* casts already; excluding the print itself left the postcards
    // with no realtime shadow at all, so the only shadow under them was the one
    // baked into the surface they sit on. A bake is taken at rest, which is why
    // that shadow reads as a hard dark line and why it stays behind when the
    // print moves.
    const flush = /^(StackScreenSurface|StackPhotoViewerSurface|MonitorPhoto_|MonitorProject_|Batch_MonitorState_|Work_FileTitle_|Work_FileNumber_|About_PageFolio)/.test(object.name)
    const screen = /^(StackScreenSurface|StackPhotoViewerSurface|Monitor|Batch_MonitorState_)/.test(object.name)
    object.castShadow = !flush && !object.userData.archive_panorama && !object.userData.archive_glass && !object.name.includes('WindowLandscape')
    if (object.userData.archive_glass) {
      for (const mat of (Array.isArray(object.material) ? object.material : [object.material]) as Material[]) mat.depthWrite = false
    }
    object.receiveShadow = !screen
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      // Grazing-angle sharpness. The desk, floor and shelf faces are all seen at a
      // steep slant from every reading pose, and without anisotropic filtering their
      // wood and weave smear into mush at exactly the distance the camera settles at.
      // Cheap, and one of the few realism gains available without rebaking.
      for (const slot of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'lightMap'] as const) {
        const texture: unknown = (material as unknown as Record<string, unknown>)[slot]
        if (texture && typeof texture === 'object' && 'anisotropy' in texture) {
          const value = texture as { anisotropy: number; needsUpdate: boolean }
          if (value.anisotropy < maxAnisotropy) { value.anisotropy = maxAnisotropy; value.needsUpdate = true }
        }
      }
      if (material instanceof MeshPhysicalMaterial) stabilizeArchiveMaterial(material)
      if (material instanceof MeshStandardMaterial) preserveBakedIrradiance(material)
      if (material instanceof MeshStandardMaterial && material.userData.archive_lightmap && material.userData.archive_lightmap_version !== 2 && material.aoMap) {
        material.lightMap = material.aoMap
        material.aoMap = null
        // The bake is the only true indirect light in the room; .8 held it back
        // against the raised environment term.
        material.lightMapIntensity = .95
        material.needsUpdate = true
      }
    }
  })
}
