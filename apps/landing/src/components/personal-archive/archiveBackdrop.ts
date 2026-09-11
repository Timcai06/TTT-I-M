import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'

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
/**
 * A still photograph behind the glass reads as a photograph. Coverage leaves 8.2%
 * of the panel's half-width unused at the worst camera, so the view can drift
 * inside that margin: real movement of the landscape against the window frame,
 * with no seam, because the panel simply slides and its edges stay unreachable.
 * Paired with a slow swell in the emissive term, which is the dawn light changing
 * rather than the mountains moving.
 */
const DRIFT_METRES = .3
const DRIFT_SECONDS = 46
const GLOW_SWING = .09
const GLOW_SECONDS = 31

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
  if (!rear) return null

  const rearHome = rear.position.clone()
  const rearCentre = authoredCentre(rear)
  const material = rear instanceof Mesh ? rear.material : null
  const glow = material instanceof MeshStandardMaterial ? material : null
  const glowBase = glow?.emissiveIntensity ?? 1

  // The side panel is left exactly as authored. Rescaling it to match the rear
  // panel's world size per pixel shrank it from z[-7,6] to z[-5.5,4.5], and 33 of
  // the rays that used to land on it escaped instead — that is the patch of bare
  // background that appeared on the left. Matching texel density by shrinking
  // geometry trades coverage for scale, which is the wrong trade: with the rear
  // panel now following the camera it absorbs every ray through the glass, so the
  // side panel only has to stay a full-size backstop.

  return {
    update(cameraPosition: Vector3, seconds = 0) {
      ray.copy(WINDOW_CENTRE).sub(cameraPosition)
      if (!(ray.lengthSq() > 1e-8)) return
      const drift = Math.sin(seconds * Math.PI * 2 / DRIFT_SECONDS) * DRIFT_METRES
      if (glow) glow.emissiveIntensity = glowBase * (1 + Math.sin(seconds * Math.PI * 2 / GLOW_SECONDS) * GLOW_SWING)
      // Where the panel centre needs to be, then expressed as a delta from where the
      // geometry already is.
      rear.position.set(
        rearHome.x + (cameraPosition.x + ray.x * MAGNIFICATION) - rearCentre.x + drift,
        rearHome.y + (cameraPosition.y + ray.y * MAGNIFICATION) - rearCentre.y,
        rearHome.z + (cameraPosition.z + ray.z * MAGNIFICATION) - rearCentre.z,
      )
    },
    dispose() {
      rear.position.copy(rearHome)
      if (glow) glow.emissiveIntensity = glowBase
    },
  }
}
