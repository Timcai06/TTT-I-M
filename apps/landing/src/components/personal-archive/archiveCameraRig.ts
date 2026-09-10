import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { StoryFrame } from '../../core/narrative/types.ts'
import sceneContract from '../../assets/personal-archive/scene-contract.json' with { type: 'json' }

const { views } = sceneContract

export type AnchorPoints = readonly (readonly number[])[]
export type SampleAnchors = Readonly<Record<string, AnchorPoints>>
export interface FinalArchiveCamera {
  readonly position: readonly number[]
  readonly quaternion: readonly number[]
  readonly view: readonly number[]
  readonly projection: readonly number[]
  readonly fov: number
  readonly aspect: number
  readonly near: number
  readonly far: number
  readonly focus: number
}
// Module-scope scratch: solveArchiveCamera runs once (sometimes twice) per
// rendered frame, so every instance below is reused rather than allocated
// per call. Each is fully overwritten before it is read - see the per-call
// assignments at each use site - so nothing leaks between calls.
const camera = new PerspectiveCamera()
const target = new Vector3()
const indexPosition = new Vector3()
const indexTarget = new Vector3()
const scratchVec = new Vector3()
const scratchCenter = new Vector3()
const scratchQuat = new Quaternion()
// fit() intermediates only - never part of its returned (long-lived) result.
const fitTL = new Vector3(); const fitTR = new Vector3(); const fitBR = new Vector3(); const fitBL = new Vector3()
const fitRight = new Vector3()
const fitUp = new Vector3()
const fitMatrix = new Matrix4()
const lookMatrix = new Matrix4()
const lookUp = new Vector3()
const lookDir = new Vector3()
const lookDestUp = new Vector3()
const scratchStandoff = new Vector3()

/** How far back a handoff pulls before closing on the destination surface. */
const STANDOFF_RATIO = 1.85
/** Vertical lift per metre of horizontal crossing. */
const LIFT_PER_METRE = .45
/** The room shell (ArchiveArchitecture) tops out at y=2.80; keep .25 clear of it. */
const CEILING_CLEARANCE_Y = 2.55

const ease = (v: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (v - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
function fit(points: AnchorPoints | undefined, fov: number, aspect: number) {
  if (!points || points.length !== 4 || !points.flat().every(Number.isFinite)) throw new Error('Missing/invalid reading anchors')
  const [tlSrc, trSrc, brSrc, blSrc] = points
  if (!tlSrc || !trSrc || !brSrc || !blSrc) throw new Error('Missing reading corner')
  const tl = fitTL.fromArray(tlSrc), tr = fitTR.fromArray(trSrc), br = fitBR.fromArray(brSrc), bl = fitBL.fromArray(blSrc)
  const right = fitRight.subVectors(tr, tl), up = fitUp.subVectors(tl, bl)
  if (right.length() < 1e-6 || up.length() < 1e-6) throw new Error('Degenerate reading surface')
  const normal = new Vector3().crossVectors(right, up).normalize()
  if (normal.length() < .99) throw new Error('Degenerate reading normal')
  const distance = Math.max(up.length(), right.length() / aspect) / (2 * Math.tan(fov * Math.PI / 360))
  // center/normal/rotation are the long-lived result: fit() is called up to
  // several times per invocation and callers hold multiple results at once
  // (source + destination + the life-frame carrier fit), so these cannot be
  // pooled - only the corners/right/up/basis-matrix above are safe to reuse.
  return { center: new Vector3().addVectors(tl, br).multiplyScalar(.5), normal, distance, rotation: new Quaternion().setFromRotationMatrix(fitMatrix.makeBasis(right.normalize(), up.normalize(), normal)) }
}
export function solveArchiveCamera(frame: StoryFrame, anchors: SampleAnchors, viewport: { width: number; height: number }, pointer = { x: 0, y: 0 }): FinalArchiveCamera {
  if (![viewport.width, viewport.height].every(n => Number.isFinite(n) && n > 0) || ![pointer.x, pointer.y].every(Number.isFinite)) throw new Error('Invalid camera input')
  const intent = frame.camera
  const targetView = intent.mode === 'index' ? views.home : views[intent.targetView]
  // camera is reused across calls, so every field it carries state in must
  // be assigned explicitly here - near/far were previously constructor
  // constants (.01, 80) and now must be set by hand for the same reason.
  camera.fov = targetView.fov; camera.aspect = viewport.width / viewport.height; camera.near = .01; camera.far = 80
  const indexBase = .08
  indexPosition.fromArray(views.home.position).lerp(scratchVec.fromArray(views.stack.position), indexBase)
  indexTarget.fromArray(views.home.target).lerp(scratchVec.fromArray(views.stack.target), indexBase)
  const indexFov = views.home.fov + (views.stack.fov - views.home.fov) * indexBase
  const surfacePose = (surfaceName: string, fov: number) => {
    const surface = fit(anchors[surfaceName], fov, camera.aspect)
    // position is a second long-lived point derived from center; center is
    // still exposed on the returned object, so it cannot be mutated here.
    const position = surface.center.clone().addScaledVector(surface.normal, surface.distance)
    return { ...surface, position }
  }
  const applyIndexPointer = () => {
    indexPosition.x += pointer.x * .032; indexPosition.y += pointer.y * .020
    indexTarget.x += pointer.x * .008; indexTarget.y += pointer.y * .006
  }
  if (intent.mode === 'index') {
    // Index interaction lives inside the real monitor DOM. It must not also
    // move the room camera or create a second, timer-owned scroll axis.
    applyIndexPointer()
    camera.position.copy(indexPosition); target.copy(indexTarget); camera.fov = indexFov
    camera.lookAt(target)
  } else if (intent.mode === 'surface-fit') {
    const surface = surfacePose(intent.targetSurface, camera.fov)
    camera.position.copy(surface.position)
    camera.quaternion.copy(surface.rotation); target.copy(surface.center)
  } else {
    const sourceFov = frame.position.segment === 'entry' ? indexFov : views[intent.sourceView].fov
    const to = views[intent.targetView]
    const interpolatedFov = sourceFov + (to.fov - sourceFov) * intent.travel
    camera.fov = interpolatedFov
    const destination = surfacePose(intent.targetSurface, to.fov)
    let sourcePosition: Vector3
    let sourceTarget: Vector3
    let sourceRotation: Quaternion
    // How far the pose actually has to rotate, measured from the two surfaces
    // rather than assumed. 0 when they are parallel, 1 when perpendicular.
    let sourceNormal: Vector3 | null = null
    if (frame.position.segment === 'entry') {
      applyIndexPointer()
      camera.position.copy(indexPosition); camera.fov = indexFov; camera.lookAt(indexTarget)
      // indexPosition/indexTarget are long-lived scratch mutated on every
      // call (including the next one), so these snapshots must stay clones.
      sourcePosition = indexPosition.clone()
      sourceTarget = indexTarget.clone()
      sourceRotation = camera.quaternion.clone()
      camera.fov = interpolatedFov
    } else {
      // source is a fresh, single-owner object (nothing else reads it after
      // this point), so handing off its fields directly is not an alias risk.
      const source = surfacePose(intent.sourceSurface, sourceFov)
      sourceNormal = source.normal
      sourcePosition = source.position
      sourceTarget = source.center
      sourceRotation = source.rotation
    }
    // destination.position is likewise never read again after this handoff.
    const destinationPosition = destination.position
    // The old floor of .72 only ever bound LifeReading, whose fit distance is .265,
    // so that one leg pulled back 2.72x while the other five pulled back 1.85x.
    // The floor is now only a degenerate-input guard; the ratio is the contract.
    const standoffDistance = Math.max(.35, destination.distance * STANDOFF_RATIO)
    const standoffPosition = scratchStandoff.copy(destination.center).addScaledVector(destination.normal, standoffDistance)
    camera.position.copy(sourcePosition).lerp(standoffPosition, intent.travel)
    camera.position.lerp(destinationPosition, intent.dolly)
    // Vertical arc, derived rather than authored. The five hand-typed arc triples
    // were uncorrelated with the move they described: life-frame crosses 2.35m and
    // received the flattest lift of all five (9.7% of its horizontal run) while
    // about-life crosses .65m and received the steepest (24.1%). Lift now scales
    // with the horizontal run and is capped by real headroom under the room shell.
    // life-frame is the exception: there the camera is rigidly bound to the moving
    // photograph below, and the block near the end of this function overwrites
    // camera.position outright. Adding lift before that produced a 0.46m jump the
    // instant the carrier engaged, and lifting after it would push the photograph
    // out of frame. That leg gets its vertical character from the carrier's own
    // trajectory arc in archivePhotoTransfer, which is where it belongs.
    const carrierOwnsPath = frame.position.segment === 'life-frame' && Boolean(anchors.FootballTransfer)
    const horizontalRun = Math.hypot(destinationPosition.x - sourcePosition.x, destinationPosition.z - sourcePosition.z)
    const headroom = CEILING_CLEARANCE_Y - Math.max(sourcePosition.y, destinationPosition.y)
    const lift = carrierOwnsPath ? 0 : Math.max(0, Math.min(horizontalRun * LIFT_PER_METRE, headroom))
    // Rise, carry, set down. The previous envelope was sin(pi*travel)*(1-align):
    // a spike peaking near progress .41 and spent by .8, so the middle of a long
    // crossing had no lift left. A plateau keeps the camera up while it travels.
    // Both ends are exactly 0, so the endpoint poses stay the authored surface fits.
    const carry = frame.position.progress
    camera.position.y += lift * ease(carry, .06, .30) * (1 - ease(carry, .62, .92))
    target.copy(sourceTarget).lerp(destination.center, intent.travel)
    if (frame.position.segment === 'life-frame' && anchors.FootballTransfer) {
      scratchCenter.set(0, 0, 0)
      for (const p of anchors.FootballTransfer) scratchCenter.add(scratchVec.fromArray(p))
      scratchCenter.multiplyScalar(.25)
      target.lerp(scratchCenter, 1 - intent.align)
    }
    const t = Math.max(0, Math.min(1, (frame.position.progress - .24) / .08))
    const gain = t * t * (3 - 2 * t) * (1 - intent.align) * (1 - frame.presentation.targetExpand)
    camera.position.x += pointer.x * .032 * gain; camera.position.y += pointer.y * .020 * gain
    target.x += pointer.x * .008 * gain; target.y += pointer.y * .006 * gain
    target.lerp(destination.center, intent.dolly)
    // Look through the physical travel target (including the moving photo and
    // pointer parallax), then settle into the authored surface roll. Endpoints
    // remain the exact source/destination fits in both directions.
    // Object3D.lookAt always builds its basis against world up (0,1,0).
    // AboutReading and LifeReading lie flat on the desk — their measured
    // normals are exactly (0,1,0) — so descending onto them drives the view
    // direction onto that same axis, where the basis is degenerate and its roll
    // swings on arbitrarily small target changes. That unstable roll is what
    // made the descent onto the notebook read as a twist, and it forced the
    // final slerp into `destination.rotation` to cover a large angle, which is
    // the pop at the 3D→2D handoff. Blend the reference up toward the target
    // surface's own up only as the view actually turns vertical: the other four
    // surfaces sit at 89°–90° to world up, so this term stays 0 and their poses
    // are byte-for-byte unchanged.
    lookDir.subVectors(target, camera.position)
    if (lookDir.lengthSq() > 1e-12) {
      lookDir.normalize()
      const vertical = Math.abs(lookDir.y)
      const raw = Math.max(0, Math.min(1, (vertical - .7) / .25))
      const blend = raw * raw * (3 - 2 * raw)
      lookUp.set(0, 1, 0)
      if (blend > 0) {
        lookDestUp.set(0, 1, 0).applyQuaternion(destination.rotation)
        lookUp.lerp(lookDestUp, blend)
        if (lookUp.lengthSq() < 1e-8) lookUp.copy(lookDestUp)
      }
      lookUp.normalize()
      lookMatrix.lookAt(camera.position, target, lookUp)
      camera.quaternion.setFromRotationMatrix(lookMatrix)
    } else {
      camera.lookAt(target)
    }
    // The two branches never both need scratchQuat in the same call: the fit
    // branch only runs when life-frame+FootballTransfer holds, which is the
    // same precondition guarding the carrier-follow block's own scratchQuat
    // use below - so reusing it here for the fallback clone is safe.
    const pathRotation = frame.position.segment === 'life-frame' && anchors.FootballTransfer
      ? fit(anchors.FootballTransfer, camera.fov, camera.aspect).rotation
      : scratchQuat.copy(camera.quaternion)
    camera.quaternion.copy(sourceRotation).slerp(pathRotation, Math.max(intent.travel, 1 - intent.leave))
    // A 90-degree desk-to-wall flip and a flat desk-to-desk slide were sharing one
    // .5-.8 align window, so the wall legs had to complete the entire turn inside
    // 30% of the scroll while the flat legs barely used the window at all. Spread
    // the turn by how far it actually is. The reshaping is monotonic and fixes both
    // endpoints, so 0 and 1 still land exactly on the authored source and
    // destination poses; only the middle starts earlier and eases longer.
    const flip = sourceNormal ? 1 - Math.min(1, Math.abs(sourceNormal.dot(destination.normal))) : 0
    const alignApplied = flip > 0 ? Math.pow(intent.align, 1 / (1 + .8 * flip)) : intent.align
    camera.quaternion.slerp(destination.rotation, alignApplied)
    if (frame.position.segment === 'life-frame' && anchors.FootballTransfer && intent.travel > 0 && intent.align < 1) {
      // Follow the real moving carrier itself instead of trying to repair a
      // room-path camera after the photograph has turned between surfaces.
      // Alignment blends the carrier fit into the exact Frame reading pose.
      const photo = fit(anchors.FootballTransfer, camera.fov, camera.aspect)
      const margin = 1 - .2 * Math.sin(Math.PI * intent.travel) * (1 - intent.align)
      // photo.center is read again below, so this offset point must stay a clone.
      const photoPosition = photo.center.clone().addScaledVector(photo.normal, photo.distance / margin)
      const settle = intent.align * intent.align
      camera.position.copy(photoPosition).lerp(destinationPosition, settle)
      camera.quaternion.copy(photo.rotation).slerp(destination.rotation, settle)
      target.copy(photo.center).lerp(destination.center, settle)
      const inverseRotation = scratchQuat.copy(camera.quaternion).invert()
      let backoff = 0
      for (const point of anchors.FootballTransfer.slice(0, 4)) {
        const local = scratchVec.fromArray(point).sub(camera.position).applyQuaternion(inverseRotation)
        const requiredDepth = Math.max(Math.abs(local.x) / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect * .99), Math.abs(local.y) / (Math.tan(camera.fov * Math.PI / 360) * .99))
        backoff = Math.max(backoff, requiredDepth + local.z)
      }
      if (backoff > 0) camera.position.addScaledVector(scratchVec.set(0, 0, 1).applyQuaternion(camera.quaternion), backoff)
    }
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
  return Object.freeze({ position: Object.freeze(camera.position.toArray()), quaternion: Object.freeze(camera.quaternion.toArray()), view: Object.freeze([...camera.matrixWorldInverse.elements]), projection: Object.freeze([...camera.projectionMatrix.elements]), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, focus: camera.position.distanceTo(target) })
}
export function applyArchiveCamera(camera: PerspectiveCamera, value: FinalArchiveCamera) {
  camera.position.fromArray(value.position); camera.quaternion.fromArray(value.quaternion)
  camera.fov = value.fov; camera.aspect = value.aspect; camera.near = value.near; camera.far = value.far
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
}
