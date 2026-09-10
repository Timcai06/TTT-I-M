import test from 'node:test'
import assert from 'node:assert/strict'
import { AnimationClip, Object3D, Mesh, MeshBasicMaterial, PlaneGeometry, Float32BufferAttribute, Texture, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three'
import { createArchiveExecution } from '../src/components/personal-archive/archiveExecution.ts'
import { createArchiveAnimationRig } from '../src/components/personal-archive/archiveAnimationRig.ts'
import { PERSONAL_ARCHIVE_REQUIRED_OBJECTS, PERSONAL_ARCHIVE_SCENE_BINDINGS } from '../src/components/personal-archive/sceneBindings.ts'
import { sampleStory } from '../src/core/narrative/sampleStory.ts'
import { PERSONAL_ARCHIVE_SAMPLE_STORY as spec } from '../src/core/narrative/specs.ts'
function fixture() {
  const scene = new Object3D()
  const map = new Texture({ width: 2, height: 2 })
  const nodes = new Map<string, Object3D>()
  for (const item of PERSONAL_ARCHIVE_REQUIRED_OBJECTS) {
    const node = ['LifeMemoryPhoto', 'Life_PhotoPaper', 'ArchivePhoto_04', 'PhotoMount_04'].includes(item.name) ? new Mesh(new PlaneGeometry(1,1), new MeshBasicMaterial({ map })) : new Object3D()
    if (node instanceof Mesh && item.name === 'PhotoMount_04') {
      const geometry=(node as Mesh).geometry
      const position=Array.from(geometry.getAttribute('position').array),uv=Array.from(geometry.getAttribute('uv').array)
      geometry.setAttribute('position',new Float32BufferAttribute([...position,...position.map((v,i)=>i%3===2?v-.001:v)],3))
      geometry.setAttribute('uv',new Float32BufferAttribute([...uv,...uv],2))
      geometry.setIndex([0,2,1,2,3,1,4,5,6,6,5,7])
    }
    node.name = item.name; nodes.set(item.name, node); scene.add(node)
  }
  for (const item of PERSONAL_ARCHIVE_REQUIRED_OBJECTS) if (item.parent) nodes.get(item.parent)?.add(nodes.get(item.name)!)
  for (const suffix of ['TL', 'TR', 'BR', 'BL']) {
    const corner = new Object3D()
    corner.name = `ContactReading_${suffix}`
    scene.add(corner)
  }
  const animations = PERSONAL_ARCHIVE_SCENE_BINDINGS.map(binding => new AnimationClip(binding.clip, 4, [binding.target.property === 'rotation'
    ? new QuaternionKeyframeTrack(`${binding.target.node}.quaternion`, [0, 4], [0,0,0,1,0,0,1,0])
    : new VectorKeyframeTrack(`${binding.target.node}.position`, [0,4], [0,0,0,1,1,1])]))
  const rig = createArchiveAnimationRig({ scene, animations })
  return { scene, rig, execution: createArchiveExecution(scene, rig) }
}
const frame = sampleStory({ position: { segment: 'frame-reading', progress: 0 }, storyVersion: spec.storyVersion, contentVersion: spec.contentVersion })
void test('same-owner request/layout/preparation permits invalidate old writes and resource loss invalidates all', () => {
  const { execution, rig } = fixture()
  const first = execution.begin('sample', 'foreground', 1, 1)
  const second = execution.begin('sample', 'foreground', 2, 1)
  assert.throws(() => execution.sample(first, frame), /Stale/)
  const third = execution.begin('sample', 'foreground', 2, 2)
  assert.throws(() => execution.sample(second, frame), /Stale/)
  const prepare = execution.begin('sample', 'prepare', 2, 2)
  assert.throws(() => execution.sample(third, frame), /Stale/)
  execution.invalidate(true)
  assert.throws(() => execution.sample(prepare, frame), /Stale/)
  execution.dispose(); rig.dispose()
})
void test('applies continuous photo carriers and monitors with real rig actions; rejects missing dependency before write', () => {
  const { execution, rig, scene } = fixture()
  const result = execution.sample(execution.begin('sample', 'foreground', 1, 1), frame)
  assert.equal(result.animation.actions.length, 11)
  assert.equal(result.transferGeometryApplied, true)
  assert.equal(result.nodes.length, 38)
  assert.deepEqual(['LifeMemoryPhoto', 'Life_PhotoPaper', 'ArchivePhoto_04', 'PhotoMount_04', 'MonitorState_project', 'MonitorState_photo'].map(name => result.nodes.find(n => n.name === name)?.visible), [false, false, true, true, false, false])
  scene.getObjectByName('PhotoMount_04')!.removeFromParent()
  const before = rig.readback()
  assert.throws(() => execution.sample(execution.begin('sample', 'foreground', 2, 1), frame), /PhotoMount_04/)
  assert.deepEqual(rig.readback().actions, before.actions)
  execution.dispose(); rig.dispose()
})

void test('publishes Final Horizon only on the photo monitor from Frame to Stack onward', () => {
  const { execution, rig } = fixture()
  const before = sampleStory({ position: { segment: 'frame-stack', progress: .03 }, storyVersion: spec.storyVersion, contentVersion: spec.contentVersion })
  const inactive = execution.sample(execution.begin('sample', 'foreground', 1, 1), before)
  assert.equal(inactive.nodes.find(node => node.name === 'MonitorState_photo')?.visible, false)
  const stack = sampleStory({ position: { segment: 'stack-reading', progress: .5 }, storyVersion: spec.storyVersion, contentVersion: spec.contentVersion })
  const active = execution.sample(execution.begin('sample', 'foreground', 2, 1), stack)
  assert.equal(active.nodes.find(node => node.name === 'MonitorState_project')?.visible, false)
  assert.equal(active.nodes.find(node => node.name === 'MonitorState_photo')?.visible, true)
  assert.equal(active.nodes.find(node => node.name === 'ArchivePhoto_04')?.visible, true)
  execution.dispose(); rig.dispose()
})

void test('applies the full Work and Contact world without history floors', () => {
  const { execution, rig } = fixture()
  const at = (segment: 'stack-work' | 'work-reading' | 'work-contact' | 'contact-reading', progress: number) => {
    const story = sampleStory({ position:{ segment, progress }, storyVersion:spec.storyVersion, contentVersion:spec.contentVersion })
    return execution.sample(execution.begin('sample', 'foreground', 1, 1), story)
  }
  assert.equal(at('stack-work', 0).animation.actions.length, 11)
  assert.deepEqual(at('work-reading', .5).nodes.filter(node => ['WorkDrawerRoot','WorkFolderPivot'].includes(node.name)).map(node => node.name), ['WorkDrawerRoot','WorkFolderPivot'])
  const contact = at('contact-reading', .5)
  assert.equal(contact.anchors.WorkReading?.length, 4)
  assert.equal(contact.anchors.ContactReading?.length, 4)
  assert.equal(contact.nodes.find(node => node.name === 'MonitorState_photo')?.visible, true)
  execution.dispose(); rig.dispose()
})
