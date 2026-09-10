import type { Camera } from 'three'
import { PERSONAL_ARCHIVE_SAMPLE_STORY, sampleStory } from '../../core/narrative/index.ts'
import type { StoryFrame } from '../../core/narrative/types.ts'
import {
  inspectSceneBindings,
  PERSONAL_ARCHIVE_SCENE_BINDINGS,
  describeArchiveScene,
  type ArchiveSceneModel,
  type BindingInspection,
  type StaticSceneDescription,
} from './sceneBindings.ts'

export { describeArchiveScene } from './sceneBindings.ts'

const ENABLE_KEY = '__portfolioArchiveStoryShadowEnabled'
const SNAPSHOT_KEY = '__portfolioArchiveStoryShadow'
const SUPPORTED_SHOTS: ReadonlySet<string> = new Set(['about-life', 'life-frame'])
const DEFAULT_RECORD_LIMIT = 24
const READBACK_NODES = Object.freeze([
  ...new Set([
    ...PERSONAL_ARCHIVE_SCENE_BINDINGS.map(binding => binding.target.node),
    'Life_PhotoPaper',
    'ArchivePhoto_04',
    'PhotoMount_04',
    'MonitorState_project',
    'MonitorState_photo',
  ]),
])

type ArchiveModel = ArchiveSceneModel
type ShadowGlobal = Record<string, unknown>

export interface ArchiveStoryShadowInput {
  readonly shot: string
  readonly progress: number
  readonly pagePresent: boolean
  readonly activeAlive: boolean
  readonly disposed: boolean
  readonly preparing: boolean
}

export interface ArchiveStoryShadowReadback {
  readonly nodes: readonly Readonly<{
    name: string
    status: 'present' | 'missing'
    visible: boolean | null
    position: readonly number[] | null
    quaternion: readonly number[] | null
    scale: readonly number[] | null
    matrixWorld: readonly number[] | null
  }>[]
  readonly camera: Readonly<{
    position: readonly number[]
    quaternion: readonly number[]
    matrixWorld: readonly number[]
    matrixWorldInverse: readonly number[]
    projectionMatrix: readonly number[]
  }>
}

export type ArchiveStoryShadowRecord =
  | Readonly<{
      kind: 'observation'
      diagnosticSequence: number
      shot: 'about-life' | 'life-frame'
      progress: number
      observedAt: Readonly<{
        diagnosticSequence: number
        frameId: null
        layoutVersion: null
        resourceGeneration: null
        phase: 'legacy-post-render'
      }>
      candidate: Readonly<StoryFrame>
      bindingInspection: BindingInspection
      readback: ArchiveStoryShadowReadback
      actions: Readonly<{ status: 'unavailable'; reason: 'legacy-private-actions' }>
    }>
  | Readonly<{
      kind: 'diagnostic-error'
      diagnosticSequence: number
      shot: 'about-life' | 'life-frame'
      progress: number
      stage: 'sample' | 'binding-inspection' | 'readback'
      message: string
      paused: boolean
    }>

export interface ArchiveStoryShadowSnapshot {
  readonly enabled: boolean
  readonly paused: boolean
  readonly recordLimit: number
  readonly records: readonly ArchiveStoryShadowRecord[]
}

export interface ArchiveStoryShadow {
  readonly enabled: boolean
  observe(input: ArchiveStoryShadowInput): void
  snapshot(): ArchiveStoryShadowSnapshot
  dispose(): void
}

interface ShadowDependencies {
  readonly sample: typeof sampleStory
  readonly inspect: typeof inspectSceneBindings
  readonly describe: (model: ArchiveModel) => StaticSceneDescription
  readonly readback: (model: ArchiveModel, camera: Camera) => ArchiveStoryShadowReadback
}

interface ShadowOptions {
  readonly enabled: boolean
  readonly model: ArchiveModel
  readonly camera: Camera
  readonly recordLimit?: number
  readonly dependencies?: Partial<ShadowDependencies>
}

const vector3 = (value: Readonly<{ x: number; y: number; z: number }>) => Object.freeze([value.x, value.y, value.z])
const quaternion = (value: Readonly<{ x: number; y: number; z: number; w: number }>) => Object.freeze([value.x, value.y, value.z, value.w])
const matrix = (value: Readonly<{ elements: readonly number[] }>) => Object.freeze([...value.elements])

export function readArchiveScene(model: ArchiveModel, camera: Camera): ArchiveStoryShadowReadback {
  const nodes = READBACK_NODES.map(name => {
    const node = model.scene.getObjectByName(name)
    return node
      ? Object.freeze({
          name,
          status: 'present' as const,
          visible: node.visible,
          position: vector3(node.position),
          quaternion: quaternion(node.quaternion),
          scale: vector3(node.scale),
          matrixWorld: matrix(node.matrixWorld),
        })
      : Object.freeze({
          name,
          status: 'missing' as const,
          visible: null,
          position: null,
          quaternion: null,
          scale: null,
          matrixWorld: null,
        })
  })
  return Object.freeze({
    nodes: Object.freeze(nodes),
    camera: Object.freeze({
      position: vector3(camera.position),
      quaternion: quaternion(camera.quaternion),
      matrixWorld: matrix(camera.matrixWorld),
      matrixWorldInverse: matrix(camera.matrixWorldInverse),
      projectionMatrix: matrix(camera.projectionMatrix),
    }),
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function boundedLimit(value: number | undefined) {
  return Number.isInteger(value) && value! > 0 ? Math.min(100, value!) : DEFAULT_RECORD_LIMIT
}

export function createArchiveStoryShadow(options: ShadowOptions): ArchiveStoryShadow {
  const enabled = options.enabled === true
  const recordLimit = boundedLimit(options.recordLimit)
  if (!enabled) {
    const empty = Object.freeze({ enabled: false, paused: false, recordLimit, records: Object.freeze([]) })
    return Object.freeze({ enabled, observe() {}, snapshot: () => empty, dispose() {} })
  }

  const dependencies: ShadowDependencies = {
    sample: options.dependencies?.sample ?? sampleStory,
    inspect: options.dependencies?.inspect ?? inspectSceneBindings,
    describe: options.dependencies?.describe ?? describeArchiveScene,
    readback: options.dependencies?.readback ?? readArchiveScene,
  }
  let model: ArchiveModel | null = options.model
  let camera: Camera | null = options.camera
  let bindingInspection: BindingInspection | null = null
  let paused = false
  let diagnosticSequence = 0
  const records: ArchiveStoryShadowRecord[] = []

  const append = (record: ArchiveStoryShadowRecord) => {
    records.push(record)
    if (records.length > recordLimit) records.splice(0, records.length - recordLimit)
  }
  const appendError = (
    input: ArchiveStoryShadowInput,
    shot: 'about-life' | 'life-frame',
    sequence: number,
    stage: Extract<ArchiveStoryShadowRecord, { kind: 'diagnostic-error' }>['stage'],
    error: unknown,
    shouldPause = false,
  ) => {
    if (shouldPause) paused = true
    append(Object.freeze({
      kind: 'diagnostic-error',
      diagnosticSequence: sequence,
      shot,
      progress: input.progress,
      stage,
      message: errorMessage(error),
      paused,
    }))
  }

  const observe = (input: ArchiveStoryShadowInput) => {
    if (paused || !model || !camera || !SUPPORTED_SHOTS.has(input.shot)) return
    if (!input.pagePresent || !input.activeAlive || input.disposed || input.preparing) return
    const shot = input.shot as 'about-life' | 'life-frame'
    const sequence = ++diagnosticSequence

    let candidate: Readonly<StoryFrame>
    try {
      candidate = dependencies.sample({
        position: { segment: shot, progress: input.progress },
        storyVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion,
        contentVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion,
      })
    } catch (error) {
      appendError(input, shot, sequence, 'sample', error)
      return
    }

    if (!bindingInspection) {
      try {
        bindingInspection = dependencies.inspect(dependencies.describe(model))
      } catch (error) {
        appendError(input, shot, sequence, 'binding-inspection', error, true)
        return
      }
    }

    let readback: ArchiveStoryShadowReadback
    try {
      readback = dependencies.readback(model, camera)
    } catch (error) {
      appendError(input, shot, sequence, 'readback', error)
      return
    }

    append(Object.freeze({
      kind: 'observation',
      diagnosticSequence: sequence,
      shot,
      progress: input.progress,
      observedAt: Object.freeze({
        diagnosticSequence: sequence,
        frameId: null,
        layoutVersion: null,
        resourceGeneration: null,
        phase: 'legacy-post-render',
      }),
      candidate,
      bindingInspection,
      readback,
      actions: Object.freeze({ status: 'unavailable', reason: 'legacy-private-actions' }),
    }))
  }

  return Object.freeze({
    enabled,
    observe(input: ArchiveStoryShadowInput) {
      try { observe(input) } catch (error) {
        if (!model || !camera || !SUPPORTED_SHOTS.has(input.shot)) return
        try {
          appendError(input, input.shot as 'about-life' | 'life-frame', ++diagnosticSequence, 'readback', error, true)
        } catch { paused = true }
      }
    },
    snapshot: () => Object.freeze({
      enabled,
      paused,
      recordLimit,
      records: Object.freeze([...records]),
    }),
    dispose() {
      paused = true
      records.length = 0
      bindingInspection = null
      model = null
      camera = null
    },
  })
}

export function archiveStoryShadowRequested(target: ShadowGlobal = globalThis) {
  try { return target[ENABLE_KEY] === true } catch { return false }
}

export interface ArchiveStoryShadowExposure {
  readonly exposed: boolean
  dispose(): void
}

export function exposeArchiveStoryShadow(
  shadow: ArchiveStoryShadow,
  target: ShadowGlobal = globalThis,
) : ArchiveStoryShadowExposure {
  if (!shadow.enabled) return Object.freeze({ exposed: false, dispose() {} })
  try {
    if (SNAPSHOT_KEY in target) return Object.freeze({ exposed: false, dispose() {} })
    const exposed = Object.freeze({ getSnapshot: () => shadow.snapshot() })
    Object.defineProperty(target, SNAPSHOT_KEY, { configurable: true, enumerable: false, writable: false, value: exposed })
    return Object.freeze({
      exposed: true,
      dispose() {
        try {
          if (target[SNAPSHOT_KEY] === exposed) Reflect.deleteProperty(target, SNAPSHOT_KEY)
        } catch { /* Diagnostic cleanup cannot affect the host runtime. */ }
      },
    })
  } catch {
    return Object.freeze({ exposed: false, dispose() {} })
  }
}

export function initializeArchiveStoryShadow(
  options: Omit<ShadowOptions, 'enabled'>,
  target: ShadowGlobal = globalThis,
): ArchiveStoryShadow {
  let shadow: ArchiveStoryShadow | null = null
  try {
    if (!archiveStoryShadowRequested(target)) {
      return createArchiveStoryShadow({ ...options, enabled: false })
    }
    shadow = createArchiveStoryShadow({ ...options, enabled: true })
    const exposure = exposeArchiveStoryShadow(shadow, target)
    if (!exposure.exposed) {
      shadow.dispose()
      return createArchiveStoryShadow({ ...options, enabled: false })
    }
    const activeShadow = shadow
    return Object.freeze({
      enabled: true,
      observe: (input: ArchiveStoryShadowInput) => activeShadow.observe(input),
      snapshot: () => activeShadow.snapshot(),
      dispose() {
        try { exposure.dispose() } catch { /* Diagnostic cleanup cannot affect the host runtime. */ }
        try { activeShadow.dispose() } catch { /* Diagnostic cleanup cannot affect the host runtime. */ }
      },
    })
  } catch {
    try { shadow?.dispose() } catch { /* Diagnostic cleanup cannot affect the host runtime. */ }
    return createArchiveStoryShadow({ ...options, enabled: false })
  }
}
