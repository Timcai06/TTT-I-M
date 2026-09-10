import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  AnimationClip,
  BooleanKeyframeTrack,
  Object3D,
  PerspectiveCamera,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three'

import {
  archiveStoryShadowRequested,
  createArchiveStoryShadow,
  describeArchiveScene,
  exposeArchiveStoryShadow,
  initializeArchiveStoryShadow,
  readArchiveScene,
  type ArchiveStoryShadowInput,
} from '../src/components/personal-archive/archiveStoryShadow.ts'
import { inspectSceneBindings, PERSONAL_ARCHIVE_REQUIRED_OBJECTS } from '../src/components/personal-archive/sceneBindings.ts'
import { PERSONAL_ARCHIVE_SAMPLE_STORY, sampleStory } from '../src/core/narrative/index.ts'

const accepted: ArchiveStoryShadowInput = {
  shot: 'about-life',
  progress: 0.4,
  pagePresent: true,
  activeAlive: true,
  disposed: false,
  preparing: false,
}

function fixture() {
  const scene = new Object3D()
  scene.name = 'ArchiveRoot'
  const byName = new Map<string, Object3D>()
  for (const required of PERSONAL_ARCHIVE_REQUIRED_OBJECTS) {
    if (byName.has(required.name)) continue
    const node = new Object3D()
    node.name = required.name
    node.position.set(1, 2, 3)
    scene.add(node)
    byName.set(node.name, node)
  }
  const camera = new PerspectiveCamera()
  camera.position.set(4, 5, 6)
  const animations = [
    new AnimationClip('NotebookOpen', 1, [new QuaternionKeyframeTrack('NotebookHinge.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])]),
    new AnimationClip('LifeEnvelopeOpen', 1, [new QuaternionKeyframeTrack('LifeEnvelopeHinge.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1])]),
    new AnimationClip('LifePhotoExtract', 1, [new VectorKeyframeTrack('LifeMemoryPhoto.position', [0, 1], [0, 0, 0, 1, 0, 0])]),
  ]
  return { model: { scene, animations }, camera, byName }
}

void test('default-disabled mode performs no sampling, inspection, description, or readback', () => {
  const { model, camera } = fixture()
  const calls = { sample: 0, inspect: 0, describe: 0, readback: 0 }
  const shadow = createArchiveStoryShadow({
    enabled: false,
    model,
    camera,
    dependencies: {
      sample: input => { calls.sample++; return sampleStory(input) },
      inspect: scene => { calls.inspect++; return inspectSceneBindings(scene) },
      describe: value => { calls.describe++; return describeArchiveScene(value) },
      readback: (value, valueCamera) => { calls.readback++; return readArchiveScene(value, valueCamera) },
    },
  })

  shadow.observe(accepted)
  assert.deepEqual(calls, { sample: 0, inspect: 0, describe: 0, readback: 0 })
  assert.deepEqual(shadow.snapshot(), { enabled: false, paused: false, recordLimit: 24, records: [] })
})

void test('filters unsupported shots and non-observable lifecycle states before dependencies run', () => {
  const { model, camera } = fixture()
  let samples = 0
  const shadow = createArchiveStoryShadow({
    enabled: true,
    model,
    camera,
    dependencies: { sample: input => { samples++; return sampleStory(input) } },
  })

  for (const input of [
    { ...accepted, shot: 'entry' },
    { ...accepted, pagePresent: false },
    { ...accepted, activeAlive: false },
    { ...accepted, disposed: true },
    { ...accepted, preparing: true },
  ]) shadow.observe(input)

  assert.equal(samples, 0)
  assert.equal(shadow.snapshot().records.length, 0)
})

void test('records bounded immutable candidate and existing-scene readback while inspecting once', () => {
  const { model, camera, byName } = fixture()
  let inspections = 0
  let descriptions = 0
  const beforePosition = byName.get('LifeMemoryPhoto')!.position.toArray()
  const shadow = createArchiveStoryShadow({
    enabled: true,
    model,
    camera,
    recordLimit: 2,
    dependencies: {
      inspect: scene => { inspections++; return inspectSceneBindings(scene) },
      describe: value => { descriptions++; return describeArchiveScene(value) },
    },
  })

  shadow.observe(accepted)
  shadow.observe({ ...accepted, progress: 0.5 })
  shadow.observe({ ...accepted, shot: 'life-frame', progress: 0.6 })
  const first = shadow.snapshot()
  const second = shadow.snapshot()
  assert.equal(inspections, 1)
  assert.equal(descriptions, 1)
  assert.equal(first.records.length, 2)
  assert.notEqual(first.records, second.records)
  assert.ok(Object.isFrozen(first.records))
  const record = first.records.at(-1)
  assert.equal(record?.kind, 'observation')
  if (record?.kind !== 'observation') return
  assert.equal(record.shot, 'life-frame')
  assert.equal(record.candidate.position.segment, 'life-frame')
  assert.equal(record.bindingInspection.status, 'invalid')
  assert.deepEqual(record.actions, { status: 'unavailable', reason: 'legacy-private-actions' })
  assert.deepEqual(record.observedAt, {
    diagnosticSequence: 3,
    frameId: null,
    layoutVersion: null,
    resourceGeneration: null,
    phase: 'legacy-post-render',
  })
  assert.deepEqual(record.readback.nodes.find(node => node.name === 'LifeMemoryPhoto')?.position, [1, 2, 3])
  assert.deepEqual(record.readback.camera.position, [4, 5, 6])
  assert.deepEqual(byName.get('LifeMemoryPhoto')!.position.toArray(), beforePosition)
  assert.ok(Object.isFrozen(record.readback.nodes))
  assert.ok(Object.isFrozen(record.readback.nodes[0]))
})

void test('contains sampling and readback failures and pauses after binding inspection failure', () => {
  for (const [stage, dependencies, paused] of [
    ['sample', { sample: () => { throw new Error('sample exploded') } }, false],
    ['binding-inspection', { inspect: () => { throw new Error('inspect exploded') } }, true],
    ['readback', { readback: () => { throw new Error('readback exploded') } }, false],
  ] as const) {
    const { model, camera } = fixture()
    const shadow = createArchiveStoryShadow({ enabled: true, model, camera, dependencies })
    assert.doesNotThrow(() => shadow.observe(accepted))
    const record = shadow.snapshot().records[0]
    assert.equal(record?.kind, 'diagnostic-error')
    if (record?.kind !== 'diagnostic-error') continue
    assert.equal(record.stage, stage)
    assert.equal(record.paused, paused)
    if (paused) {
      shadow.observe({ ...accepted, progress: 0.6 })
      assert.equal(shadow.snapshot().records.length, 1)
    }
  }
})

void test('explicit global switch exposes a read-only snapshot entry and disposal clears references', () => {
  const target: Record<string, unknown> = {}
  const { model, camera } = fixture()
  assert.equal(archiveStoryShadowRequested(target), false)
  target.__portfolioArchiveStoryShadowEnabled = true
  assert.equal(archiveStoryShadowRequested(target), true)
  const shadow = createArchiveStoryShadow({ enabled: true, model, camera })
  const exposure = exposeArchiveStoryShadow(shadow, target)
  assert.equal(exposure.exposed, true)
  const exposed = target.__portfolioArchiveStoryShadow as { getSnapshot(): { records: readonly unknown[] } }
  assert.ok(Object.isFrozen(exposed))
  shadow.observe(accepted)
  assert.equal(exposed.getSnapshot().records.length, 1)
  shadow.dispose()
  assert.equal(exposed.getSnapshot().records.length, 0)
  exposure.dispose()
  assert.equal(target.__portfolioArchiveStoryShadow, undefined)
})

void test('a conflicting global snapshot slot disables initialization without overwriting or sampling', () => {
  const { model, camera } = fixture()
  const sentinel = Object.freeze({ owner: 'existing-diagnostic' })
  const target: Record<string, unknown> = { __portfolioArchiveStoryShadowEnabled: true }
  Object.defineProperty(target, '__portfolioArchiveStoryShadow', {
    configurable: false,
    enumerable: true,
    writable: false,
    value: sentinel,
  })
  let samples = 0
  let shadow: ReturnType<typeof initializeArchiveStoryShadow> | undefined
  assert.doesNotThrow(() => {
    shadow = initializeArchiveStoryShadow({
      model,
      camera,
      dependencies: { sample: input => { samples++; return sampleStory(input) } },
    }, target)
  })
  assert.equal(shadow!.enabled, false)
  shadow!.observe(accepted)
  shadow!.dispose()
  assert.equal(samples, 0)
  assert.equal(target.__portfolioArchiveStoryShadow, sentinel)

  const enabled = createArchiveStoryShadow({ enabled: true, model, camera })
  let exposure: ReturnType<typeof exposeArchiveStoryShadow> | undefined
  assert.doesNotThrow(() => { exposure = exposeArchiveStoryShadow(enabled, target) })
  assert.equal(exposure!.exposed, false)
  enabled.dispose()
})

void test('runtime publishes bounded post-render diagnostics without a legacy shadow writer', () => {
  const source = readFileSync(new URL('../src/components/personal-archive/archiveRuntime.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /initializeArchiveStoryShadow|storyShadow\.observe|archiveSampleMode|execution\.legacy/)
  const draw = source.slice(source.indexOf('function drawSample('), source.indexOf('function drawActive('))
  const renderIndex = draw.indexOf('composer.render()')
  const shaderIndex = draw.indexOf('if (shaderFailure) throw shaderFailure')
  const publishIndex = draw.indexOf("kind: 'sample-committed'")
  assert.ok(renderIndex >= 0 && renderIndex < shaderIndex && shaderIndex < publishIndex)
  assert.match(source, /records\.length > 32/)
  assert.match(source, /catch \{ \/\* diagnostics cannot affect execution \*\//)
  assert.match(source, /\['contact-reading', 1\]/)
})

void test('description maps existing animation track properties without inventing channels', () => {
  const { model } = fixture()
  const description = describeArchiveScene(model)
  assert.deepEqual(description.animations[0]?.channels, [{ node: 'NotebookHinge', property: 'rotation' }])
  assert.deepEqual(description.animations[2]?.channels, [{ node: 'LifeMemoryPhoto', property: 'translation' }])
  assert.equal(description.animations.some(animation => animation.channels.some(channel => channel.property === 'weights')), false)
  assert.equal(PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion, 'personal-archive-story-v1')
})

void test('description preserves an unsupported selected-clip track and makes B reject it', () => {
  const { model } = fixture()
  const notebookClip = model.animations[0]
  assert.ok(notebookClip)
  notebookClip.tracks.push(new BooleanKeyframeTrack('NotebookHinge.visible', [0, 1], [true, false]))
  const description = describeArchiveScene(model)
  const notebook = description.animations.find(animation => animation.name === 'NotebookOpen')
  assert.ok(notebook?.channels.some(channel => (
    channel.node === 'NotebookHinge' && channel.property === 'unsupported:NotebookHinge.visible'
  )))
  const inspection = inspectSceneBindings(description)
  assert.equal(inspection.status, 'invalid')
  assert.ok(inspection.issues.some(issue => (
    issue.code === 'undeclared-clip-channel'
    && issue.detail.includes('NotebookHinge.visible')
  )))
})
