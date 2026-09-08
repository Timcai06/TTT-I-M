import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, PMREMGenerator, PCFSoftShadowMap, Object3D, type WebGLRenderer, type Scene } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

function installLighting(gl: WebGLRenderer, scene: Scene) {
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const environment = generator.fromScene(room, .05)
    const previous = { environment: scene.environment, intensity: scene.environmentIntensity, exposure: gl.toneMappingExposure, mapping: gl.toneMapping }
    scene.environment = environment.texture
    scene.environmentIntensity = .42
    gl.toneMapping = ACESFilmicToneMapping
    gl.toneMappingExposure = 1.1
    gl.shadowMap.type = PCFSoftShadowMap
    room.dispose(); generator.dispose()
    return () => {
      scene.environment = previous.environment; scene.environmentIntensity = previous.intensity
      gl.toneMapping = previous.mapping; gl.toneMappingExposure = previous.exposure
      environment.dispose()
    }
}

export default function ArchiveLighting() {
  const { gl, scene, invalidate } = useThree()
  const lampTarget = useMemo(() => new Object3D(), [])
  useEffect(() => {
    const dispose = installLighting(gl, scene)
    invalidate()
    return dispose
  }, [gl, scene, invalidate])
  return <>
    <color attach="background" args={['#171612']} />
    <ambientLight intensity={.18} />
    <hemisphereLight args={['#dce6ef', '#483227', .65]} />
    <directionalLight position={[-3, 4, 1]} intensity={2.5} color="#e4edf3" castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-3} shadow-camera-right={3}
      shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={.1}
      shadow-camera-far={12} shadow-normalBias={.002} shadow-bias={-.0001} />
    <primitive object={lampTarget} position={[.6, .8, -.8]} />
    <spotLight position={[1, 1.36, -1.14]} target={lampTarget} intensity={2.8} angle={.9} penumbra={1} distance={2.4} color="#ffd39a" />
    <pointLight position={[0, 2.5, .4]} intensity={.8} distance={5} color="#e8dfd3" />
  </>
}
