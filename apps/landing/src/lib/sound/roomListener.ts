/**
 * Where the reader's ear is, relative to the one hole in the room.
 *
 * The window layer of the ambience has to rise as the camera approaches the
 * opening, which means the audio graph needs a number the render loop owns. React
 * state is the wrong carrier: the archive commits a camera every frame, and sixty
 * re-renders a second to move one GainNode would cost more than the sound does.
 * So this is a plain module-level scalar — written by the frame commit in
 * `archiveRuntime`, read by `RoomAmbience` inside its own rAF.
 *
 * The window's world position is NOT redeclared here. `archiveBackdrop` owns
 * WINDOW_CENTRE because the backdrop's follow maths is defined against it, and a
 * second copy that drifted would move the sound away from the view it belongs to.
 */
import type { Vector3 } from 'three'
import { WINDOW_CENTRE } from '../../components/personal-archive/archiveBackdrop'

/** Distance at which the outside is as loud as it ever gets. The authored camera
 *  never comes closer than roughly a metre to the opening. */
const NEAR_METRES = 1.1
/** Distance past which the outside has faded out. The room's far wall sits about
 *  4.5m from the window, so this spans the whole authored route. */
const FAR_METRES = 4.6

let proximity = 0

/** Called once per committed frame. Cheap: one subtraction and one square root. */
export function publishListenerPosition(position: Vector3) {
  const dx = position.x - WINDOW_CENTRE.x
  const dy = position.y - WINDOW_CENTRE.y
  const dz = position.z - WINDOW_CENTRE.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  const t = (FAR_METRES - distance) / (FAR_METRES - NEAR_METRES)
  proximity = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
}

/** 0 at the far wall, 1 at the opening. Smoothstepped, so there is no corner to
 *  hear when the camera crosses either end of the range. */
export function getWindowProximity() {
  return proximity
}

/** The room is gone (renderer torn down); the outside should not stay open. */
export function resetListenerPosition() {
  proximity = 0
}
