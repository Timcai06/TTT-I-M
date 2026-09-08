import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { AnimationMixer, LoopOnce, Mesh, PerspectiveCamera, Vector3, type AnimationAction } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import cameras from '../../assets/personal-archive/cameras.json'

interface Props {
  model: GLTF
  opened: boolean
  reducedMotion: boolean
  onOpen: () => void
  onSettled: (opened: boolean) => void
}

export default function SpaceScene({ model, opened, reducedMotion, onOpen, onSettled }: Props) {
  const { invalidate } = useThree()
  const progress = useRef(0)
  const settled = useRef<boolean | null>(null)
  const lookAt = useMemo(() => new Vector3(), [])
  const views = useMemo(() => Object.fromEntries(Object.entries(cameras).map(([name, view]) => [name, {
    position: new Vector3().fromArray(view.position), target: new Vector3().fromArray(view.target), fov: view.fov,
  }])), [])
  const rig = useRef<{ mixer: AnimationMixer; action: AnimationAction; duration: number } | null>(null)
  useEffect(() => {
    model.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    const mixer = new AnimationMixer(model.scene)
    const clip = model.animations.find((item) => item.name === 'NotebookOpen')
    if (!clip) throw new Error('NotebookOpen animation is missing')
    const action = mixer.clipAction(clip)
    action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    action.paused = true
    rig.current = { mixer, action, duration: clip.duration }
    invalidate()
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model.scene); rig.current = null }
  }, [model, invalidate])

  useEffect(() => { invalidate() }, [opened, reducedMotion, invalidate])
  useEffect(() => {
    const resume = () => { if (!document.hidden) invalidate() }
    document.addEventListener('visibilitychange', resume)
    return () => document.removeEventListener('visibilitychange', resume)
  }, [invalidate])

  useFrame(({ camera, size }, delta) => {
    if (document.hidden || !rig.current) return
    const destination = opened ? 1 : 0
    const step = Math.min(delta, 0.05) / 1.65
    progress.current = reducedMotion ? destination : opened
      ? Math.min(1, progress.current + step) : Math.max(0, progress.current - step)
    const p = progress.current
    const t = p * p * (3 - 2 * p)
    const home = size.width < 700 ? views.mobile! : views.entrance!
    const close = views.about!
    camera.position.lerpVectors(home.position, close.position, t)
    lookAt.lerpVectors(home.target, close.target, t)
    camera.lookAt(lookAt)
    if (camera instanceof PerspectiveCamera) {
      // Portrait needs a wider view; the reading panel occupies the lower half.
      camera.fov = home.fov + (close.fov - home.fov) * t + (size.width < 700 ? 12 : 0)
      camera.updateProjectionMatrix()
    }
    rig.current.action.time = Math.max(0, Math.min(1, (p - 0.45) / 0.55)) * rig.current.duration
    rig.current.mixer.update(0)
    if (p !== destination) invalidate()
    else if (settled.current !== opened) { settled.current = opened; onSettled(opened) }
  })

  const selectBook = (event: ThreeEvent<MouseEvent>) => {
    let object = event.object
    while (object) {
      if (object.name.startsWith('Notebook')) { event.stopPropagation(); onOpen(); return }
      if (!object.parent) return
      object = object.parent
    }
  }

  return <>
    <color attach="background" args={['#000000']} />
    <ambientLight intensity={0.22} />
    <hemisphereLight args={['#dce6ef', '#4e392a', 0.55]} />
    <directionalLight position={[-3, 4, 1]} intensity={2.1} color="#e4edf3" castShadow
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3}
      shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.1}
      shadow-camera-far={12} shadow-normalBias={0.012} />
    <pointLight position={[1, 1.38, -1.14]} intensity={1.5} distance={2.3} color="#ffc783" />
    <primitive object={model.scene} onClick={selectBook} />
  </>
}
