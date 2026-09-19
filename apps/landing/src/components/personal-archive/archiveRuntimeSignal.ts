import { Mesh, SRGBColorSpace, TextureLoader, type BufferGeometry, type MeshStandardMaterial, type Object3D } from 'three'
import { resolveFinalHorizonImage } from '../../content/narrativeObjects'
import { signalGradeAt } from './archiveSignalGrade'
import type { StoryPosition } from '../../core/narrative/types'

/** The photograph stays on the physical monitor; no screen-space wave overlay. */
export async function createArchiveSignal(model: Object3D) {
  const image = resolveFinalHorizonImage()
  const screens = [['StackPhotoViewerSurface', .462, .303], ['MonitorPhoto_Thumbnail', .067, .073]] as const
  const targets = screens.map(([name, maxWidth, maxHeight]) => {
    const screen = model.getObjectByName(name)
    if (!(screen instanceof Mesh)) throw new Error(`Archive is missing ${name}`)
    const geometry = screen.geometry as BufferGeometry
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox
    if (!bounds) throw new Error(`${name} has no bounds`)
    return { screen, bounds, maxWidth, maxHeight }
  })
  const texture = await new TextureLoader().loadAsync(image.src)
  texture.colorSpace = SRGBColorSpace; texture.flipY = false
  const grade = { value: 0 }
  const restore = targets.map(({ screen, bounds, maxWidth, maxHeight }) => {
    const previous = { material: screen.material as MeshStandardMaterial, scale: screen.scale.clone() }
    const material = previous.material.clone()
    material.map = texture; material.emissiveMap = texture; material.needsUpdate = true
    // Grade only the photo's existing material pass, including its emissive map.
    // No new canvas, render pass, animation loop, or changes to Work's surfaces.
    material.onBeforeCompile = shader => {
      shader.uniforms.uArchivePhotoGrade = grade
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uArchivePhotoGrade;
vec3 archivePhotoGrade(vec3 rgb) {
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 calm = mix(rgb, vec3(luma), 0.35 * uArchivePhotoGrade);
  return calm * mix(vec3(1.0), vec3(1.025, 0.96, 0.86), uArchivePhotoGrade);
}`)
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = archivePhotoGrade(diffuseColor.rgb);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = archivePhotoGrade(totalEmissiveRadiance);')
    }
    material.customProgramCacheKey = () => 'archive-photo-grade-v1'
    screen.material = material
    const ratio = image.width / image.height, width = Math.min(maxWidth, maxHeight * ratio)
    screen.scale.x *= width / (bounds.max.x - bounds.min.x)
    screen.scale.z *= width / ratio / (bounds.max.z - bounds.min.z)
    return () => { screen.material = previous.material; screen.scale.copy(previous.scale); material.dispose() }
  })
  return {
    update(position: StoryPosition) { grade.value = signalGradeAt(position) },
    textures: [texture],
    content: Object.freeze({
      contentId: 'frame-final-horizon' as const,
      src: image.src,
      srcSet: image.srcSet,
      width: image.width,
      height: image.height,
      targets: Object.freeze(targets.map(({ screen, maxWidth, maxHeight }) => Object.freeze({
        name: screen.name,
        fit: 'contain' as const,
        maxWidth,
        maxHeight,
      }))),
    }),
    dispose() { restore.forEach(stop => stop()); texture.dispose() },
  }
}
