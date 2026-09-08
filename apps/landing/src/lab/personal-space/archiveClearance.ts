// Geometry-only diagnostic used by the local browser regression runner.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PerspectiveCamera, Raycaster, Vector2 } from 'three'
import modelUrl from '../../assets/personal-archive/personal-space.glb?url'
import { createArchiveDirector, type SpatialShot } from '../../components/personal-archive/archiveDirector'
export async function inspectCameraClearance() {
  const model = await new GLTFLoader().loadAsync(modelUrl)
  const camera = new PerspectiveCamera(40, 1.6, .01, 30), director = createArchiveDirector(model, camera)
  const ray = new Raycaster(), cursor = new Vector2(), close: unknown[] = []
  const tracks: SpatialShot[] = ['entry', 'about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']
  for (const track of tracks) for (let i = 0; i <= 100; i++) {
    const p = i / 100
    director.pose(track, p, null)
    let nearest = Infinity, name = ''
    for (const x of [-.75, 0, .75]) for (const y of [-.75, 0, .75]) {
      ray.setFromCamera(cursor.set(x, y), camera)
      const hit = ray.intersectObjects(model.scene.children, true).find(hit => {
        for (let node = hit.object; node; node = node.parent!) if (!node.visible) return false
        return true
      })
      if (hit && hit.distance < nearest) { nearest = hit.distance; name = hit.object.name }
    }
    if (nearest < .10) close.push({ track, p, distance: nearest, name, camera: camera.position.toArray() })
  }
  director.dispose()
  return close
}
