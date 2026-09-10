import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Texture, type MeshStandardMaterial } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { resolveFinalHorizonImage } from '../../content/narrativeObjects'
import { phase } from './chapterTracks'
import type { ArchiveProgress } from './scrollPose'

/** One continuous photograph bends into the monitor; shares the room's GL context. */
export default function ArchiveSignal({ model, progress }: { model: GLTF; progress: ArchiveProgress }) {
  const { invalidate } = useThree()
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    picture: { value: null as Texture | null }, amount: { value: 0 }, alpha: { value: 0 }, aspect: { value: new Vector2(1, 1) },
    tl: { value: new Vector2() }, tr: { value: new Vector2() }, br: { value: new Vector2() }, bl: { value: new Vector2() },
  }), [])
  useEffect(() => {
    const image = resolveFinalHorizonImage()
    let disposed = false
    let texture: Texture | undefined
    let screenTexture: Texture | undefined
    const mesh = model.scene.getObjectByName('StackPhotoViewerSurface')
    const screen = mesh instanceof Mesh ? mesh.material as MeshStandardMaterial : null
    const previous = screen?.map
    const previousEmission = screen?.emissiveMap
    const previousScale = mesh?.scale.clone()
    new TextureLoader().load(image.src, loaded => {
      if (disposed) { loaded.dispose(); return }
      texture = loaded; loaded.colorSpace = SRGBColorSpace
      uniforms.picture.value = loaded
      if (screen && mesh instanceof Mesh) {
        screenTexture = loaded.clone(); screenTexture.flipY = false; screenTexture.needsUpdate = true
        screen.map = screenTexture; screen.emissiveMap = screenTexture; screen.needsUpdate = true
        const ratio = image.width / image.height, width = Math.min(.462, .303 * ratio), height = width / ratio
        mesh.scale.x = width / .2800138; mesh.scale.z = height / .303
      }
      invalidate()
    }, undefined, () => { /* The room and readable chapter remain available. */ })
    return () => {
      disposed = true
      if (screen) { screen.map = previous ?? null; screen.emissiveMap = previousEmission ?? null; screen.needsUpdate = true }
      if (mesh && previousScale) mesh.scale.copy(previousScale)
      texture?.dispose(); screenTexture?.dispose()
    }
  }, [model, uniforms, invalidate])
  const point = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    const values = material.current?.uniforms as typeof uniforms | undefined
    if (!values) return
    const p = progress.get()
    values.amount.value = phase(p, .04, .58)
    values.alpha.value = values.picture.value ? 1 - phase(p, .55, .62) : 0
    const data = values.picture.value?.image as { width?: number; height?: number } | undefined
    const ratio = (data?.width ?? 1) / (data?.height ?? 1)
    const width = Math.min(size.width * .70, size.height * .76 * ratio), height = width / ratio
    values.aspect.value.set(width / size.width, height / size.height)
    const screen = model.scene.getObjectByName('StackPhotoViewerSurface')
    if (screen) {
      screen.updateWorldMatrix(true, false)
      for (const [corner, x, z] of [['tl', -.1400069, -.1515], ['tr', .1400069, -.1515], ['br', .1400069, .1515], ['bl', -.1400069, .1515]] as const) {
        screen.localToWorld(point.set(x, 0, z)).project(camera); values[corner].value.set(point.x, point.y)
      }
    }
  })
  return <mesh frustumCulled={false} renderOrder={10}>
    <planeGeometry args={[2, 2, 80, 60]} />
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest={false} depthWrite={false}
      vertexShader={`
        varying vec2 imageUv;
        uniform float amount; uniform vec2 aspect;
        uniform vec2 tl; uniform vec2 tr; uniform vec2 br; uniform vec2 bl;
        void main() {
          imageUv = uv;
          vec2 start = position.xy * aspect;
          vec2 end = mix(mix(bl, br, uv.x), mix(tl, tr, uv.x), uv.y);
          vec2 point = mix(start, end, amount);
          float wave = sin(amount * 3.14159265);
          point.y += sin(uv.x * 10.0 + uv.y * 3.0 - amount * 7.0) * wave * .045;
          point.x += sin(uv.y * 8.0 + amount * 5.0) * wave * .012;
          gl_Position = vec4(point, 0.0, 1.0);
        }`}
      fragmentShader={`
        varying vec2 imageUv; uniform sampler2D picture; uniform float alpha;
        void main() { gl_FragColor = vec4(texture2D(picture, imageUv).rgb, alpha);
          #include <colorspace_fragment>
        }
      `} />
  </mesh>
}
