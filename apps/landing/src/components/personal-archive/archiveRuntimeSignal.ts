import { Mesh, SRGBColorSpace, TextureLoader, type BufferGeometry, type MeshStandardMaterial, type Object3D } from 'three'
import { resolveFinalHorizonImage } from '../../content/narrativeObjects'

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
  const restore = targets.map(({ screen, bounds, maxWidth, maxHeight }) => {
    const previous = { material: screen.material as MeshStandardMaterial, scale: screen.scale.clone() }
    const material = previous.material.clone()
    material.map = texture; material.emissiveMap = texture; material.needsUpdate = true
    screen.material = material
    const ratio = image.width / image.height, width = Math.min(maxWidth, maxHeight * ratio)
    screen.scale.x *= width / (bounds.max.x - bounds.min.x)
    screen.scale.z *= width / ratio / (bounds.max.z - bounds.min.z)
    return () => { screen.material = previous.material; screen.scale.copy(previous.scale); material.dispose() }
  })
  return {
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
