import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  inspectSceneBindings,
  PERSONAL_ARCHIVE_REQUIRED_OBJECTS,
  PERSONAL_ARCHIVE_SCENE_BINDINGS,
} from '../src/components/personal-archive/sceneBindings.ts'
import type {
  SceneBindingDefinition,
  StaticSceneDescription,
} from '../src/components/personal-archive/sceneBindings.ts'

interface GltfModel {
  nodes: Array<{ name?: string; children?: number[] }>
  accessors: Array<{ min?: number[]; max?: number[] }>
  animations: Array<{
    name: string
    samplers: Array<{ input: number }>
    channels: Array<{ sampler: number; target: { node: number; path: string } }>
  }>
}

function readGlbScene(): Readonly<{
  scene: StaticSceneDescription
  firstKeyByAnimation: ReadonlyMap<string, number | null>
}> {
  const bytes = readFileSync(process.env.ARCHIVE_MODEL_PATH ?? new URL('../src/assets/personal-archive/personal-space.glb', import.meta.url))
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const jsonLength = bytes.readUInt32LE(12)
  const model = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as GltfModel
  const parentByChild = new Map<number, string>()
  model.nodes.forEach((node, parentIndex) => {
    for (const child of node.children ?? []) parentByChild.set(child, model.nodes[parentIndex]?.name ?? '')
  })
  const firstKeyByAnimation = new Map<string, number | null>()
  const animations = model.animations.map(animation => {
    const timeAccessors = animation.samplers.map(sampler => model.accessors[sampler.input])
    const firstKeys = timeAccessors.flatMap(accessor => accessor?.min?.[0] ?? [])
    const lastKeys = timeAccessors.flatMap(accessor => accessor?.max?.[0] ?? [])
    firstKeyByAnimation.set(animation.name, firstKeys.length > 0 ? Math.min(...firstKeys) : null)
    return {
      name: animation.name,
      duration: lastKeys.length > 0 ? Math.max(...lastKeys) : null,
      channels: animation.channels.map(channel => ({
        node: model.nodes[channel.target.node]?.name ?? '',
        property: channel.target.path,
      })),
    }
  })
  return {
    scene: {
      nodes: model.nodes.flatMap((node, index) => node.name
        ? [{ name: node.name, parent: parentByChild.get(index) ?? null }]
        : []),
      animations,
    },
    firstKeyByAnimation,
  }
}

function issueCodes(scene: StaticSceneDescription, definitions = PERSONAL_ARCHIVE_SCENE_BINDINGS) {
  return inspectSceneBindings(scene, definitions).issues.map(item => item.code)
}

function replaceBinding(
  id: string,
  update: (binding: SceneBindingDefinition) => SceneBindingDefinition,
): SceneBindingDefinition[] {
  return PERSONAL_ARCHIVE_SCENE_BINDINGS.map(item => item.id === id ? update(item) : item)
}

void test('the real GLB covers all eleven semantic channels and required sample objects', () => {
  const { scene, firstKeyByAnimation } = readGlbScene()
  const inspection = inspectSceneBindings(scene)

  assert.deepEqual(PERSONAL_ARCHIVE_SCENE_BINDINGS.map(item => [
    item.semanticField,
    item.clip,
    item.target.node,
    item.target.property,
  ]), [
    ['notebook.openness', 'NotebookOpen', 'NotebookHinge', 'rotation'],
    ['envelope.openness', 'LifeEnvelopeOpen', 'LifeEnvelopeHinge', 'rotation'],
    ['photo.extraction', 'LifePhotoExtract', 'LifeMemoryPhoto', 'translation'],
    ['wallPrints.settling', 'FramePrintSettle_04', 'FramePrintPivot', 'rotation'],
    ['wallPrints.settling', 'FramePrintSettle_01', 'FramePrintPivot_01', 'rotation'],
    ['wallPrints.settling', 'FramePrintSettle_02', 'FramePrintPivot_02', 'rotation'],
    ['wallPrints.settling', 'FramePrintSettle_03', 'FramePrintPivot_03', 'rotation'],
    ['cabinet.drawerOpenness', 'WorkDrawerOpen', 'WorkDrawerRoot', 'translation'],
    ['cabinet.drawerOpenness', 'CinemaRailTravel_Left', 'Cinema_RailMiddle_Left', 'translation'],
    ['cabinet.drawerOpenness', 'CinemaRailTravel_Right', 'Cinema_RailMiddle_Right', 'translation'],
    ['cabinet.folderLift', 'WorkFolderLift', 'WorkFolderPivot', 'translation'],
  ])
  assert.equal(inspection.status, 'valid')
  assert.equal(inspection.coverage.length, 11)
  assert.ok(inspection.coverage.every(item => item.status === 'covered'))
  assert.equal(inspection.requiredObjects.length, PERSONAL_ARCHIVE_REQUIRED_OBJECTS.length)
  assert.ok(inspection.requiredObjects.every(item => item.status === 'present'))
  assert.deepEqual(PERSONAL_ARCHIVE_REQUIRED_OBJECTS.filter(item => item.name.startsWith('WorkReading_')).map(item => item.name), ['WorkReading_TL','WorkReading_TR','WorkReading_BR','WorkReading_BL'])
  assert.equal(PERSONAL_ARCHIVE_REQUIRED_OBJECTS.some(item => item.name.startsWith('ContactReading_')), false)
  assert.deepEqual(inspection.issues, [])
  assert.deepEqual(inspection.actionReadback, {
    status: 'unavailable',
    reason: 'static-metadata-only',
  })

  const notebook = inspection.coverage.find(item => item.bindingId === 'notebook-open')
  assert.equal(firstKeyByAnimation.get('NotebookOpen'), 1 / 30)
  assert.equal(notebook?.sampleStart, 0)
  assert.equal(notebook?.sampleEnd, 25 / 30)
  const drawer = inspection.coverage.find(item => item.bindingId === 'work-drawer-open')
  assert.equal(drawer?.sampleStart, 1)
  assert.equal(drawer?.sampleEnd, 2.4)
  const folder = inspection.coverage.find(item => item.bindingId === 'work-folder-lift')
  assert.equal(folder?.sampleStart, 74 / 30)
  assert.equal(folder?.sampleEnd, 110 / 30)
})

void test('detects missing, renamed, target, property, and unknown binding failures', () => {
  const { scene } = readGlbScene()
  const withoutNotebook = {
    ...scene,
    animations: scene.animations.filter(animation => animation.name !== 'NotebookOpen'),
  }
  assert.ok(issueCodes(withoutNotebook).includes('missing-clip'))

  const renamedNotebook = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, name: 'NotebookOpenRenamed' }
      : animation),
  }
  assert.ok(issueCodes(renamedNotebook).includes('clip-name-mismatch'))

  const wrongTarget = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, channels: animation.channels.map(() => ({ node: 'LifeEnvelopeHinge', property: 'rotation' })) }
      : animation),
  }
  assert.ok(issueCodes(wrongTarget).includes('target-mismatch'))

  const wrongProperty = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, channels: animation.channels.map(channel => ({ ...channel, property: 'translation' })) }
      : animation),
  }
  assert.ok(issueCodes(wrongProperty).includes('property-mismatch'))

  assert.ok(issueCodes(scene, PERSONAL_ARCHIVE_SCENE_BINDINGS.slice(1)).includes('missing-binding'))
  const unknown = {
    ...PERSONAL_ARCHIVE_SCENE_BINDINGS[0],
    id: 'unknown-binding',
  }
  assert.ok(issueCodes(scene, [...PERSONAL_ARCHIVE_SCENE_BINDINGS, unknown]).includes('unknown-binding'))
})

void test('detects invalid ranges, duplicate writes, unknown duration, and object hierarchy drift', () => {
  const { scene } = readGlbScene()
  const invalidRange = replaceBinding('notebook-open', item => ({
    ...item,
    sampleRange: { kind: 'seconds', start: 1, end: 1 },
  }))
  assert.ok(issueCodes(scene, invalidRange).includes('invalid-range'))

  const duplicateTarget = replaceBinding('life-envelope-open', item => ({
    ...item,
    target: { node: 'NotebookHinge', property: 'rotation' },
  }))
  assert.ok(issueCodes(scene, duplicateTarget).includes('duplicate-target-writer'))

  const unknownDuration = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, duration: null }
      : animation),
  }
  const unknownInspection = inspectSceneBindings(unknownDuration)
  assert.equal(unknownInspection.status, 'unknown')
  assert.ok(unknownInspection.issues.some(item => item.code === 'duration-unknown' && item.severity === 'unknown'))

  const missingObject = {
    ...scene,
    nodes: scene.nodes.filter(node => node.name !== 'MonitorState_photo'),
  }
  assert.ok(issueCodes(missingObject).includes('missing-required-object'))
  const wrongParent = {
    ...scene,
    nodes: scene.nodes.map(node => node.name === 'FrameReading_TL' ? { ...node, parent: 'FramePrintPivot_01' } : node),
  }
  assert.ok(issueCodes(wrongParent).includes('parent-mismatch'))
})

void test('rejects extra channels and cross-clip writers in selected animations', () => {
  const { scene } = readGlbScene()
  const crossClipWriter = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? {
          ...animation,
          channels: [...animation.channels, { node: 'LifeEnvelopeHinge', property: 'rotation' }],
        }
      : animation),
  }
  const inspection = inspectSceneBindings(crossClipWriter)

  assert.equal(inspection.status, 'invalid')
  assert.ok(inspection.issues.some(item => (
    item.code === 'undeclared-clip-channel'
    && item.bindingId === 'notebook-open'
    && item.detail === 'NotebookOpen writes undeclared channel LifeEnvelopeHinge.rotation.'
  )))
  for (const bindingId of ['notebook-open', 'life-envelope-open']) {
    assert.ok(inspection.issues.some(item => (
      item.code === 'duplicate-scene-target-writer'
      && item.bindingId === bindingId
      && item.detail.includes('NotebookOpen, LifeEnvelopeOpen')
      && item.detail.includes('LifeEnvelopeHinge.rotation')
    )))
    assert.equal(inspection.coverage.find(item => item.bindingId === bindingId)?.status, 'invalid')
  }
  assert.deepEqual(inspection.actionReadback, {
    status: 'unavailable',
    reason: 'static-metadata-only',
  })
})

void test('locates an extra undeclared property and a duplicate channel inside one selected clip', () => {
  const { scene } = readGlbScene()
  const extraProperty = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, channels: [...animation.channels, { node: 'NotebookHinge', property: 'scale' }] }
      : animation),
  }
  const extraInspection = inspectSceneBindings(extraProperty)
  assert.equal(extraInspection.status, 'invalid')
  assert.ok(extraInspection.issues.some(item => (
    item.code === 'undeclared-clip-channel'
    && item.bindingId === 'notebook-open'
    && item.detail === 'NotebookOpen writes undeclared channel NotebookHinge.scale.'
  )))
  assert.equal(extraInspection.coverage.find(item => item.bindingId === 'notebook-open')?.status, 'invalid')
  assert.equal(extraInspection.coverage.find(item => item.bindingId === 'life-envelope-open')?.status, 'covered')

  const duplicateChannel = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, channels: [...animation.channels, animation.channels[0]] }
      : animation),
  }
  const duplicateInspection = inspectSceneBindings(duplicateChannel)
  assert.equal(duplicateInspection.status, 'invalid')
  assert.ok(duplicateInspection.issues.some(item => (
    item.code === 'duplicate-scene-channel'
    && item.bindingId === 'notebook-open'
    && item.detail === 'NotebookOpen contains 2 channels for NotebookHinge.rotation.'
  )))
  assert.equal(duplicateInspection.coverage.find(item => item.bindingId === 'notebook-open')?.status, 'invalid')
})

void test('ignores channels from animations that no binding selects', () => {
  const { scene } = readGlbScene()
  const withUnselectedClip = {
    ...scene,
    animations: [...scene.animations, {
      name: 'UnselectedDiagnosticClip',
      duration: 1,
      channels: [{ node: 'LifeEnvelopeHinge', property: 'rotation' }],
    }],
  }
  const inspection = inspectSceneBindings(withUnselectedClip)

  assert.equal(inspection.status, 'valid')
  assert.deepEqual(inspection.issues, [])
  assert.ok(inspection.coverage.every(item => item.status === 'covered'))
})

void test('allows a private clip rename without changing semantic fields and never mutates input', () => {
  const { scene } = readGlbScene()
  const renamedScene = {
    ...scene,
    animations: scene.animations.map(animation => animation.name === 'NotebookOpen'
      ? { ...animation, name: 'NotebookOpenV2' }
      : animation),
  }
  const renamedBindings = replaceBinding('notebook-open', item => ({ ...item, clip: 'NotebookOpenV2' }))
  const beforeScene = structuredClone(renamedScene)
  const beforeBindings = structuredClone(renamedBindings)
  const inspection = inspectSceneBindings(renamedScene, renamedBindings)

  assert.equal(inspection.status, 'valid')
  assert.deepEqual(renamedScene, beforeScene)
  assert.deepEqual(renamedBindings, beforeBindings)
  assert.ok(Object.isFrozen(inspection))
  assert.ok(Object.isFrozen(inspection.coverage))
  assert.ok(Object.isFrozen(inspection.issues))
  assert.deepEqual(inspection.actionReadback, {
    status: 'unavailable',
    reason: 'static-metadata-only',
  })
})
