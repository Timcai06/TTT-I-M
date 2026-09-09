import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Material } from 'three'
import { stabilizeArchiveMaterial } from './archiveRenderSafety'

/** glTF transports baked RGB irradiance through an explicitly tagged slot. */
export function prepareArchiveMaterials(root: Object3D) {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    // Printed ink and screen UI are flush with another physical surface. Casting
    // another shadow from those overlays causes close-up acne and serrated edges.
    const printed = /^(ArchivePhoto_|StackScreenSurface|StackPhotoViewerSurface|MonitorPhoto_|MonitorProject_|Batch_MonitorState_|Work_FileTitle_|Work_FileNumber_|About_PageFolio)/.test(object.name)
    const screen = /^(StackScreenSurface|StackPhotoViewerSurface|Monitor|Batch_MonitorState_)/.test(object.name)
    object.castShadow = !printed && !object.userData.archive_panorama && !object.userData.archive_glass && !object.name.includes('WindowLandscape')
    if (object.userData.archive_glass) {
      for (const mat of (Array.isArray(object.material) ? object.material : [object.material]) as Material[]) mat.depthWrite = false
    }
    object.receiveShadow = !screen
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof MeshPhysicalMaterial) stabilizeArchiveMaterial(material)
      if (material instanceof MeshStandardMaterial && material.userData.archive_lightmap && material.aoMap) {
        material.lightMap = material.aoMap
        material.aoMap = null
        material.lightMapIntensity = .8
        material.needsUpdate = true
      }
    }
  })
}
