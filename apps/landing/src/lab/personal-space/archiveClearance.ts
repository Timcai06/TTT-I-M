// Geometry-only diagnostic used by the local browser regression runner.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2 } from 'three'
import modelUrl from '../../assets/personal-archive/personal-space.glb?url'
import { createArchiveAnimationRig } from '../../components/personal-archive/archiveAnimationRig'
import { createArchiveExecution } from '../../components/personal-archive/archiveExecution'
import { solveArchiveCamera, applyArchiveCamera } from '../../components/personal-archive/archiveCameraRig'
import { addContactReadingPlane } from '../../components/personal-archive/readingFrame'
import { sampleStory } from '../../core/narrative/sampleStory'
import { PERSONAL_ARCHIVE_SAMPLE_STORY } from '../../core/narrative/specs'
import type { SampleSegment } from '../../core/narrative/types'
export async function inspectCameraClearance() {
  const diagnosticMaterial = new MeshBasicMaterial()
  const model = await new GLTFLoader().register(() => ({
    name: 'ARCHIVE_GEOMETRY_ONLY',
    loadMaterial: () => Promise.resolve(diagnosticMaterial),
  })).loadAsync(modelUrl)
  const animationRig = createArchiveAnimationRig(model)
  const removeContactPlane = addContactReadingPlane(model.scene)
  const execution = createArchiveExecution(model.scene, animationRig)
  const camera = new PerspectiveCamera(40, 1.6, .01, 30)
  const ray = new Raycaster(), cursor = new Vector2(), close: unknown[] = []
  const tracks: SampleSegment[] = ['entry', 'about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']
  try {
    for (const track of tracks) for (let i = 0; i <= 100; i++) {
      const p = i / 100
      const story = sampleStory({ position:{ segment:track, progress:p }, storyVersion:PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion, contentVersion:PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion })
      const world = execution.sample(execution.begin('sample', 'foreground', 0, 0), story)
      applyArchiveCamera(camera, solveArchiveCamera(story, world.anchors, { width:1600, height:1000 }))
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
    return close
  } finally {
    execution.dispose()
    animationRig.dispose()
    removeContactPlane()
    diagnosticMaterial.dispose()
  }
}
