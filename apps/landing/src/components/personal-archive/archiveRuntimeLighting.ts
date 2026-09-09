import { AgXToneMapping, Color, DirectionalLight, HemisphereLight, Object3D, PCFSoftShadowMap, PMREMGenerator, PointLight, SpotLight, type Scene, type WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export function createArchiveLighting(renderer: WebGLRenderer, scene: Scene) {
  renderer.toneMapping = AgXToneMapping; renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap
  scene.background = new Color('#b9aea0')
  const makeEnvironment = () => {
    const generator = new PMREMGenerator(renderer), room = new RoomEnvironment()
    try { return generator.fromScene(room, .05) }
    finally { room.dispose(); generator.dispose() }
  }
  let environment = makeEnvironment()
  scene.environment = environment.texture; scene.environmentIntensity = .38
  const fill = new HemisphereLight('#c7d4df', '#735539', .52)
  const window = new DirectionalLight('#ffe1b2', 2.2)
  window.position.set(3.5, 3.2, -5); window.target.position.set(0, .85, -.8)
  window.castShadow = true; window.shadow.mapSize.set(4096, 4096)
  Object.assign(window.shadow.camera, { left: -2.8, right: 2.8, top: 2.8, bottom: -2.8, near: .1, far: 12 })
  window.shadow.normalBias = .004; window.shadow.bias = -.00008
  const task = new SpotLight('#ffd09a', 2.6, 2.5, .85, 1, 2)
  task.position.set(1, 1.381, -1.14); task.target = new Object3D(); task.target.position.set(.63, .83, -.84)
  task.castShadow = true; task.shadow.mapSize.set(2048, 2048); task.shadow.normalBias = .003; task.shadow.bias = -.00008
  task.shadow.camera.near = .05; task.shadow.camera.far = 2.5
  const shelf = new PointLight('#f6c58e', .08, 1.5, 2); shelf.position.set(.3, 2.37, -1.31)
  scene.add(fill, window, window.target, task, task.target, shelf)
  return {
    restore() {
      environment.dispose(); environment = makeEnvironment()
      scene.environment = environment.texture
    },
    dispose() { window.dispose(); task.dispose(); environment.dispose() },
  }
}
