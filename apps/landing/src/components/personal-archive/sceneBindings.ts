import type { AnimationClip, Object3D } from 'three'
import type { SemanticWorld } from '../../core/narrative/types.ts'

type SemanticWorldBindingCheck = Readonly<{
  'notebook.openness': SemanticWorld['notebook']['openness']
  'envelope.openness': SemanticWorld['envelope']['openness']
  'photo.extraction': SemanticWorld['photo']['extraction']
  'wallPrints.settling': SemanticWorld['wallPrints']['settling']
  'cabinet.drawerOpenness': SemanticWorld['cabinet']['drawerOpenness']
  'cabinet.folderLift': SemanticWorld['cabinet']['folderLift']
}>

export type SemanticBindingField = keyof SemanticWorldBindingCheck

export type StaticAnimationProperty = 'translation' | 'rotation' | 'scale' | 'weights'

export interface SceneBindingDefinition {
  readonly id: string
  readonly semanticField: SemanticBindingField
  readonly clip: string
  readonly target: Readonly<{ node: string; property: StaticAnimationProperty }>
  readonly sampleRange:
    | Readonly<{ kind: 'clip-duration'; start: number }>
    | Readonly<{ kind: 'seconds'; start: number; end: number }>
}

export interface StaticSceneDescription {
  readonly nodes: readonly Readonly<{ name: string; parent: string | null }>[]
  readonly animations: readonly Readonly<{
    name: string
    duration: number | null
    channels: readonly Readonly<{ node: string; property: string }>[]
  }>[]
}

export interface ArchiveSceneModel {
  readonly scene: Object3D
  readonly animations: readonly AnimationClip[]
}

function animationProperty(property: string): StaticAnimationProperty | null {
  if (property === 'position') return 'translation'
  if (property === 'quaternion' || property === 'rotation') return 'rotation'
  if (property === 'scale') return 'scale'
  if (property === 'morphTargetInfluences') return 'weights'
  return null
}

function describeTrack(trackName: string): Readonly<{ node: string; property: string }> {
  const match = /^(.*)\.([^.]+)$/.exec(trackName)
  const nodeName = match?.[1]
  const propertyName = match?.[2]
  if (!nodeName || !propertyName) {
    return Object.freeze({ node: '<unparsed-animation-track>', property: `unsupported:${trackName}` })
  }
  const property = animationProperty(propertyName) ?? `unsupported:${trackName}`
  const node = nodeName.replace(/^\./, '')
  return node
    ? Object.freeze({ node, property })
    : Object.freeze({ node: '<unparsed-animation-track>', property: `unsupported:${trackName}` })
}

export function describeArchiveScene(model: ArchiveSceneModel): StaticSceneDescription {
  const nodes: Array<Readonly<{ name: string; parent: string | null }>> = []
  model.scene.traverse(node => {
    if (node.name) nodes.push(Object.freeze({ name: node.name, parent: node.parent?.name || null }))
  })
  const animations = model.animations.map(animation => Object.freeze({
    name: animation.name,
    duration: Number.isFinite(animation.duration) ? animation.duration : null,
    channels: Object.freeze(animation.tracks.map(track => describeTrack(track.name))),
  }))
  return Object.freeze({ nodes: Object.freeze(nodes), animations: Object.freeze(animations) })
}

export type BindingInspectionIssueCode =
  | 'missing-binding'
  | 'duplicate-binding-id'
  | 'unknown-binding'
  | 'semantic-field-mismatch'
  | 'missing-clip'
  | 'clip-name-mismatch'
  | 'missing-target-node'
  | 'target-mismatch'
  | 'property-mismatch'
  | 'invalid-range'
  | 'duration-unknown'
  | 'range-outside-duration'
  | 'duplicate-target-writer'
  | 'duplicate-scene-channel'
  | 'undeclared-clip-channel'
  | 'duplicate-scene-target-writer'
  | 'missing-required-object'
  | 'duplicate-node'
  | 'parent-mismatch'

export interface BindingInspectionIssue {
  readonly code: BindingInspectionIssueCode
  readonly severity: 'error' | 'unknown'
  readonly bindingId: string | null
  readonly detail: string
}

export interface BindingInspection {
  readonly status: 'valid' | 'invalid' | 'unknown'
  readonly coverage: readonly Readonly<{
    bindingId: string
    semanticField: SemanticBindingField
    clip: string
    target: string
    sampleStart: number
    sampleEnd: number | null
    status: 'covered' | 'invalid' | 'unknown'
  }>[]
  readonly requiredObjects: readonly Readonly<{
    name: string
    status: 'present' | 'missing' | 'invalid'
  }>[]
  readonly issues: readonly BindingInspectionIssue[]
  readonly actionReadback: Readonly<{
    status: 'unavailable'
    reason: 'static-metadata-only'
  }>
}

const binding = (
  id: string,
  semanticField: SemanticBindingField,
  clip: string,
  node: string,
  property: StaticAnimationProperty,
  sampleRange: SceneBindingDefinition['sampleRange'],
): SceneBindingDefinition => Object.freeze({
  id,
  semanticField,
  clip,
  target: Object.freeze({ node, property }),
  sampleRange: Object.freeze({ ...sampleRange }),
})

const fullClip = Object.freeze({ kind: 'clip-duration' as const, start: 0 })
const drawerRange = Object.freeze({ kind: 'seconds' as const, start: 1, end: 2.4 })

export const PERSONAL_ARCHIVE_SCENE_BINDINGS: readonly SceneBindingDefinition[] = Object.freeze([
  binding('notebook-open', 'notebook.openness', 'NotebookOpen', 'NotebookHinge', 'rotation', fullClip),
  binding('life-envelope-open', 'envelope.openness', 'LifeEnvelopeOpen', 'LifeEnvelopeHinge', 'rotation', fullClip),
  binding('life-photo-extract', 'photo.extraction', 'LifePhotoExtract', 'LifeMemoryPhoto', 'translation', fullClip),
  binding('frame-print-settle-04', 'wallPrints.settling', 'FramePrintSettle_04', 'FramePrintPivot', 'rotation', fullClip),
  binding('frame-print-settle-01', 'wallPrints.settling', 'FramePrintSettle_01', 'FramePrintPivot_01', 'rotation', fullClip),
  binding('frame-print-settle-02', 'wallPrints.settling', 'FramePrintSettle_02', 'FramePrintPivot_02', 'rotation', fullClip),
  binding('frame-print-settle-03', 'wallPrints.settling', 'FramePrintSettle_03', 'FramePrintPivot_03', 'rotation', fullClip),
  binding('work-drawer-open', 'cabinet.drawerOpenness', 'WorkDrawerOpen', 'WorkDrawerRoot', 'translation', drawerRange),
  binding('cinema-rail-left', 'cabinet.drawerOpenness', 'CinemaRailTravel_Left', 'Cinema_RailMiddle_Left', 'translation', drawerRange),
  binding('cinema-rail-right', 'cabinet.drawerOpenness', 'CinemaRailTravel_Right', 'Cinema_RailMiddle_Right', 'translation', drawerRange),
  binding('work-folder-lift', 'cabinet.folderLift', 'WorkFolderLift', 'WorkFolderPivot', 'translation', Object.freeze({
    kind: 'seconds' as const,
    start: 74 / 30,
    end: 110 / 30,
  })),
])

export function sceneBindingSampleInterval(
  definition: SceneBindingDefinition,
  duration: number,
): readonly [number, number] | null {
  const range = definition.sampleRange
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(range.start) || range.start < 0) return null
  const end = range.kind === 'clip-duration' ? duration : range.end
  if (!Number.isFinite(end) || end <= range.start || end > duration) return null
  return Object.freeze([range.start, end])
}

const requiredObject = (name: string, parent?: string) => Object.freeze({ name, parent: parent ?? null, checkParent: parent !== undefined })

export const PERSONAL_ARCHIVE_REQUIRED_OBJECTS = Object.freeze([
  requiredObject('NotebookHinge'),
  requiredObject('LifeEnvelopeHinge'),
  requiredObject('LifeMemoryPhoto'),
  requiredObject('Life_PhotoPaper', 'LifeMemoryPhoto'),
  requiredObject('LifePhotoAnchor', 'LifeMemoryPhoto'),
  requiredObject('FramePrintPivot'),
  requiredObject('FramePrintPivot_01'),
  requiredObject('FramePrintPivot_02'),
  requiredObject('FramePrintPivot_03'),
  requiredObject('ArchivePhoto_04', 'FramePrintPivot'),
  requiredObject('PhotoMount_04', 'FramePrintPivot'),
  requiredObject('WorkDrawerRoot'),
  requiredObject('Cinema_RailMiddle_Left'),
  requiredObject('Cinema_RailMiddle_Right'),
  requiredObject('WorkFolderPivot'),
  requiredObject('MonitorState_project'),
  requiredObject('MonitorState_photo'),
  requiredObject('MonitorPhoto_Thumbnail', 'MonitorState_photo'),
  requiredObject('StackPhotoViewerSurface', 'MonitorState_photo'),
  requiredObject('NotebookReadingAnchor'),
  requiredObject('AboutReading_TL', 'NotebookReadingAnchor'),
  requiredObject('AboutReading_TR', 'NotebookReadingAnchor'),
  requiredObject('AboutReading_BR', 'NotebookReadingAnchor'),
  requiredObject('AboutReading_BL', 'NotebookReadingAnchor'),
  requiredObject('LifeReading_TL', 'LifePhotoAnchor'),
  requiredObject('LifeReading_TR', 'LifePhotoAnchor'),
  requiredObject('LifeReading_BR', 'LifePhotoAnchor'),
  requiredObject('LifeReading_BL', 'LifePhotoAnchor'),
  requiredObject('FrameReading_TL', 'FramePrintPivot'),
  requiredObject('FrameReading_TR', 'FramePrintPivot'),
  requiredObject('FrameReading_BR', 'FramePrintPivot'),
  requiredObject('FrameReading_BL', 'FramePrintPivot'),
  requiredObject('StackReading_TL'),
  requiredObject('StackReading_TR'),
  requiredObject('StackReading_BR'),
  requiredObject('StackReading_BL'),
  requiredObject('WorkReading_TL'),
  requiredObject('WorkReading_TR'),
  requiredObject('WorkReading_BR'),
  requiredObject('WorkReading_BL'),
])

function issue(
  code: BindingInspectionIssueCode,
  severity: BindingInspectionIssue['severity'],
  detail: string,
  bindingId: string | null = null,
): BindingInspectionIssue {
  return Object.freeze({ code, severity, bindingId, detail })
}

function inspectRange(
  definition: SceneBindingDefinition,
  duration: number | null,
  issues: BindingInspectionIssue[],
): number | null {
  const range = definition.sampleRange
  if (!Number.isFinite(range.start) || range.start < 0) {
    issues.push(issue('invalid-range', 'error', `Invalid sample start ${range.start}.`, definition.id))
    return null
  }
  if (range.kind === 'seconds' && (!Number.isFinite(range.end) || range.end <= range.start)) {
    issues.push(issue('invalid-range', 'error', `Invalid sample range ${range.start}…${range.end}.`, definition.id))
    return null
  }
  if (duration === null || !Number.isFinite(duration)) {
    issues.push(issue('duration-unknown', 'unknown', `Duration is unavailable for ${definition.clip}.`, definition.id))
    return range.kind === 'seconds' ? range.end : null
  }

  const end = range.kind === 'clip-duration' ? duration : range.end
  if (duration <= 0 || end <= range.start) {
    issues.push(issue('invalid-range', 'error', `Sample range ${range.start}…${end} is empty.`, definition.id))
  } else if (end > duration) {
    issues.push(issue('range-outside-duration', 'error', `Sample end ${end} exceeds duration ${duration}.`, definition.id))
  }
  return end
}

/**
 * Inspects immutable scene metadata only. It never creates or samples actions,
 * touches transforms, or treats authored values as an actual readback.
 */
export function inspectSceneBindings(
  scene: StaticSceneDescription,
  definitions: readonly SceneBindingDefinition[] = PERSONAL_ARCHIVE_SCENE_BINDINGS,
): BindingInspection {
  const issues: BindingInspectionIssue[] = []
  const expectedById = new Map(PERSONAL_ARCHIVE_SCENE_BINDINGS.map(item => [item.id, item]))
  const providedById = new Map<string, SceneBindingDefinition[]>()
  for (const definition of definitions) {
    const entries = providedById.get(definition.id) ?? []
    entries.push(definition)
    providedById.set(definition.id, entries)
    const expected = expectedById.get(definition.id)
    if (!expected) {
      issues.push(issue('unknown-binding', 'error', `Unknown binding ${definition.id}.`, definition.id))
    } else if (definition.semanticField !== expected.semanticField) {
      issues.push(issue('semantic-field-mismatch', 'error', `${definition.semanticField} does not match ${expected.semanticField}.`, definition.id))
    }
  }

  for (const [id, entries] of providedById) {
    if (entries.length > 1) issues.push(issue('duplicate-binding-id', 'error', `Binding ${id} is defined ${entries.length} times.`, id))
  }
  for (const expected of PERSONAL_ARCHIVE_SCENE_BINDINGS) {
    if (!providedById.has(expected.id)) issues.push(issue('missing-binding', 'error', `Binding ${expected.id} is missing.`, expected.id))
  }

  const targetWriters = new Map<string, string[]>()
  for (const definition of definitions) {
    const target = `${definition.target.node}.${definition.target.property}`
    const writers = targetWriters.get(target) ?? []
    writers.push(definition.id)
    targetWriters.set(target, writers)
  }
  for (const [target, writers] of targetWriters) {
    if (writers.length > 1) {
      issues.push(issue('duplicate-target-writer', 'error', `${target} is written by ${writers.join(', ')}.`))
    }
  }

  const sceneNodes = new Map<string, StaticSceneDescription['nodes'][number][]>()
  for (const node of scene.nodes) {
    const entries = sceneNodes.get(node.name) ?? []
    entries.push(node)
    sceneNodes.set(node.name, entries)
  }
  for (const [name, entries] of sceneNodes) {
    if (entries.length > 1) issues.push(issue('duplicate-node', 'error', `Scene contains ${entries.length} nodes named ${name}.`))
  }

  const requiredObjects = PERSONAL_ARCHIVE_REQUIRED_OBJECTS.map(required => {
    const nodes = sceneNodes.get(required.name) ?? []
    let status: 'present' | 'missing' | 'invalid' = 'present'
    if (nodes.length === 0) {
      status = 'missing'
      issues.push(issue('missing-required-object', 'error', `Required object ${required.name} is missing.`))
    } else if (nodes.length > 1 || (required.checkParent && nodes[0]?.parent !== required.parent)) {
      status = 'invalid'
      if (nodes.length === 1) {
        issues.push(issue('parent-mismatch', 'error', `${required.name} parent is ${nodes[0]?.parent ?? 'null'}, expected ${required.parent}.`))
      }
    }
    return Object.freeze({ name: required.name, status })
  })

  const definitionsByClip = new Map<string, SceneBindingDefinition[]>()
  for (const definition of definitions) {
    const entries = definitionsByClip.get(definition.clip) ?? []
    entries.push(definition)
    definitionsByClip.set(definition.clip, entries)
  }
  const selectedTargetWriters = new Map<string, Array<Readonly<{ clip: string; bindingIds: readonly string[] }>>>()
  for (const [clip, clipDefinitions] of definitionsByClip) {
    for (const animation of scene.animations.filter(item => item.name === clip)) {
      const channelCounts = new Map<string, number>()
      for (const channel of animation.channels) {
        const target = `${channel.node}.${channel.property}`
        channelCounts.set(target, (channelCounts.get(target) ?? 0) + 1)
        const declared = clipDefinitions.some(definition => (
          definition.target.node === channel.node && definition.target.property === channel.property
        ))
        if (!declared) {
          for (const definition of clipDefinitions) {
            issues.push(issue(
              'undeclared-clip-channel',
              'error',
              `${clip} writes undeclared channel ${target}.`,
              definition.id,
            ))
          }
        }
        const writers = selectedTargetWriters.get(target) ?? []
        writers.push(Object.freeze({ clip, bindingIds: Object.freeze(clipDefinitions.map(item => item.id)) }))
        selectedTargetWriters.set(target, writers)
      }
      for (const [target, count] of channelCounts) {
        if (count <= 1) continue
        for (const definition of clipDefinitions) {
          issues.push(issue(
            'duplicate-scene-channel',
            'error',
            `${clip} contains ${count} channels for ${target}.`,
            definition.id,
          ))
        }
      }
    }
  }
  for (const [target, writers] of selectedTargetWriters) {
    const clips = [...new Set(writers.map(writer => writer.clip))]
    if (clips.length <= 1) continue
    const bindingIds = [...new Set(writers.flatMap(writer => writer.bindingIds))]
    for (const bindingId of bindingIds) {
      issues.push(issue(
        'duplicate-scene-target-writer',
        'error',
        `Selected clips ${clips.join(', ')} all write ${target}.`,
        bindingId,
      ))
    }
  }

  const coverage = PERSONAL_ARCHIVE_SCENE_BINDINGS.map(expected => {
    const definition = providedById.get(expected.id)?.[0]
    if (!definition) {
      return Object.freeze({
        bindingId: expected.id,
        semanticField: expected.semanticField,
        clip: expected.clip,
        target: `${expected.target.node}.${expected.target.property}`,
        sampleStart: expected.sampleRange.start,
        sampleEnd: null,
        status: 'invalid' as const,
      })
    }

    const animations = scene.animations.filter(animation => animation.name === definition.clip)
    let animation: StaticSceneDescription['animations'][number] | undefined = animations[0]
    if (animations.length === 0) {
      const renamed = scene.animations.find(candidate => candidate.channels.some(channel => (
        channel.node === definition.target.node && channel.property === definition.target.property
      )))
      if (renamed) {
        issues.push(issue('clip-name-mismatch', 'error', `Expected ${definition.clip}, found ${renamed.name} for the same target.`, definition.id))
      } else {
        issues.push(issue('missing-clip', 'error', `Animation ${definition.clip} is missing.`, definition.id))
      }
      animation = undefined
    } else if (animations.length > 1) {
      issues.push(issue('duplicate-scene-channel', 'error', `Scene contains ${animations.length} animations named ${definition.clip}.`, definition.id))
    }

    if (!sceneNodes.has(definition.target.node)) {
      issues.push(issue('missing-target-node', 'error', `Target node ${definition.target.node} is missing.`, definition.id))
    }
    if (animation) {
      const exactChannels = animation.channels.filter(channel => (
        channel.node === definition.target.node && channel.property === definition.target.property
      ))
      if (exactChannels.length === 0) {
        const sameNode = animation.channels.filter(channel => channel.node === definition.target.node)
        if (sameNode.length > 0) {
          issues.push(issue('property-mismatch', 'error', `Expected ${definition.target.property}; found ${sameNode.map(channel => channel.property).join(', ')}.`, definition.id))
        } else {
          issues.push(issue('target-mismatch', 'error', `Expected target ${definition.target.node}; found ${animation.channels.map(channel => channel.node).join(', ')}.`, definition.id))
        }
      }
    }

    const sampleEnd = inspectRange(definition, animation?.duration ?? null, issues)
    const bindingIssues = issues.filter(item => item.bindingId === definition.id)
    const status = bindingIssues.some(item => item.severity === 'error')
      ? 'invalid'
      : bindingIssues.some(item => item.severity === 'unknown')
        ? 'unknown'
        : 'covered'
    return Object.freeze({
      bindingId: definition.id,
      semanticField: definition.semanticField,
      clip: definition.clip,
      target: `${definition.target.node}.${definition.target.property}`,
      sampleStart: definition.sampleRange.start,
      sampleEnd,
      status,
    })
  })

  const status = issues.some(item => item.severity === 'error')
    ? 'invalid'
    : issues.some(item => item.severity === 'unknown')
      ? 'unknown'
      : 'valid'
  return Object.freeze({
    status,
    coverage: Object.freeze(coverage),
    requiredObjects: Object.freeze(requiredObjects),
    issues: Object.freeze(issues),
    actionReadback: Object.freeze({ status: 'unavailable', reason: 'static-metadata-only' }),
  })
}
