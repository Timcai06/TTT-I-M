import { AnimationMixer, LoopOnce, type AnimationAction, type Object3D } from 'three'
import type { SemanticWorld } from '../../core/narrative/types.ts'
import {
  describeArchiveScene,
  inspectSceneBindings,
  PERSONAL_ARCHIVE_SCENE_BINDINGS,
  sceneBindingSampleInterval,
  type ArchiveSceneModel,
  type SceneBindingDefinition,
} from './sceneBindings.ts'

const LEGACY_CLIP = /^(NotebookOpen|LifeEnvelopeOpen|LifePhotoExtract|WorkDrawerOpen|WorkFolderLift|FramePrintSettle|CinemaRailTravel)/
const SAMPLE_CLIPS = new Set(PERSONAL_ARCHIVE_SCENE_BINDINGS.map(binding => binding.clip))

export type ArchiveAnimationOwner = 'legacy' | 'sample'

export interface ArchiveAnimationOwnerToken {
  readonly owner: ArchiveAnimationOwner
  readonly generation: number
}

export interface ArchiveAnimationActionReadback {
  readonly bindingId: string
  readonly semanticField: SceneBindingDefinition['semanticField']
  readonly clip: string
  readonly target: Readonly<{ node: string; property: SceneBindingDefinition['target']['property'] }>
  readonly action: Readonly<{
    time: number
    weight: number
    effectiveWeight: number
    enabled: boolean
    paused: boolean
    timeScale: number
    effectiveTimeScale: number
    loop: number
    clampWhenFinished: boolean
  }>
  readonly node: Readonly<{
    position: readonly number[]
    quaternion: readonly number[]
    scale: readonly number[]
    matrixWorld: readonly number[]
  }>
}

export interface ArchiveAnimationReadback {
  readonly owner: ArchiveAnimationOwner
  readonly generation: number
  readonly actions: readonly ArchiveAnimationActionReadback[]
}

export type ArchiveAnimationSampleResult =
  | Readonly<{
      status: 'applied'
      readback: ArchiveAnimationReadback
    }>
  | Readonly<{
      status: 'unavailable'
      issues: readonly string[]
    }>

export interface ArchiveAnimationRig {
  readonly actionNames: readonly string[]
  claim(owner: ArchiveAnimationOwner): ArchiveAnimationOwnerToken
  seekLegacy(token: ArchiveAnimationOwnerToken, clip: string, amount: number): void
  evaluateLegacy(token: ArchiveAnimationOwnerToken): void
  sample(token: ArchiveAnimationOwnerToken, world: SemanticWorld): ArchiveAnimationSampleResult
  readback(): ArchiveAnimationReadback
  dispose(): void
}

interface SamplePlanEntry {
  readonly definition: SceneBindingDefinition
  readonly action: AnimationAction
  readonly node: Object3D
  readonly interval: readonly [number, number]
}

function semanticValue(world: SemanticWorld, field: SceneBindingDefinition['semanticField']) {
  if (field === 'notebook.openness') return world.notebook.openness
  if (field === 'envelope.openness') return world.envelope.openness
  if (field === 'photo.extraction') return world.photo.extraction
  if (field === 'wallPrints.settling') return world.wallPrints.settling
  if (field === 'cabinet.drawerOpenness') return world.cabinet.drawerOpenness
  return world.cabinet.folderLift
}

const tuple3 = (value: Readonly<{ x: number; y: number; z: number }>) => Object.freeze([value.x, value.y, value.z])
const tuple4 = (value: Readonly<{ x: number; y: number; z: number; w: number }>) => Object.freeze([value.x, value.y, value.z, value.w])
const matrix = (value: Readonly<{ elements: readonly number[] }>) => Object.freeze([...value.elements])

/** Owns the model's sole AnimationMixer. Production claims only legacy. */
export function createArchiveAnimationRig(model: ArchiveSceneModel): ArchiveAnimationRig {
  const mixer = new AnimationMixer(model.scene)
  const actions = new Map<string, AnimationAction>()
  for (const clip of model.animations) {
    if (!LEGACY_CLIP.test(clip.name)) continue
    const action = mixer.clipAction(clip)
    action.setLoop(LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
    action.paused = true
    actions.set(clip.name, action)
  }
  const actionNames = Object.freeze([...actions.keys()])
  let generation = 0
  let current: ArchiveAnimationOwnerToken | null = null
  let disposed = false

  function requireOwner(token: ArchiveAnimationOwnerToken, owner?: ArchiveAnimationOwner) {
    if (disposed) throw new Error('Archive animation rig is disposed.')
    if (token !== current || (owner && token.owner !== owner)) {
      throw new Error(`Archive animation owner token is stale for ${owner ?? 'this operation'}.`)
    }
  }

  function normalizeLegacyActions() {
    for (const action of actions.values()) {
      action.enabled = true
      action.setLoop(LoopOnce, 1)
      action.clampWhenFinished = true
      action.setEffectiveTimeScale(1)
      action.setEffectiveWeight(1)
      action.play()
      action.paused = true
    }
  }

  function legacyInterval(clip: string, duration: number): readonly [number, number] {
    const definition = PERSONAL_ARCHIVE_SCENE_BINDINGS.find(item => item.clip === clip)
    return definition ? sceneBindingSampleInterval(definition, duration) ?? Object.freeze([0, duration]) : Object.freeze([0, duration])
  }

  function buildSamplePlan(): Readonly<{ entries: readonly SamplePlanEntry[]; issues: readonly string[] }> {
    const inspection = inspectSceneBindings(describeArchiveScene(model))
    const issues = inspection.issues.map(item => `${item.code}:${item.bindingId ?? 'scene'}:${item.detail}`)
    const entries: SamplePlanEntry[] = []
    if (inspection.status !== 'valid' || inspection.coverage.length !== PERSONAL_ARCHIVE_SCENE_BINDINGS.length) {
      if (issues.length === 0) issues.push(`binding-inspection:${inspection.status}`)
      return Object.freeze({ entries: Object.freeze(entries), issues: Object.freeze(issues) })
    }
    for (const definition of PERSONAL_ARCHIVE_SCENE_BINDINGS) {
      const clip = model.animations.find(item => item.name === definition.clip)
      const action = actions.get(definition.clip)
      const node = model.scene.getObjectByName(definition.target.node)
      const interval = clip ? sceneBindingSampleInterval(definition, clip.duration) : null
      if (!clip) issues.push(`missing-clip:${definition.clip}`)
      if (!action) issues.push(`missing-action:${definition.clip}`)
      if (!node) issues.push(`missing-node:${definition.target.node}`)
      if (!interval) issues.push(`invalid-range:${definition.id}`)
      if (clip && action && node && interval) entries.push(Object.freeze({ definition, action, node, interval }))
    }
    if (entries.length !== PERSONAL_ARCHIVE_SCENE_BINDINGS.length && issues.length === 0) {
      issues.push(`binding-count:${entries.length}`)
    }
    return Object.freeze({ entries: Object.freeze(entries), issues: Object.freeze(issues) })
  }

  function readback(): ArchiveAnimationReadback {
    if (disposed || !current) throw new Error('Archive animation rig has no active owner.')
    const values = PERSONAL_ARCHIVE_SCENE_BINDINGS.map(definition => {
      const action = actions.get(definition.clip)
      const node = model.scene.getObjectByName(definition.target.node)
      if (!action || !node) throw new Error(`Archive animation readback unavailable for ${definition.id}.`)
      return Object.freeze({
        bindingId: definition.id,
        semanticField: definition.semanticField,
        clip: definition.clip,
        target: Object.freeze({ ...definition.target }),
        action: Object.freeze({
          time: action.time,
          weight: action.weight,
          effectiveWeight: action.getEffectiveWeight(),
          enabled: action.enabled,
          paused: action.paused,
          timeScale: action.timeScale,
          effectiveTimeScale: action.getEffectiveTimeScale(),
          loop: action.loop,
          clampWhenFinished: action.clampWhenFinished,
        }),
        node: Object.freeze({
          position: tuple3(node.position),
          quaternion: tuple4(node.quaternion),
          scale: tuple3(node.scale),
          matrixWorld: matrix(node.matrixWorld),
        }),
      })
    })
    return Object.freeze({ owner: current.owner, generation: current.generation, actions: Object.freeze(values) })
  }

  return Object.freeze({
    actionNames,
    claim(owner: ArchiveAnimationOwner) {
      if (disposed) throw new Error('Archive animation rig is disposed.')
      current = Object.freeze({ owner, generation: ++generation })
      if (owner === 'legacy') normalizeLegacyActions()
      return current
    },
    seekLegacy(token: ArchiveAnimationOwnerToken, clip: string, amount: number) {
      requireOwner(token, 'legacy')
      const action = actions.get(clip)
      if (!action) return
      const interval = legacyInterval(clip, action.getClip().duration)
      action.time = interval[0] + amount * (interval[1] - interval[0])
    },
    evaluateLegacy(token: ArchiveAnimationOwnerToken) {
      requireOwner(token, 'legacy')
      mixer.update(0)
      model.scene.updateMatrixWorld(true)
    },
    sample(token: ArchiveAnimationOwnerToken, world: SemanticWorld): ArchiveAnimationSampleResult {
      requireOwner(token, 'sample')
      const plan = buildSamplePlan()
      const invalidValues = PERSONAL_ARCHIVE_SCENE_BINDINGS.flatMap(definition => {
        const value = semanticValue(world, definition.semanticField)
        return Number.isFinite(value) && value >= 0 && value <= 1
          ? []
          : [`invalid-semantic-value:${definition.semanticField}:${value}`]
      })
      if (plan.issues.length > 0 || invalidValues.length > 0) {
        return Object.freeze({ status: 'unavailable', issues: Object.freeze([...plan.issues, ...invalidValues]) })
      }

      for (const [clip, action] of actions) {
        if (!SAMPLE_CLIPS.has(clip)) action.enabled = false
      }
      for (const entry of plan.entries) {
        const amount = semanticValue(world, entry.definition.semanticField)
        const time = entry.interval[0] + amount * (entry.interval[1] - entry.interval[0])
        const action = entry.action
        action.stop()
        action.reset()
        action.play()
        action.enabled = true
        action.setLoop(LoopOnce, 1)
        action.clampWhenFinished = true
        action.paused = false
        action.setEffectiveTimeScale(1)
        action.setEffectiveWeight(1)
        action.time = time
      }
      mixer.update(0)
      for (const entry of plan.entries) {
        entry.action.paused = true
        entry.action.setEffectiveTimeScale(1)
      }
      model.scene.updateMatrixWorld(true)
      return Object.freeze({ status: 'applied', readback: readback() })
    },
    readback,
    dispose() {
      if (disposed) return
      disposed = true
      current = null
      generation++
      mixer.stopAllAction()
      mixer.uncacheRoot(model.scene)
      actions.clear()
    },
  })
}
