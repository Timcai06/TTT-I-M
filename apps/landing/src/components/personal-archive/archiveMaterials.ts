import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Material } from 'three'
import { Color } from 'three'
import { stabilizeArchiveMaterial } from './archiveRenderSafety'

/**
 * Surfaces that are meant to be flat, and must not be broken up.
 *
 * Printed ink, monitor UI text and the lamp bulb have no roughness variation in
 * reality either — ink is ink, a lit screen is emissive, a bulb is a light source.
 * Measuring the GLB, these account for most of the 38 materials that ship without
 * a roughness or normal map, and they are the ones that are correct as authored.
 *
 * The clear window, the standby display and the photographic panorama are named
 * here as well as being excluded by their userData flags at the call site. They are
 * the three that a name-only rule would have caught wrongly, so they get both.
 */
const DELIBERATELY_FLAT = /ink|monitor|screen|legend|folio|bulb|enamel inside|glass|clear window|standby|panorama/i

/**
 * How far the procedural break-up may move a material's roughness, plus or minus.
 * Small on purpose: this is meant to stop a surface reading as injection-moulded,
 * not to texture it.
 */
const ROUGHNESS_BREAKUP = .13
/** Cycles per metre of the noise. Fine enough to read as material grain rather
 *  than as a pattern, coarse enough to survive mip filtering at reading distance. */
const BREAKUP_SCALE = 26

/**
 * Break up uniform roughness on the props that never got a roughness map.
 *
 * Measured from the GLB: 16 of 54 materials carry both a normal and a roughness
 * map, and those 16 are the large architectural surfaces — walnut, plaster, linen,
 * ceramic, brushed hardware, paper fibre. They are authored correctly. What is
 * left bare is the props: the leaves, the dry branches, the coffee, the curtain
 * tie, the window seals, the rug binding. Each is a single roughness number across
 * its whole surface, and a perfectly uniform specular response is the strongest
 * single cue that something is not a real object. It is why the plants read as
 * plastic.
 *
 * The real fix is a roughness map authored in Blender, and this is not a
 * substitute for one — it adds variation, not detail. But it costs one noise
 * lookup on 32% of the triangles and it removes the uniformity, which is the part
 * the eye objects to.
 *
 * Object space, not world or view space: the noise has to be fixed to the object
 * so it does not swim when the camera moves or when a prop is animated.
 */
function breakUpUniformRoughness(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vArchiveObjectPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArchiveObjectPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vArchiveObjectPos;
float archiveHash(vec3 p) {
  p = fract(p * .3183099 + vec3(.71, .113, .419));
  p *= 17.;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float archiveNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(mix(archiveHash(i), archiveHash(i + vec3(1,0,0)), f.x),
        mix(archiveHash(i + vec3(0,1,0)), archiveHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(archiveHash(i + vec3(0,0,1)), archiveHash(i + vec3(1,0,1)), f.x),
        mix(archiveHash(i + vec3(0,1,1)), archiveHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor + (archiveNoise(vArchiveObjectPos * ${BREAKUP_SCALE}.) - .5) * ${ROUGHNESS_BREAKUP},
  .06, 1.);`)
  }
  material.needsUpdate = true
}

/** glTF transports baked RGB irradiance through an explicitly tagged slot. */
export function prepareArchiveMaterials(root: Object3D, maxAnisotropy = 8) {
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
      if (
        material instanceof MeshStandardMaterial
        && !material.roughnessMap
        && !material.normalMap
        && !material.transparent
        && !object.userData.archive_glass
        && !object.userData.archive_panorama
        && !DELIBERATELY_FLAT.test(material.name)
        && !(material.emissive instanceof Color && material.emissive.getHex() !== 0)
      ) breakUpUniformRoughness(material)
      if (material instanceof MeshStandardMaterial && material.userData.archive_lightmap && material.aoMap) {
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
