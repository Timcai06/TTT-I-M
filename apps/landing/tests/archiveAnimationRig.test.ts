import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  AnimationClip,
  BooleanKeyframeTrack,
  Matrix4,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three'

import {
  createArchiveAnimationRig,
  type ArchiveAnimationReadback,
} from '../src/components/personal-archive/archiveAnimationRig.ts'
import { PERSONAL_ARCHIVE_SCENE_BINDINGS } from '../src/components/personal-archive/sceneBindings.ts'
import type { SemanticWorld } from '../src/core/narrative/types.ts'

interface GltfAccessor {
  bufferView: number
  byteOffset?: number
  componentType: number
  count: number
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4'
  sparse?: unknown
}

interface GltfBufferView {
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride?: number
}

interface GltfNode {
  name?: string
  children?: number[]
  matrix?: number[]
  translation?: number[]
  rotation?: number[]
  scale?: number[]
}

interface GltfAnimation {
  name: string
  samplers: Array<{ input: number; output: number; interpolation?: string }>
  channels: Array<{ sampler: number; target: { node: number; path: 'translation' | 'rotation' | 'scale' | 'weights' } }>
}

interface GltfDocument {
  scene?: number
  scenes: Array<{ nodes?: number[] }>
  nodes: GltfNode[]
  accessors: GltfAccessor[]
  bufferViews: GltfBufferView[]
  animations: GltfAnimation[]
}

const glbBytes = readFileSync(new URL('../src/assets/personal-archive/personal-space.glb', import.meta.url))
assert.equal(glbBytes.toString('utf8', 0, 4), 'glTF')
const jsonLength = glbBytes.readUInt32LE(12)
const gltf = JSON.parse(glbBytes.subarray(20, 20 + jsonLength).toString()) as GltfDocument
const binaryHeader = 20 + jsonLength
const binaryLength = glbBytes.readUInt32LE(binaryHeader)
const binaryOffset = binaryHeader + 8
assert.ok(binaryOffset + binaryLength <= glbBytes.length)

const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 } as const
const selectedClips = new Set(PERSONAL_ARCHIVE_SCENE_BINDINGS.map(binding => binding.clip))

function accessorFloats(index: number) {
  const accessor = gltf.accessors[index]
  assert.ok(accessor)
  assert.equal(accessor.componentType, 5126, `accessor ${index} must preserve FLOAT animation data`)
  assert.equal(accessor.sparse, undefined, `accessor ${index} sparse data is unsupported by this bounded loader`)
  const view = gltf.bufferViews[accessor.bufferView]
  assert.ok(view)
  assert.equal(view.buffer, 0)
  const width = components[accessor.type]
  const stride = view.byteStride ?? width * 4
  const start = binaryOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const values = new Float32Array(accessor.count * width)
  const data = new DataView(glbBytes.buffer, glbBytes.byteOffset, glbBytes.byteLength)
  for (let item = 0; item < accessor.count; item++) {
    for (let component = 0; component < width; component++) {
      values[item * width + component] = data.getFloat32(start + item * stride + component * 4, true)
    }
  }
  return values
}

function loadActualAnimationModel() {
  const nodes = gltf.nodes.map((source, index) => {
    const node = new Object3D()
    node.name = source.name ?? `gltf-node-${index}`
    if (source.matrix) {
      new Matrix4().fromArray(source.matrix).decompose(node.position, node.quaternion, node.scale)
    } else {
      if (source.translation) node.position.fromArray(source.translation)
      if (source.rotation) node.quaternion.fromArray(source.rotation)
      if (source.scale) node.scale.fromArray(source.scale)
    }
    return node
  })
  gltf.nodes.forEach((source, index) => {
    const parent = nodes[index]
    assert.ok(parent)
    for (const childIndex of source.children ?? []) {
      const child = nodes[childIndex]
      assert.ok(child)
      parent.add(child)
    }
  })
  const scene = new Object3D()
  scene.name = 'GLBScene'
  const sceneDefinition = gltf.scenes[gltf.scene ?? 0]
  assert.ok(sceneDefinition)
  for (const rootIndex of sceneDefinition.nodes ?? []) {
    const root = nodes[rootIndex]
    assert.ok(root)
    scene.add(root)
  }

  const animations = gltf.animations.filter(animation => selectedClips.has(animation.name)).map(animation => {
    const tracks = animation.channels.map(channel => {
      const sampler = animation.samplers[channel.sampler]
      const target = nodes[channel.target.node]
      assert.ok(sampler)
      assert.ok(target)
      assert.equal(sampler.interpolation ?? 'LINEAR', 'LINEAR')
      const times = accessorFloats(sampler.input)
      const values = accessorFloats(sampler.output)
      if (channel.target.path === 'rotation') {
        return new QuaternionKeyframeTrack(`${target.name}.quaternion`, times, values)
      }
      if (channel.target.path === 'translation') {
        return new VectorKeyframeTrack(`${target.name}.position`, times, values)
      }
      if (channel.target.path === 'scale') {
        return new VectorKeyframeTrack(`${target.name}.scale`, times, values)
      }
      throw new Error(`Selected clip ${animation.name} unexpectedly targets ${channel.target.path}.`)
    })
    return new AnimationClip(animation.name, -1, tracks)
  })
  scene.updateMatrixWorld(true)
  return { scene, animations }
}

function world(values: Partial<Readonly<{
  notebook: number
  envelope: number
  photo: number
  wallPrints: number
  drawer: number
  folder: number
}>> = {}): SemanticWorld {
  return Object.freeze({
    notebook: Object.freeze({ openness: values.notebook ?? 0 }),
    envelope: Object.freeze({ openness: values.envelope ?? 0 }),
    photo: Object.freeze({ contentId: 'life-football-action', extraction: values.photo ?? 0, placement: Object.freeze({ kind: 'life' as const }) }),
    wallPrints: Object.freeze({ settling: values.wallPrints ?? 0 }),
    cabinet: Object.freeze({ drawerOpenness: values.drawer ?? 0, folderLift: values.folder ?? 0 }),
    screen: Object.freeze({ mode: 'inactive' as const }),
  })
}

const tolerances = Object.freeze({
  position: 1e-5,
  scale: 1e-6,
  quaternionAngle: 1e-5,
  actionTime: 1e-6,
  effectiveWeight: 1e-6,
  matrix: 1e-6,
})

function close(actual: number, expected: number, tolerance: number, label: string, relative = 0) {
  const limit = Math.max(tolerance, relative * Math.max(Math.abs(actual), Math.abs(expected)))
  assert.ok(Math.abs(actual - expected) <= limit, `${label}: ${actual} != ${expected} within ${limit}`)
}

function compareArrays(actual: readonly number[], expected: readonly number[], tolerance: number, label: string, relative = 0) {
  assert.equal(actual.length, expected.length, `${label} length`)
  actual.forEach((value, index) => close(value, expected[index], tolerance, `${label}[${index}]`, relative))
}

function quaternionAngle(actual: readonly number[], expected: readonly number[]) {
  const a = new Quaternion().fromArray(actual)
  const b = new Quaternion().fromArray(expected)
  return 2 * Math.acos(Math.min(1, Math.abs(a.normalize().dot(b.normalize()))))
}

function compareReadback(actual: ArchiveAnimationReadback, expected: ArchiveAnimationReadback) {
  assert.equal(actual.actions.length, 11)
  assert.equal(actual.actions.length, expected.actions.length)
  actual.actions.forEach((entry, index) => {
    const reference = expected.actions[index]
    assert.deepEqual(
      { bindingId: entry.bindingId, semanticField: entry.semanticField, clip: entry.clip, target: entry.target },
      { bindingId: reference.bindingId, semanticField: reference.semanticField, clip: reference.clip, target: reference.target },
    )
    close(entry.action.time, reference.action.time, tolerances.actionTime, `${entry.clip}.time`)
    close(entry.action.weight, reference.action.weight, tolerances.effectiveWeight, `${entry.clip}.weight`)
    close(entry.action.effectiveWeight, reference.action.effectiveWeight, tolerances.effectiveWeight, `${entry.clip}.effectiveWeight`)
    close(entry.action.timeScale, reference.action.timeScale, tolerances.effectiveWeight, `${entry.clip}.timeScale`)
    close(entry.action.effectiveTimeScale, reference.action.effectiveTimeScale, tolerances.effectiveWeight, `${entry.clip}.effectiveTimeScale`)
    assert.deepEqual(
      { enabled: entry.action.enabled, paused: entry.action.paused, loop: entry.action.loop, clamp: entry.action.clampWhenFinished },
      { enabled: reference.action.enabled, paused: reference.action.paused, loop: reference.action.loop, clamp: reference.action.clampWhenFinished },
    )
    compareArrays(entry.node.position, reference.node.position, tolerances.position, `${entry.clip}.position`)
    close(quaternionAngle(entry.node.quaternion, reference.node.quaternion), 0, tolerances.quaternionAngle, `${entry.clip}.quaternion`)
    compareArrays(entry.node.scale, reference.node.scale, tolerances.scale, `${entry.clip}.scale`)
    compareArrays(entry.node.matrixWorld, reference.node.matrixWorld, tolerances.matrix, `${entry.clip}.matrixWorld`, tolerances.matrix)
  })
}

function sampleReadback(model: ReturnType<typeof loadActualAnimationModel>, state: SemanticWorld) {
  const rig = createArchiveAnimationRig(model)
  const token = rig.claim('sample')
  const result = rig.sample(token, state)
  if (result.status !== 'applied') throw new Error(result.issues.join('\n'))
  assert.equal(result.status, 'applied')
  return { rig, readback: result.readback }
}

function snapshotBoundNodes(model: ReturnType<typeof loadActualAnimationModel>) {
  return PERSONAL_ARCHIVE_SCENE_BINDINGS.map(binding => {
    const node = model.scene.getObjectByName(binding.target.node)
    assert.ok(node)
    return {
      binding: binding.id,
      position: node.position.toArray(),
      quaternion: node.quaternion.toArray(),
      scale: node.scale.toArray(),
      matrixWorld: node.matrixWorld.toArray(),
    }
  })
}

function polluteBoundNodes(model: ReturnType<typeof loadActualAnimationModel>) {
  for (const binding of PERSONAL_ARCHIVE_SCENE_BINDINGS) {
    const node = model.scene.getObjectByName(binding.target.node)
    assert.ok(node)
    if (binding.target.property === 'translation') node.position.set(19, -7, 3)
    if (binding.target.property === 'rotation') node.quaternion.set(.2, .3, .4, .5).normalize()
  }
  model.scene.updateMatrixWorld(true)
}

void test('samples all eleven actions from real GLB hierarchy and binary animation accessors', () => {
  const model = loadActualAnimationModel()
  const state = world({ notebook: .25, envelope: .5, photo: .75, wallPrints: .4, drawer: .6, folder: .2 })
  const { rig, readback } = sampleReadback(model, state)
  assert.equal(rig.actionNames.length, 11)
  assert.equal(readback.actions.length, 11)
  assert.ok(Object.isFrozen(readback))
  assert.ok(Object.isFrozen(readback.actions))

  for (const binding of PERSONAL_ARCHIVE_SCENE_BINDINGS) {
    const entry = readback.actions.find(item => item.bindingId === binding.id)
    assert.ok(entry)
    const clip = model.animations.find(item => item.name === binding.clip)
    assert.ok(clip)
    const start = binding.sampleRange.start
    const end = binding.sampleRange.kind === 'clip-duration' ? clip.duration : binding.sampleRange.end
    const amount = binding.semanticField === 'notebook.openness' ? .25
      : binding.semanticField === 'envelope.openness' ? .5
        : binding.semanticField === 'photo.extraction' ? .75
          : binding.semanticField === 'wallPrints.settling' ? .4
            : binding.semanticField === 'cabinet.drawerOpenness' ? .6
              : .2
    close(entry.action.time, start + amount * (end - start), tolerances.actionTime, `${binding.clip}.sampleTime`)
    assert.equal(entry.action.weight, 1)
    assert.equal(entry.action.effectiveWeight, 1)
    assert.equal(entry.action.enabled, true)
    assert.equal(entry.action.paused, true)
    assert.equal(entry.action.timeScale, 1)
    assert.equal(entry.action.clampWhenFinished, true)
    assert.equal(entry.action.effectiveTimeScale, 0)
  }
  const photo = readback.actions.find(item => item.bindingId === 'life-photo-extract')
  assert.ok(photo)
  assert.notDeepEqual(photo.node.scale, [1, 1, 1])
  rig.dispose()
})

void test('matches fresh direct sampling after shuffled, reverse, legacy, and node pollution', () => {
  const reusedModel = loadActualAnimationModel()
  const reusedRig = createArchiveAnimationRig(reusedModel)
  const targets = [
    world(),
    world({ notebook: .17, envelope: .63, photo: .42, wallPrints: .51, drawer: .77, folder: .28 }),
    world({ notebook: 1, envelope: 1, photo: 1, wallPrints: 1, drawer: 1, folder: 1 }),
    world({ notebook: .17, envelope: .63, photo: .42, wallPrints: .51, drawer: .77, folder: .28 }),
    world(),
  ]

  for (const [targetIndex, state] of targets.entries()) {
    const legacy = reusedRig.claim('legacy')
    reusedRig.actionNames.forEach((clip, index) => reusedRig.seekLegacy(legacy, clip, ((targetIndex + index) % 7) / 6))
    reusedRig.evaluateLegacy(legacy)
    polluteBoundNodes(reusedModel)
    const sample = reusedRig.claim('sample')
    const result = reusedRig.sample(sample, state)
    if (result.status !== 'applied') throw new Error(result.issues.join('\n'))
    assert.equal(result.status, 'applied')

    const freshModel = loadActualAnimationModel()
    const fresh = sampleReadback(freshModel, state)
    compareReadback(result.readback, fresh.readback)
    fresh.rig.dispose()
  }
  reusedRig.dispose()
})

void test('disables undeclared legacy-prefix actions for sample ownership and restores them for legacy', () => {
  const model = loadActualAnimationModel()
  const notebookHinge = model.scene.getObjectByName('NotebookHinge')
  assert.ok(notebookHinge)
  const origin = notebookHinge.position.toArray()
  const displaced = [origin[0] + 4, origin[1] - 3, origin[2] + 2]
  const extraClip = new AnimationClip('NotebookOpenLegacyExtra', 1, [
    new VectorKeyframeTrack('NotebookHinge.position', [0, 1], [...origin, ...displaced]),
  ])
  model.animations.push(extraClip)
  const rig = createArchiveAnimationRig(model)
  assert.equal(rig.actionNames.includes(extraClip.name), true)

  const legacy = rig.claim('legacy')
  rig.actionNames.forEach(clip => rig.seekLegacy(legacy, clip, clip === extraClip.name ? 1 : 0))
  rig.evaluateLegacy(legacy)
  const legacyPosition = notebookHinge.position.toArray()
  assert.notDeepEqual(legacyPosition, origin)

  const state = world({ notebook: .38, envelope: .29, photo: .73, wallPrints: .46, drawer: .81, folder: .12 })
  const sample = rig.claim('sample')
  const sampled = rig.sample(sample, state)
  if (sampled.status !== 'applied') throw new Error(sampled.issues.join('\n'))
  assert.equal(sampled.status, 'applied')
  const fresh = sampleReadback(loadActualAnimationModel(), state)
  compareReadback(sampled.readback, fresh.readback)

  const returnedLegacy = rig.claim('legacy')
  rig.actionNames.forEach(clip => rig.seekLegacy(returnedLegacy, clip, clip === extraClip.name ? 1 : 0))
  rig.evaluateLegacy(returnedLegacy)
  assert.notDeepEqual(notebookHinge.position.toArray(), sampled.readback.actions[0].node.position)

  fresh.rig.dispose()
  rig.dispose()
})

void test('rejects missing and unknown static inputs before any partial sample write', () => {
  const missingModel = loadActualAnimationModel()
  missingModel.animations = missingModel.animations.filter(clip => clip.name !== 'NotebookOpen')
  const missingRig = createArchiveAnimationRig(missingModel)
  const missingToken = missingRig.claim('sample')
  const missingBefore = snapshotBoundNodes(missingModel)
  const missingResult = missingRig.sample(missingToken, world({ notebook: 1, envelope: 1, photo: 1, wallPrints: 1, drawer: 1, folder: 1 }))
  assert.equal(missingResult.status, 'unavailable')
  assert.ok(missingResult.status === 'unavailable' && missingResult.issues.some(issue => issue.includes('missing-clip')))
  assert.deepEqual(snapshotBoundNodes(missingModel), missingBefore)
  missingRig.dispose()

  const unknownModel = loadActualAnimationModel()
  const notebook = unknownModel.animations.find(clip => clip.name === 'NotebookOpen')
  assert.ok(notebook)
  notebook.tracks.push(new BooleanKeyframeTrack('NotebookHinge.visible', [0, 1], [true, false]))
  const unknownRig = createArchiveAnimationRig(unknownModel)
  const unknownToken = unknownRig.claim('sample')
  const unknownBefore = snapshotBoundNodes(unknownModel)
  const unknownResult = unknownRig.sample(unknownToken, world({ notebook: 1, envelope: 1 }))
  assert.equal(unknownResult.status, 'unavailable')
  assert.ok(unknownResult.status === 'unavailable' && unknownResult.issues.some(issue => issue.includes('NotebookHinge.visible')))
  assert.deepEqual(snapshotBoundNodes(unknownModel), unknownBefore)
  unknownRig.dispose()
})

void test('invalidates stale and disposed tokens and restores canonical legacy action configuration', () => {
  const model = loadActualAnimationModel()
  const rig = createArchiveAnimationRig(model)
  const firstLegacy = rig.claim('legacy')
  rig.actionNames.forEach((clip, index) => rig.seekLegacy(firstLegacy, clip, index / 10))
  rig.evaluateLegacy(firstLegacy)
  const sample = rig.claim('sample')
  const staleBefore = snapshotBoundNodes(model)
  assert.throws(() => rig.seekLegacy(firstLegacy, rig.actionNames[0], 1), /stale/)
  assert.throws(() => rig.evaluateLegacy(firstLegacy), /stale/)
  assert.deepEqual(snapshotBoundNodes(model), staleBefore)

  const sampled = rig.sample(sample, world({ notebook: .8, envelope: .7, photo: .6, wallPrints: .5, drawer: .4, folder: .3 }))
  assert.equal(sampled.status, 'applied')
  const returnedLegacy = rig.claim('legacy')
  rig.actionNames.forEach((clip, index) => rig.seekLegacy(returnedLegacy, clip, (index % 5) / 4))
  rig.evaluateLegacy(returnedLegacy)
  const returned = rig.readback()

  const freshModel = loadActualAnimationModel()
  const freshRig = createArchiveAnimationRig(freshModel)
  const freshLegacy = freshRig.claim('legacy')
  freshRig.actionNames.forEach((clip, index) => freshRig.seekLegacy(freshLegacy, clip, (index % 5) / 4))
  freshRig.evaluateLegacy(freshLegacy)
  compareReadback(returned, freshRig.readback())
  assert.ok(returned.actions.every(entry => (
    entry.action.enabled && entry.action.paused && entry.action.weight === 1 && entry.action.timeScale === 1
  )))

  rig.dispose()
  assert.throws(() => rig.sample(sample, world({ notebook: 1 })), /disposed/)
  assert.throws(() => rig.seekLegacy(returnedLegacy, rig.actionNames[0], 0), /disposed/)
  freshRig.dispose()
})

void test('keeps one runtime-owned mixer and uses the semantic chain in production and clearance diagnostics', () => {
  const director = readFileSync(new URL('../src/components/personal-archive/archiveDirector.ts', import.meta.url), 'utf8')
  const runtime = readFileSync(new URL('../src/components/personal-archive/archiveRuntime.ts', import.meta.url), 'utf8')
  const rig = readFileSync(new URL('../src/components/personal-archive/archiveAnimationRig.ts', import.meta.url), 'utf8')
  const clearance = readFileSync(new URL('../src/lab/personal-space/archiveClearance.ts', import.meta.url), 'utf8')
  assert.equal([director, runtime, rig].join('\n').match(/new AnimationMixer\(/g)?.length, 1)
  assert.doesNotMatch(director, /AnimationMixer|clipAction\(/)
  assert.equal(runtime.match(/createArchiveAnimationRig\(model\)/g)?.length, 1)
  const execution = readFileSync(new URL('../src/components/personal-archive/archiveExecution.ts', import.meta.url), 'utf8')
  assert.match(runtime, /createArchiveExecution\(model.scene, animationRig\)/)
  assert.match(execution, /rig.claim\(next\)/)
  assert.doesNotMatch(execution, /new AnimationMixer|clipAction\(/)
  assert.doesNotMatch(runtime, /createArchiveDirector|execution\.legacy|navigationPlan|navigationPose/)
  assert.match(clearance, /createArchiveAnimationRig\(model\)/)
  assert.match(clearance, /execution\.begin\('sample'/)
  assert.match(clearance, /sampleStory/)
  assert.match(clearance, /solveArchiveCamera/)
  assert.match(clearance, /finally \{[\s\S]*animationRig\.dispose\(\)/)
  const draw = runtime.slice(runtime.indexOf('function drawSample('), runtime.indexOf('function drawActive('))
  assert.ok(draw.indexOf('composer.render()') < draw.indexOf('if (shaderFailure) throw shaderFailure'))
  assert.ok(draw.indexOf('if (shaderFailure) throw shaderFailure') < draw.indexOf("kind: 'sample-committed'"))
})
