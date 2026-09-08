import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AnimationMixer, LoopOnce, PerspectiveCamera, Vector3, type AnimationAction } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { views as sceneViews } from '../../assets/personal-archive/scene-contract.json'
import ArchiveLighting from './ArchiveLighting'
import { chapterPose, chapterTracks, phase, type ArchiveTrack } from './chapterTracks'
import { projectReadingSurface } from './chapterProjection'
import type { ArchiveProgress } from './scrollPose'
import ArchiveSignal from './ArchiveSignal'

function seekAction(action: AnimationAction, amount: number) {
  const clip = action.getClip()
  // Blender holds before and after these actions; only sample the moving interval.
  const interval = clip.name === 'WorkDrawerOpen' ? [30 / 30, 72 / 30] : clip.name === 'WorkFolderLift' ? [74 / 30, 110 / 30] : [0, clip.duration]
  action.time = interval[0]! + amount * (interval[1]! - interval[0]!)
}

const routeViews = {
  'about-life': ['about', 'life'], 'life-frame': ['life', 'frame'],
  'frame-stack': ['frame', 'stack'], 'stack-work': ['stack', 'work'], 'work-contact': ['work', 'contact'],
} as const

export default function ArchiveChapterRoom({ model, track, progress, visible, page, onReady }: {
  model: GLTF; track: ArchiveTrack; progress: ArchiveProgress; visible: boolean; page: RefObject<HTMLDivElement | null>; onReady: () => void
}) {
  const { invalidate, gl } = useThree()
  const reported = useRef(false)
  const rig = useRef<{ mixer: AnimationMixer; actions: Map<string, AnimationAction> } | null>(null)
  const vectors = useMemo(() => ({ position: new Vector3(), target: new Vector3(), center: new Vector3(), normal: new Vector3(), a: new Vector3(), b: new Vector3(), c: new Vector3() }), [])
  useEffect(() => {
    const mixer = new AnimationMixer(model.scene)
    const actions = new Map<string, AnimationAction>()
    for (const clip of model.animations) {
      if (!/^(NotebookOpen|LifeEnvelopeOpen|LifePhotoExtract|WorkDrawerOpen|WorkFolderLift|FramePrintSettle)/.test(clip.name)) continue
      const action = mixer.clipAction(clip)
      action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); action.paused = true
      actions.set(clip.name, action)
    }
    rig.current = { mixer, actions }; invalidate()
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model.scene); rig.current = null }
  }, [model, invalidate])
  useEffect(() => {
    const sync = () => { if (visible) invalidate() }
    sync(); return progress.subscribe(sync)
  }, [visible, progress, invalidate])

  useFrame(({ camera, size }) => {
    if (!visible || !rig.current) return
    const p = progress.get(), pose = chapterPose(track, p)
    for (const [name, action] of rig.current.actions) {
      const amount = name === 'NotebookOpen' ? 1 : name === 'WorkDrawerOpen' ? pose.drawer : name === 'WorkFolderLift' ? pose.folder
        : name.startsWith('Life') ? track === 'about-life' ? phase(p, .23, .62) : pose.picture
          : name.startsWith('FramePrint') ? pose.travel : 0
      seekAction(action, amount)
    }
    rig.current.mixer.update(0); model.scene.updateMatrixWorld(true)
    const [fromName, toName] = routeViews[track]
    const from = sceneViews[fromName], to = sceneViews[toName]
    camera.position.copy(vectors.position.fromArray(from.position)).lerp(vectors.a.fromArray(to.position), pose.travel)
    vectors.target.fromArray(from.target).lerp(vectors.b.fromArray(to.target), pose.travel)
    const surface = chapterTracks[track].surface
    const corners = ['TL', 'TR', 'BL'].map(suffix => model.scene.getObjectByName(`${surface}_${suffix}`))
    if (track !== 'work-contact' && corners.every(Boolean)) {
      corners[0]!.getWorldPosition(vectors.a); corners[1]!.getWorldPosition(vectors.b); corners[2]!.getWorldPosition(vectors.c)
      vectors.center.copy(vectors.b).add(vectors.c).multiplyScalar(.5)
      vectors.normal.copy(vectors.b).sub(vectors.a).cross(vectors.c.clone().sub(vectors.a)).normalize()
      // Always approach from the camera's side of the actual animated surface.
      if (vectors.normal.dot(vectors.position.copy(camera.position).sub(vectors.center)) < 0) vectors.normal.negate()
      const distance = track === 'frame-stack' ? .52 : track === 'stack-work' ? .42 : .40
      camera.position.lerp(vectors.position.copy(vectors.center).addScaledVector(vectors.normal, distance), pose.approach)
      vectors.target.lerp(vectors.center, pose.approach)
    }
    camera.lookAt(vectors.target)
    if (camera instanceof PerspectiveCamera) { camera.fov = from.fov + (to.fov - from.fov) * pose.travel; camera.updateProjectionMatrix() }
    camera.updateMatrixWorld()
    const project = model.scene.getObjectByName('MonitorState_project'), photo = model.scene.getObjectByName('MonitorState_photo')
    if (project) project.visible = track !== 'frame-stack'
    if (photo) photo.visible = track === 'frame-stack'
    const element = page.current
    if (element) {
      const matrix = track === 'work-contact' ? null : projectReadingSurface(model.scene, surface, camera, size.width, size.height, pose.flatten)
      element.style.setProperty('transform', matrix ? `matrix3d(${matrix.join(',')})` : 'none')
      element.style.setProperty('opacity', String(track === 'work-contact' || matrix ? pose.ink : 0))
      element.style.setProperty('--paper-merge', String(pose.flatten))
    }
    if (!reported.current) {
      reported.current = true
      queueMicrotask(() => {
        if (!rig.current) return
        if (gl.info.render.calls && !gl.getContext().isContextLost()) onReady()
        else { reported.current = false; invalidate() }
      })
    }
  })
  return <><ArchiveLighting /><primitive object={model.scene} />{track === 'frame-stack' && <ArchiveSignal model={model} progress={progress} />}</>
}
