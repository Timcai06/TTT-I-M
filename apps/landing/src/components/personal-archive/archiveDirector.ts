import { AnimationMixer, LoopOnce, PerspectiveCamera, Vector3, type AnimationAction, type Object3D } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { views } from '../../assets/personal-archive/scene-contract.json'
import { archiveScrollPose } from './scrollPose'
import { chapterPose, chapterTracks, phase, type ArchiveTrack } from './chapterTracks'

export type SpatialShot = ArchiveTrack | 'entry'
const routes = {
  'about-life': ['about', 'life'], 'life-frame': ['life', 'frame'], 'frame-stack': ['frame', 'stack'],
  'stack-work': ['stack', 'work'], 'work-contact': ['work', 'contact'],
} as const
const arcs: Record<SpatialShot, [number, number, number]> = {
  entry: [-.14, .045, -.08], 'about-life': [-.12, .09, .04], 'life-frame': [0, .10, .20],
  'frame-stack': [.09, .04, .12], 'stack-work': [.08, -.035, .06], 'work-contact': [-.10, .09, .08],
}

/** A single seekable rig; no React remount, accumulated playback or chapter reset. */
export function createArchiveDirector(model: GLTF, camera: PerspectiveCamera) {
  const mixer = new AnimationMixer(model.scene), actions = new Map<string, AnimationAction>()
  for (const clip of model.animations) {
    if (!/^(NotebookOpen|LifeEnvelopeOpen|LifePhotoExtract|WorkDrawerOpen|WorkFolderLift|FramePrintSettle|CinemaRailTravel)/.test(clip.name)) continue
    const action = mixer.clipAction(clip); action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true; action.play(); action.paused = true; actions.set(clip.name, action)
  }
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3(), target = new Vector3(), center = new Vector3()
  const corners = new Map<string, Object3D[]>()
  for (const surface of ['AboutReading', 'LifeReading', 'FrameReading', 'StackReading', 'WorkReading']) {
    corners.set(surface, ['TL', 'TR', 'BL'].map(suffix => {
      const object = model.scene.getObjectByName(`${surface}_${suffix}`)
      if (!object) throw new Error(`Archive is missing ${surface}_${suffix}`)
      return object
    }))
  }
  function seek(name: string, amount: number) {
    const action = actions.get(name); if (!action) return
    const clip = action.getClip()
    const interval = /^(WorkDrawerOpen|CinemaRailTravel)/.test(name) ? [1, 2.4] : name === 'WorkFolderLift' ? [74 / 30, 110 / 30] : [0, clip.duration]
    action.time = interval[0]! + amount * (interval[1]! - interval[0]!)
  }
  function pose(shot: SpatialShot, progress: number, page: HTMLElement | null) {
    const entry = archiveScrollPose(progress)
    const chapter = chapterPose(shot === 'entry' ? 'about-life' : shot, progress)
    const from = views[shot === 'entry' ? 'home' : routes[shot][0]]
    const to = views[shot === 'entry' ? 'about' : routes[shot][1]]
    const travel = shot === 'entry' ? entry.camera : chapter.travel
    const approach = shot === 'entry' ? entry.approach : chapter.approach
    const flatten = shot === 'entry' ? entry.flatten : chapter.flatten
    for (const name of actions.keys()) {
      const amount = name === 'NotebookOpen' ? shot === 'entry' ? entry.cover : 1
        : /^(WorkDrawerOpen|CinemaRailTravel)/.test(name) ? shot === 'entry' ? 0 : chapter.drawer
          : name === 'WorkFolderLift' ? shot === 'entry' ? 0 : chapter.folder
            : name.startsWith('Life') ? shot === 'about-life' ? phase(progress, .23, .62) : shot === 'life-frame' ? chapter.picture : 0
              : name.startsWith('FramePrint') && shot === 'life-frame' ? travel : 0
      seek(name, amount)
    }
    mixer.update(0); model.scene.updateMatrixWorld(true)
    camera.position.fromArray(from.position).lerp(a.fromArray(to.position), travel)
    const arc = arcs[shot], bend = Math.sin(Math.PI * travel) * (1 - approach)
    camera.position.addScaledVector(a.set(...arc), bend)
    target.fromArray(from.target).lerp(b.fromArray(to.target), travel)
    const surface = shot === 'entry' ? 'AboutReading' : chapterTracks[shot].surface
    if (shot !== 'work-contact') {
      const points = corners.get(surface)!
      points[0]!.getWorldPosition(a); points[1]!.getWorldPosition(b); points[2]!.getWorldPosition(c)
      center.copy(b).add(c).multiplyScalar(.5)
      normal.copy(b).sub(a).cross(c.sub(a)).normalize()
      if (normal.dot(a.copy(camera.position).sub(center)) < 0) normal.negate()
      const distance = shot === 'entry' ? .30 : shot === 'frame-stack' ? .52 : .42
      camera.position.lerp(a.copy(center).addScaledVector(normal, distance), approach)
      // The extracted Life photograph rises in front of a shelf. Arc toward
      // the room before approaching its plane, clear of the shelf's front edge.
      if (shot === 'about-life') camera.position.z += Math.sin(Math.PI * approach) * .45
      target.lerp(center, approach)
    }
    camera.lookAt(target)
    camera.fov = from.fov + (to.fov - from.fov) * travel
    camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    const project = model.scene.getObjectByName('MonitorState_project'), photo = model.scene.getObjectByName('MonitorState_photo')
    if (project) project.visible = shot !== 'frame-stack'
    if (photo) photo.visible = shot === 'frame-stack'
    if (page) { page.style.transform = 'none'; page.style.opacity = '0' }
    return { surface, focus: camera.position.distanceTo(target), flatten, approach }
  }
  return { pose, dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model.scene) } }
}
