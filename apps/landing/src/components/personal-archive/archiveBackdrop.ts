import { Vector3, type Object3D } from 'three'

/**
 * Keeps the view outside the window covered, and consistent between the two panels.
 *
 * Two symptoms, one cause. The backdrop is two finite planes: WindowPanorama_Rear,
 * 10x6.67m at z=-7, and WindowPanorama_Side, 13x8.67m at x=-7. They carry the same
 * `alpine-evening` texture at different sizes, so the identical image reads 30%
 * larger on one than on the other — which is why the two windows appear to look out
 * on different scenery. Being finite, an oblique view also runs past their edge.
 *
 * Growing the panel does not work. Each camera sees only a slice of it, but the
 * slices differ wildly: the Life pose sits 0.42m from the glass and magnifies its
 * cone 13.9x by z=-7, so covering every authored position needs a 4.3x panel, which
 * drops the 1536px source to 36 px/m — visibly soft in the one place the eye rests.
 *
 * So hold the magnification constant instead. The panel is placed along the
 * camera-to-window ray at a fixed multiple of the camera's distance to the glass,
 * which makes its footprint the same size from everywhere: no edge is reachable,
 * no scaling is needed, and full texel density is kept. This is also how a genuinely
 * distant landscape behaves — it does not change size as you cross a room — so it
 * removes the mismatch in apparent scale between the two windows as well.
 */
const WINDOW_CENTRE = new Vector3(.2, 1.67, -1.515)
/** Window half-width is 1.21m and the panel half-width is 5m, so 4.13 is the hard
 *  ceiling; 3.4 leaves margin for the corner rays and for pointer parallax. */
const MAGNIFICATION = 3.4

const ray = new Vector3()

export function createArchiveBackdrop(model: Object3D) {
  const rear = model.getObjectByName('WindowPanorama_Rear')
  const side = model.getObjectByName('WindowPanorama_Side')
  if (!rear) return null

  const rearHome = rear.position.clone()
  const sideHome = side?.position.clone() ?? null
  const sideScale = side?.scale.clone() ?? null

  // Match texel density between the two panels. Side is 13m across to Rear's 10m
  // for the same texture; equal world size per pixel is what makes the two windows
  // agree about what is outside them.
  if (side) side.scale.multiplyScalar(10 / 13)

  return {
    update(cameraPosition: Vector3) {
      ray.copy(WINDOW_CENTRE).sub(cameraPosition)
      if (!(ray.lengthSq() > 1e-8)) return
      // Place the panel centre on the camera-to-window ray, at MAGNIFICATION times
      // the camera's own distance to the glass. Constant magnification means the
      // window's cone always lands in the same fraction of the panel.
      rear.position.set(
        cameraPosition.x + ray.x * MAGNIFICATION,
        cameraPosition.y + ray.y * MAGNIFICATION,
        cameraPosition.z + ray.z * MAGNIFICATION,
      )
    },
    dispose() {
      rear.position.copy(rearHome)
      if (side && sideHome && sideScale) { side.position.copy(sideHome); side.scale.copy(sideScale) }
    },
  }
}
