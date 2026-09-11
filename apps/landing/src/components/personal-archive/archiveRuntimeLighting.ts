import { AgXToneMapping, Color, DirectionalLight, HemisphereLight, Object3D, PCFSoftShadowMap, PMREMGenerator, PointLight, SpotLight, type Scene, type WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/**
 * Ambient levels after the bake landed.
 *
 * These two terms were raised to .52 and .58 when the room had exactly one baked
 * indirect map and everything else was lit purely in realtime — the old comment
 * here said so: ".38 left the shadow side almost unlit, which reads as a flat
 * model more than as dark." That was a compensation for a missing bake.
 *
 * The bake now exists. 37 of 54 materials carry archive_lightmap_version 2,
 * covering 107,367 of the room's 114,365 triangles — 93.9% of its surface — and
 * archiveBakedIrradiance adds that irradiance after AO so the Cycles bounce keeps
 * its own visibility. The 17 without a bake are the monitor UI, the lamp bulb, the
 * glass and the panorama, which are emissive or transparent and want no indirect
 * light at all.
 *
 * So the shadow side was being filled twice: once by a bake that knows what is
 * occluded, and once by two omnidirectional terms that do not. Sunrise is defined
 * by dynamic range — a bright opening, long raking shafts, everything else falling
 * away — and an unearned fill is exactly what flattens it.
 *
 * The environment keeps a real job: specular response is what makes ceramic,
 * hardware and glass read as material, and three scales diffuse and specular
 * together, so this cannot go to zero. The hemisphere has no such job — it is pure
 * visibility-free diffuse, the most redundant term in the rig — so it comes down
 * hardest and stays only to tint the unbaked props with the sky/ground split.
 */
const ENVIRONMENT_INTENSITY = .26
const HEMISPHERE_INTENSITY = .16

export function createArchiveLighting(renderer: WebGLRenderer, scene: Scene) {
  // Sunrise. The key was a high-ish 23-degree warm white; dawn light arrives almost
  // flat and much more saturated, which is what produces long raking shadows and a
  // warm/cool split across the room. AgX stays - it is the tone curve that keeps a
  // low, strong, orange key from clipping to white.
  renderer.toneMapping = AgXToneMapping; renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap
  scene.background = new Color('#c6a583')
  const makeEnvironment = () => {
    const generator = new PMREMGenerator(renderer), room = new RoomEnvironment()
    // .05 asked for 25 blur samples against a 20-sample maximum, so three clipped it
    // and logged a warning on every build of the environment. The requested blur was
    // never the blur being applied; .04 is the largest sigma the generator actually
    // honours here.
    try { return generator.fromScene(room, .04) }
    finally { room.dispose(); generator.dispose() }
  }
  let environment = makeEnvironment()
  scene.environment = environment.texture; scene.environmentIntensity = ENVIRONMENT_INTENSITY
  // Dawn sky is colder and the ground bounce warmer than midday; the split is what
  // makes the hour readable.
  const fill = new HemisphereLight('#9fb8d2', '#8a5f34', HEMISPHERE_INTENSITY)
  const window = new DirectionalLight('#ffb570', 2.75)
  // ~11 degrees of elevation instead of ~23. The long shadows come from the angle,
  // not from the shadow settings.
  window.position.set(4.1, 1.95, -5.4); window.target.position.set(0, .85, -.8)
  window.castShadow = true; window.shadow.mapSize.set(4096, 4096)
  Object.assign(window.shadow.camera, { left: -2.8, right: 2.8, top: 2.8, bottom: -2.8, near: .1, far: 12 })
  window.shadow.normalBias = .004; window.shadow.bias = -.00008
  // The sun is the protagonist at this hour. With the ambient terms down the desk
  // lamp became the brightest thing in the room, which reads as evening rather than
  // dawn; it is still on, just no longer competing with the window.
  const task = new SpotLight('#ffd09a', 1.9, 2.5, .85, 1, 2)
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
