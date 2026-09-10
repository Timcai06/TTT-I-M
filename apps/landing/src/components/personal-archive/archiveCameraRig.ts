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
      sourcePosition = source.position
      sourceTarget = source.center
      sourceRotation = source.rotation
    }
    // destination.position is likewise never read again after this handoff.
    const destinationPosition = destination.position
    const standoffDistance = Math.max(.72, destination.distance * 1.85)
    const standoffPosition = destination.center.clone().addScaledVector(destination.normal, standoffDistance)
    camera.position.copy(sourcePosition).lerp(standoffPosition, intent.travel)
    const arc = frame.position.segment === 'entry' ? [-.14,.045,-.08]
      : frame.position.segment === 'about-life' ? [-.12,.09,.04]
        : frame.position.segment === 'life-frame' ? [0,.14,.18]
          : frame.position.segment === 'frame-stack' ? [.09,.04,.12]
            : frame.position.segment === 'stack-work' ? [.08,-.035,.06] : [-.10,.09,.08]
    camera.position.addScaledVector(scratchVec.fromArray(arc), intent.arc)
    camera.position.lerp(destinationPosition, intent.dolly)
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
    camera.lookAt(target)
    // The two branches never both need scratchQuat in the same call: the fit
    // branch only runs when life-frame+FootballTransfer holds, which is the
    // same precondition guarding the carrier-follow block's own scratchQuat
    // use below - so reusing it here for the fallback clone is safe.
    const pathRotation = frame.position.segment === 'life-frame' && anchors.FootballTransfer
      ? fit(anchors.FootballTransfer, camera.fov, camera.aspect).rotation
      : scratchQuat.copy(camera.quaternion)
    camera.quaternion.copy(sourceRotation).slerp(pathRotation, Math.max(intent.travel, 1 - intent.leave))
    camera.quaternion.slerp(destination.rotation, intent.align)
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
