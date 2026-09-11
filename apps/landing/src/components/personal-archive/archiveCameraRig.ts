import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { StoryFrame } from '../../core/narrative/types.ts'
import sceneContract from '../../assets/personal-archive/scene-contract.json' with { type: 'json' }
import { PERSONAL_ARCHIVE_SAMPLE_STORY } from '../../core/narrative/specs.ts'

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
const scratchRetreat = new Vector3()
const scratchRoomPos = new Vector3()
const scratchRoomTarget = new Vector3()
const scratchRoomQuat = new Quaternion()

/** How far back a handoff pulls before closing on the destination surface. */
const STANDOFF_RATIO = 1.85
/** How far a mid-segment inspect push may travel toward the surface fit. */
const INSPECT_FRACTION = .35
/** How much pointer parallax survives once the camera has docked onto a reading
 *  surface. Small enough that the projected page does not swim under the text. */
const READING_PARALLAX_FLOOR = .22
/** Vertical lift per metre of horizontal crossing. */
const LIFT_PER_METRE = .45
/**
 * How far a crossing backs off along its own view axis mid-flight, as a multiple
 * of the destination's fit distance.
 *
 * Lift alone gave every handoff height but no depth, so a short crossing between
 * two surfaces at similar distance read as a slide across one plane. About -> Life
 * is the worst case: .65m of horizontal run onto an envelope whose fit distance is
 * .265m, so the camera never got far enough away for the print to be an object in
 * a room before it was already reading it. Backing off first makes the print small
 * and on the desk, and the push that follows is what reads as it coming out.
 */
const RETREAT_RATIO = 1.6
/** Whatever the fit distance, never back off further than this: the room is small
 *  and the wall behind the desk is closer than the arithmetic knows. */
const MAX_RETREAT = .7
/**
 * How far the Life -> Frame camera pulls back while the print is in flight,
 * as a multiple of the print's own fit distance. 0 reproduces the old behaviour
 * of riding the photograph full-frame the whole way across.
 */
const CARRIER_STANDOFF = 2.2

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
    // Stand-off is the ratio; the floor is only a degenerate-input guard.
    // I briefly restored the old .72 floor here after reading a .0106m clearance
    // failure as proof that the Life shelf needed it. That was a misdiagnosis: the
    // clearance came from an experimental early dolly on that leg, and with the
    // shared approach window .72 puts the camera high enough that the shelf above
    // the Life envelope blocks the view instead. The guards disagree with the floor
    // in both directions, which is what says the ratio is the right contract.
    const standoffDistance = Math.max(.35, destination.distance * STANDOFF_RATIO)
    const standoffPosition = scratchStandoff.copy(destination.center).addScaledVector(destination.normal, standoffDistance)
    camera.position.copy(sourcePosition).lerp(standoffPosition, intent.travel)
    // Move in on the beat before the arrival does. Bounded to INSPECT_FRACTION of
    // the way from the stand-off to the surface fit so it cannot enter the Life
    // corridor, and monotonic with dolly so the endpoint is still the exact fit.
    if (intent.inspect > 0) camera.position.lerp(destinationPosition, intent.inspect * INSPECT_FRACTION)
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
    // Rise with the departure, hold across the crossing, and come down exactly as
    // the dolly closes on the destination. Retiring it on a fixed progress window
    // instead left the camera still lifted while about-life was already pushing onto
    // the Life envelope, which put it up inside the shelf above — the line-of-sight
    // guard in archivePhotoTransfer caught the blocked view. Tying it to dolly makes
    // the descent match whatever arrival window each segment actually declares.
    camera.position.y += lift * ease(frame.position.progress, .06, .30) * (1 - intent.dolly)
    target.copy(sourceTarget).lerp(destination.center, intent.travel)
    // The depth half of the same arc. Both ends are exactly 0 for the same reasons
    // lift's are — it rises out of the departure and is retired by the dolly — so
    // the endpoint poses remain the authored surface fits byte for byte. It is
    // applied along the live view axis rather than either surface normal, because
    // that is the axis the reader perceives as near and far, and it stays correct
    // however the two surfaces happen to be oriented.
    if (!carrierOwnsPath) {
      scratchRetreat.subVectors(camera.position, target)
      if (scratchRetreat.lengthSq() > 1e-8) {
        const retreat = Math.min(destination.distance * RETREAT_RATIO, MAX_RETREAT)
        camera.position.addScaledVector(
          scratchRetreat.normalize(),
          retreat * ease(frame.position.progress, .06, .34) * (1 - intent.dolly),
        )
      }
    }
    if (frame.position.segment === 'life-frame' && anchors.FootballTransfer) {
      scratchCenter.set(0, 0, 0)
      for (const p of anchors.FootballTransfer) scratchCenter.add(scratchVec.fromArray(p))
      scratchCenter.multiplyScalar(.25)
      target.lerp(scratchCenter, 1 - intent.align)
    }
    const t = Math.max(0, Math.min(1, (frame.position.progress - .24) / .08))
    // Parallax at 3.2cm of full-deflection travel in a room-scale scene was below
    // the threshold at which a viewer attributes motion to their own hand — the
    // effect was implemented, correct, and invisible. Tripled, and given a floor so
    // that settling onto a reading surface no longer kills it outright: `1 - align`
    // alone collapsed to exactly zero at the one moment the reader is holding still
    // and looking, which is when a room most needs to feel like it has depth.
    // `1 - targetExpand` stays a hard multiplier: past full expansion the page is a
    // flat rect and there is nothing left for the camera to be parallax against.
    const gain = t * t * (3 - 2 * t) * (READING_PARALLAX_FLOOR + (1 - READING_PARALLAX_FLOOR) * (1 - intent.align)) * (1 - frame.presentation.targetExpand)
    camera.position.x += pointer.x * .096 * gain; camera.position.y += pointer.y * .060 * gain
    target.x += pointer.x * .024 * gain; target.y += pointer.y * .018 * gain
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
    // Widen the authored window rather than raising align to a power. pow() looked
    // tidier but its derivative is unbounded at align = 0, so the turn snapped on
    // at the exact progress where alignment begins — the continuity guard measured
    // .17m of camera jump there. A smoothstep over a wider window eases in and out
    // with zero derivative at both ends and still lands exactly on 0 and 1.
    const alignWindow = frame.position.segment === 'entry'
      ? PERSONAL_ARCHIVE_SAMPLE_STORY.timing.entryAlign
      : PERSONAL_ARCHIVE_SAMPLE_STORY.timing.align
    const alignApplied = flip > 0
      ? ease(frame.position.progress, alignWindow.start - .25 * flip, alignWindow.end + .10 * flip)
      : intent.align
    camera.quaternion.slerp(destination.rotation, alignApplied)
    if (frame.position.segment === 'life-frame' && anchors.FootballTransfer && intent.travel > 0 && intent.align < 1) {
      // Follow the real moving carrier itself instead of trying to repair a
      // room-path camera after the photograph has turned between surfaces.
      // Alignment blends the carrier fit into the exact Frame reading pose.
      const photo = fit(anchors.FootballTransfer, camera.fov, camera.aspect)
      // Watch the print cross the room, then move in. The camera is bound to the
      // carrier here, and it used to sit at the carrier's own fit distance for the
      // whole flight — so the photograph filled the frame from start to finish and
      // there was nothing else on screen to move against. Standing off during the
      // crossing puts the desk it left and the clip it is heading for in frame at
      // the same time, which is what makes the travel legible as travel. The
      // stand-off is zero at both ends, so the departure and the Frame arrival are
      // still the exact authored fits, and the corner backoff below only ever
      // pushes further out, so it cannot fight this.
      // Spread the stand-off over the whole segment, not over the .18-.64 travel
      // window. Riding `travel` packed the entire pull-out-and-back into 46% of
      // the scroll, and the continuity guard measures world movement per 1% of
      // progress — so any useful stand-off broke its .17m speed limit. Over the
      // full range the same amplitude moves at roughly half the peak rate.
      // The carrier block engages the instant travel leaves 0 (progress .18), and
      // it overwrites camera.position outright — so any stand-off that is already
      // non-zero there appears as a step. Ride an envelope that starts at exactly
      // that point, rises over a quarter of the segment, holds while the print
      // crosses the room, and is spent before the Frame arrival. Zero at .18 keeps
      // the handover continuous; zero at the end keeps the arrival on the fit.
      const watchEnvelope = ease(frame.position.progress, .18, .45) * (1 - ease(frame.position.progress, .62, .92))
      const watch = 1 + CARRIER_STANDOFF * watchEnvelope
      const margin = (1 - .2 * Math.sin(Math.PI * intent.travel) * (1 - intent.align)) / watch
      // photo.center is read again below, so this offset point must stay a clone.
      const photoPosition = photo.center.clone().addScaledVector(photo.normal, photo.distance / margin)
      // Settle onto the room path's own answer, not onto destinationPosition.
      //
      // This block is gated on `align < 1`, so at align = 1 it stops running and
      // the camera falls back to whatever the room path left. The carrier was
      // converging on destinationPosition while the room path, at that same
      // progress, has completed only 64% of its dolly — two different points, one
      // frame apart. Measured on the life-frame bridge: the projected black page
      // went from 1016.2px wide to 826.0px in a single step, at progress .8014,
      // and `align` is progressRange(.5, .8). That is the Frame chapter's
      // background suddenly getting smaller as it opens.
      //
      // Settling onto the room pose makes the two branches identical at align = 1
      // by construction, so there is nothing to step across. The arrival is still
      // owned by the room path, which is what the endpoint guards check.
      const roomPosition = scratchRoomPos.copy(camera.position)
      const roomQuaternion = scratchRoomQuat.copy(camera.quaternion)
      const roomTarget = scratchRoomTarget.copy(target)
      const settle = intent.align * intent.align
      camera.position.copy(photoPosition).lerp(roomPosition, settle)
      camera.quaternion.copy(photo.rotation).slerp(roomQuaternion, settle)
      target.copy(photo.center).lerp(roomTarget, settle)
      const inverseRotation = scratchQuat.copy(camera.quaternion).invert()
      let backoff = 0
      for (const point of anchors.FootballTransfer.slice(0, 4)) {
        const local = scratchVec.fromArray(point).sub(camera.position).applyQuaternion(inverseRotation)
        const requiredDepth = Math.max(Math.abs(local.x) / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect * .99), Math.abs(local.y) / (Math.tan(camera.fov * Math.PI / 360) * .99))
        backoff = Math.max(backoff, requiredDepth + local.z)
      }
      // Retired with the same curve. A backoff that is still non-zero at align = 1
      // would reintroduce the seam this block was just taken apart to remove, one
      // frame wide and in the opposite direction.
      if (backoff > 0) camera.position.addScaledVector(scratchVec.set(0, 0, 1).applyQuaternion(camera.quaternion), backoff * (1 - settle))
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
