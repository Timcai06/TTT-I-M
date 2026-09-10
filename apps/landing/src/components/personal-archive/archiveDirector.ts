import { PerspectiveCamera, Vector3 } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { views } from '../../assets/personal-archive/scene-contract.json'
import { readingFrame } from './readingFrame'
import { archiveScrollPose } from './scrollPose'
import { chapterPose, chapterTracks, phase, type ArchiveTrack } from './chapterTracks'
import type { LegacyWorldPlan } from './archiveExecution.ts'

export type SpatialShot = ArchiveTrack | 'entry' | 'index'
export type ArchiveView = keyof typeof views
const routes = {
  'about-life': ['about', 'life'], 'life-frame': ['life', 'frame'], 'frame-stack': ['frame', 'stack'],
  'stack-work': ['stack', 'work'], 'work-contact': ['work', 'contact'],
} as const
const arcs: Record<SpatialShot, [number, number, number]> = {
  index: [0, 0, 0], entry: [-.14, .045, -.08], 'about-life': [-.12, .09, .04], 'life-frame': [0, .10, .20],
  'frame-stack': [.09, .04, .12], 'stack-work': [.08, -.035, .06], 'work-contact': [-.10, .09, .08],
}

/** A single seekable rig; no React remount, accumulated playback or chapter reset. */
export function createArchiveDirector(
  model: GLTF,
  camera: PerspectiveCamera,
  actionNames: readonly string[],
) {
  const a = new Vector3(), b = new Vector3(), target = new Vector3()
  const indexBlend = .08
  const indexView = {
    position: views.home.position.map((value, index) => value + ((views.stack.position[index] ?? value) - value) * indexBlend) as [number, number, number],
    target: views.home.target.map((value, index) => value + ((views.stack.target[index] ?? value) - value) * indexBlend) as [number, number, number],
    fov: views.home.fov + (views.stack.fov - views.home.fov) * indexBlend,
  }
  const closeBlend = .72
  const indexCloseView = {
    position: indexView.position.map((value, index) => value + ((views.stack.position[index] ?? value) - value) * closeBlend) as [number, number, number],
    target: indexView.target.map((value, index) => value + ((views.stack.target[index] ?? value) - value) * closeBlend) as [number, number, number],
    fov: indexView.fov + (views.stack.fov - indexView.fov) * closeBlend,
  }
  // The exported Contact camera sits directly behind the chair back. Reuse the
  // unobstructed seated desk view for the first Contact release: book, monitor
  // and lamp stay in one composition while the virtual desk plane opens.
  const contactView = indexView
  const viewConfig = (view: ArchiveView) => view === 'contact' ? contactView : views[view]
  const viewOrder: ArchiveView[] = ['home', 'about', 'life', 'frame', 'stack', 'work', 'contact']
  function viewAction(view: ArchiveView, name: string) {
    const index = viewOrder.indexOf(view)
    if (name === 'NotebookOpen') return index >= 1 ? 1 : 0
    if (name.startsWith('Life')) return index >= 2 ? 1 : 0
    if (name.startsWith('FramePrint')) return index >= 3 ? 1 : 0
    if (/^(WorkDrawerOpen|CinemaRailTravel)/.test(name)) return view === 'work' ? 1 : view === 'contact' ? .35 : 0
    if (name === 'WorkFolderLift') return view === 'work' ? 1 : 0
    return 0
  }
  let pointerX = 0, pointerY = 0
  function follow(amount: number) {
    // Translate camera and target together; projected HTML uses this final matrix.
    camera.position.x += pointerX * .032 * amount
    camera.position.y += pointerY * .020 * amount
    target.x += pointerX * .008 * amount
    target.y += pointerY * .006 * amount
  }
  function navigationPose(fromView: ArchiveView, toView: ArchiveView, progress: number, readingRest = false) {
    const from = viewConfig(fromView), to = viewConfig(toView)
    const travel = phase(progress, .24, .60)
    camera.position.fromArray(from.position).lerp(a.fromArray(to.position), travel)
    const bend = Math.sin(Math.PI * travel)
    camera.position.y += bend * .13
    camera.position.x += bend * ((to.position[0] ?? 0) >= (from.position[0] ?? 0) ? .06 : -.06)
    target.fromArray(from.target).lerp(b.fromArray(to.target), travel)
    camera.lookAt(target)
    camera.fov = from.fov + (to.fov - from.fov) * travel
    const surface = toView === 'home' ? null : `${toView === 'stack' ? 'Stack' : toView.charAt(0).toUpperCase() + toView.slice(1)}Reading`
    if (surface && (fromView !== toView || readingRest)) {
      const destination = readingFrame(model.scene, surface, camera)
      if (destination) {
        const align = phase(progress, .60, .78)
        const dolly = phase(progress, .78, 1)
        const distance = destination.distance * (1.7 - .7 * dolly)
        camera.position.lerp(a.copy(destination.center).addScaledVector(destination.normal, distance), align)
        camera.quaternion.slerp(destination.rotation, align)
        target.lerp(destination.center, align)
      }
    }
    if (fromView !== 'home' && progress < .24) {
      const sourceSurface = `${fromView === 'stack' ? 'Stack' : fromView.charAt(0).toUpperCase() + fromView.slice(1)}Reading`
      const source = readingFrame(model.scene, sourceSurface, camera)
      if (source) {
        const leave = 1 - phase(progress, 0, .24)
        camera.position.lerp(a.copy(source.center).addScaledVector(source.normal, source.distance), leave)
        camera.quaternion.slerp(source.rotation, leave)
        target.lerp(source.center, leave)
      }
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    return { focus: camera.position.distanceTo(target) }
  }
  function authored(shot: SpatialShot, progress: number, name: string) {
    const entry = archiveScrollPose(progress)
    const chapter = chapterPose(shot === 'entry' || shot === 'index' ? 'about-life' : shot, progress)
    return name === 'NotebookOpen' ? shot === 'index' ? 0 : shot === 'entry' ? entry.cover : 1
      : /^(WorkDrawerOpen|CinemaRailTravel)/.test(name) ? shot === 'index' || shot === 'entry' ? 0 : chapter.drawer
        : name === 'WorkFolderLift' ? shot === 'index' || shot === 'entry' ? 0 : chapter.folder
          : name.startsWith('Life') ? shot === 'index' || shot === 'entry' ? 0 : shot === 'about-life' ? phase(progress, .23, .62) : 1
            : name.startsWith('FramePrint') ? shot === 'life-frame' ? chapter.travel : shot === 'frame-stack' || shot === 'stack-work' || shot === 'work-contact' ? 1 : 0 : 0
  }
  function plan(shot: SpatialShot, progress: number): LegacyWorldPlan {
    return Object.freeze({ amounts: Object.freeze(Object.fromEntries(actionNames.map(name => [name, authored(shot, progress, name)]))), monitorPhoto: ['frame-stack', 'stack-work', 'work-contact'].includes(shot), wallPhoto: shot === 'frame-stack' ? true : undefined })
  }
  function navigationPlan(from: ArchiveView, to: ArchiveView, progress: number): LegacyWorldPlan {
    const travel = phase(progress, .24, .60)
    return Object.freeze({ amounts: Object.freeze(Object.fromEntries(actionNames.map(name => {
      const start = viewAction(from, name), end = viewAction(to, name)
      return [name, start + (end - start) * travel]
    }))), monitorPhoto: viewOrder.indexOf(from) >= 4 || viewOrder.indexOf(to) >= 4 })
  }
  function commit(plan: LegacyWorldPlan) { void plan }
  function pose(shot: SpatialShot, progress: number) {
    const entry = archiveScrollPose(progress)
    const routeShot = shot === 'entry' || shot === 'index' ? 'about-life' : shot
    const chapter = chapterPose(routeShot, progress)
    const from = shot === 'entry' || shot === 'index' ? indexView : viewConfig(routes[shot][0])
    const to = shot === 'index' ? indexCloseView : viewConfig(shot === 'entry' ? 'about' : routes[shot][1])
    const indexApproach = phase(progress, 0, .18) * (1 - phase(progress, .22, .46))
    const travel = shot === 'index' ? indexApproach : shot === 'entry' ? entry.camera : chapter.travel
    const approach = shot === 'index' ? 0 : shot === 'entry' ? entry.approach : chapter.approach
    const flatten = shot === 'index' ? 0 : shot === 'entry' ? entry.flatten : chapter.flatten
    camera.position.fromArray(from.position).lerp(a.fromArray(to.position), travel)
    const arc = arcs[shot], bend = Math.sin(Math.PI * travel) * (1 - approach)
    camera.position.addScaledVector(a.set(...arc), bend)
    target.fromArray(from.target).lerp(b.fromArray(to.target), travel)
    const surface = shot === 'index' ? 'StackReading' : shot === 'entry' ? 'AboutReading' : chapterTracks[shot].surface
    camera.fov = from.fov + (to.fov - from.fov) * travel
    follow((1 - flatten) * (1 - approach) * (shot === 'index' ? 1 - phase(progress, 0, .18) : phase(progress, .24, .32)))
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    if (shot !== 'index') {
      const destination = readingFrame(model.scene, surface, camera)
      if (destination) {
        const dolly = phase(progress, .74, .94)
        const distance = destination.distance + (Math.max(.5, destination.distance * 1.8) - destination.distance) * (1 - dolly)
        camera.position.lerp(a.copy(destination.center).addScaledVector(destination.normal, distance), approach)
        camera.quaternion.slerp(destination.rotation, approach)
        target.lerp(destination.center, approach)
      }
      if (shot !== 'entry' && progress < .24) {
        const source = readingFrame(model.scene, `${routes[shot][0] === 'stack' ? 'Stack' : routes[shot][0].charAt(0).toUpperCase() + routes[shot][0].slice(1)}Reading`, camera)
        if (source) {
          const leave = 1 - phase(progress, .08, .24)
          camera.position.lerp(a.copy(source.center).addScaledVector(source.normal, source.distance), leave)
          camera.quaternion.slerp(source.rotation, leave)
          target.lerp(source.center, leave)
        }
      }
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    // During Frame → Stack the accepted DOM image itself lands on the monitor;
    // showing the GLB photo plane at the same time creates a visible duplicate.
    // The physical screen memory takes over only after that handoff completes.
    // Index is a real DOM surface and Final Horizon becomes the later screen
    // memory. The legacy PulseGraph plane stays available in the GLB but must
    // not flash between these two authored states.
    return { surface, focus: camera.position.distanceTo(target), flatten, approach }
  }
  return { plan, navigationPlan, commit, pose, navigationPose, pointer(x: number, y: number) { pointerX = x; pointerY = y }, dispose() {} }
}
