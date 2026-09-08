import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AnimationMixer, LoopOnce, PerspectiveCamera, Vector3, type AnimationAction } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import cameras from '../../assets/personal-archive/cameras.json'
import { projectReadingSurface } from './chapterProjection'
import ArchiveLighting from './ArchiveLighting'
import { archiveScrollPose, type ArchiveProgress } from './scrollPose'

export default function ArchiveRoom({ model, progress, visible, page, onReady }: { onReady: () => void; model: GLTF; progress: ArchiveProgress; visible: boolean; page: RefObject<HTMLDivElement | null> }) {
  const { invalidate, gl } = useThree()
  const reportedFrame = useRef(false)
  const rig = useRef<{ mixer: AnimationMixer; action: AnimationAction; duration: number } | null>(null)
  const views = useMemo(() => ({
    home: new Vector3().fromArray(cameras.entrance.position),
    desk: new Vector3().fromArray(cameras.about.position),
    homeTarget: new Vector3().fromArray(cameras.entrance.target),
    deskTarget: new Vector3().fromArray(cameras.about.target),
    target: new Vector3(),
    paper: new Vector3(-0.58, 0.864, -0.88),
    close: new Vector3(-0.58, 1.13, -0.879),
  }), [])
  useEffect(() => {
    const photo = model.scene.getObjectByName('MonitorState_photo')
    if (photo) photo.visible = false
    const mixer = new AnimationMixer(model.scene)
    const clip = model.animations.find((item) => item.name === 'NotebookOpen')
    if (!clip) throw new Error('Personal archive requires NotebookOpen')
    const action = mixer.clipAction(clip)
    action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    action.paused = true
    rig.current = { mixer, action, duration: clip.duration }
    invalidate()
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model.scene); rig.current = null }
  }, [model, invalidate])
  useEffect(() => {
    const sync = () => { if (visible) invalidate() }
    sync()
    return progress.subscribe(sync)
  }, [progress, visible, invalidate])
  useFrame(({ camera, size }) => {
    if (!visible || !rig.current) return
    const pose = archiveScrollPose(progress.get())
    camera.position.lerpVectors(views.home, views.desk, pose.camera)
    camera.position.lerp(views.close, pose.approach)
    camera.lookAt(views.target.lerpVectors(views.homeTarget, views.deskTarget, pose.camera).lerp(views.paper, pose.approach))
    if (camera instanceof PerspectiveCamera) {
      camera.fov = cameras.entrance.fov + (cameras.about.fov - cameras.entrance.fov) * pose.camera
      camera.updateProjectionMatrix()
    }
    rig.current.action.time = pose.cover * rig.current.duration
    rig.current.mixer.update(0)
    camera.updateMatrixWorld()
    if (!reportedFrame.current) {
      reportedFrame.current = true
      // R3F renders after useFrame. Report readiness after that submission, never at Canvas creation.
      queueMicrotask(() => {
        if (!rig.current) return
        if (gl.info.render.calls > 0 && !gl.getContext().isContextLost()) onReady()
        else { reportedFrame.current = false; invalidate() }
      })
    }
    const element = page.current
    if (element) {
      model.scene.updateMatrixWorld(true)
      const matrix = projectReadingSurface(model.scene, 'AboutReading', camera, size.width, size.height, pose.flatten)
      element.style.setProperty('transform', matrix ? `matrix3d(${matrix.join(',')})` : 'none')
      element.style.setProperty('opacity', matrix ? String(pose.ink) : '0')
      // Paper gradually takes on the original site's palette while remaining the same surface.
      element.style.setProperty('--paper-merge', String(pose.flatten))
    }
  })
  return <>
    <ArchiveLighting />
    <primitive object={model.scene} />
  </>
}
