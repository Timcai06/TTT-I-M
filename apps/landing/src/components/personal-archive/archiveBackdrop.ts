import { Box3, Vector3, type Object3D } from 'three'

/**
 * Keeps the view outside the window covered, and consistent between the two panels.
 *
 * The backdrop is two finite planes: WindowPanorama_Rear, 10x6.67m centred at
 * (0, 1.33, -7), and WindowPanorama_Side, 13x8.67m centred at (-7, 1.33, -0.5).
 * They carry the same `alpine-evening` texture at different sizes, so the identical
 * image reads 30% larger on one than on the other — which is why the two windows
 * appear to look out on different scenery. Being finite, an oblique view also runs
 * past their edge onto the scene background.
 *
 * Growing the panel does not solve it. Each camera sees only a slice, but the slices
 * differ wildly: the Life pose sits 0.42m from the glass and magnifies its cone
 * 13.9x by z=-7. Covering all seven authored positions needs a 4.3x panel, which
 * drops the 1536px source to 36 px/m — visibly soft in the one place the eye rests.
 *
 * So hold the magnification constant instead. The panel centre is placed along the
 * camera-to-window ray at a fixed multiple of the camera's own distance to the
 * glass, so its footprint is the same size from every pose: no edge is reachable,
 * nothing has to grow, and full texel density is kept. A genuinely distant landscape
 * behaves this way too — it does not change size as you cross a room.
 *
 * BOTH nodes sit at translation (0,0,0) with the offset baked into their geometry,
 * so `position` is a delta from the authored centre and never the centre itself.
 * Setting it directly stacks the two and throws the panel out of view — which is
 * what turned the window beige, showing the bare scene background.
 */
const WINDOW_CENTRE = new Vector3(.2, 1.67, -1.515)
/** Window half-width is 1.21m against a 5m panel half-width, so 4.13 is the hard
 *  ceiling; 3.4 leaves margin for the corner rays and for pointer parallax. */
const MAGNIFICATION = 3.4

const ray = new Vector3()
const bounds = new Box3()

function authoredCentre(object: Object3D) {
  // Read the geometry's own world centre while the node is still untouched.
  // setFromObject walks world matrices, so they have to be current or the centre
  // is read from a stale transform and the correction is silently wrong.
  object.updateWorldMatrix(true, true)
  return bounds.setFromObject(object).getCenter(new Vector3())
}

export function createArchiveBackdrop(model: Object3D) {
  const rear = model.getObjectByName('WindowPanorama_Rear')
  const side = model.getObjectByName('WindowPanorama_Side')
  if (!rear) return null

  const rearHome = rear.position.clone()
  const rearCentre = authoredCentre(rear)

  const sideHome = side?.position.clone() ?? null
  const sideScale = side?.scale.clone() ?? null
  if (side && sideHome) {
    // Match world size per pixel with the rear panel: 13m across for the same
    // texture reads 30% larger. Scaling happens about the node origin, which for
    // these nodes is far from the geometry, so the centre has to be put back.
    const centre = authoredCentre(side)
    const factor = 10 / 13
    side.scale.multiplyScalar(factor)
    side.position.set(
      sideHome.x + centre.x * (1 - factor),
      sideHome.y + centre.y * (1 - factor),
      sideHome.z + centre.z * (1 - factor),
    )
  }

  return {
    update(cameraPosition: Vector3) {
      ray.copy(WINDOW_CENTRE).sub(cameraPosition)
      if (!(ray.lengthSq() > 1e-8)) return
      // Where the panel centre needs to be, then expressed as a delta from where the
      // geometry already is.
      rear.position.set(
        rearHome.x + (cameraPosition.x + ray.x * MAGNIFICATION) - rearCentre.x,
        rearHome.y + (cameraPosition.y + ray.y * MAGNIFICATION) - rearCentre.y,
        rearHome.z + (cameraPosition.z + ray.z * MAGNIFICATION) - rearCentre.z,
      )
    },
    dispose() {
      rear.position.copy(rearHome)
      if (side && sideHome && sideScale) { side.position.copy(sideHome); side.scale.copy(sideScale) }
    },
  }
}
