import { Mesh, Vector3, Texture, type Object3D, type Material } from 'three'
import type { ArchiveAnimationRig, ArchiveAnimationOwner, ArchiveAnimationOwnerToken } from './archiveAnimationRig.ts'
import type { StoryFrame } from '../../core/narrative/types.ts'
import { PERSONAL_ARCHIVE_REQUIRED_OBJECTS } from './sceneBindings.ts'
import { createArchivePhotoTransfer } from './archivePhotoTransfer.ts'

export interface ExecutionPermit {
  readonly kind: 'foreground' | 'prepare'
  readonly owner: ArchiveAnimationOwner
  readonly ownerEpoch: number
  readonly resourceGeneration: number
  readonly layoutVersion: number
  readonly requestId: number
}
export interface LegacyWorldPlan {
  readonly amounts: Readonly<Record<string, number>>
  readonly monitorPhoto: boolean
  readonly wallPhoto?: boolean
}
const carriers = ['LifeMemoryPhoto', 'Life_PhotoPaper', 'ArchivePhoto_04', 'PhotoMount_04', 'MonitorState_project', 'MonitorState_photo'] as const
const surfaces = ['AboutReading', 'LifeReading', 'FrameReading', 'StackReading', 'WorkReading', 'ContactReading'] as const
export function createArchiveExecution(model: Object3D, rig: ArchiveAnimationRig) {
  let epoch = 0, generation = 0, disposed = false
  let owner: ArchiveAnimationOwner | null = null
  let token: ArchiveAnimationOwnerToken | null = null
  let currentPermit: ExecutionPermit | null = null
  let photoTransfer: ReturnType<typeof createArchivePhotoTransfer> | null = null
  const nodeCache = new Map<string, Object3D>() // keyed per resource generation: scene graph identities only change on invalidate(true)
  const baseline = new Map(carriers.map(name => [name, model.getObjectByName(name)?.visible]))
  function requirePermit(permit: ExecutionPermit) {
    if (disposed || permit !== currentPermit || permit.ownerEpoch !== epoch || permit.resourceGeneration !== generation || permit.owner !== owner || !token) throw new Error('Stale archive execution permit')
    return token
  }
  function begin(next: ArchiveAnimationOwner, kind: ExecutionPermit['kind'], requestId: number, layoutVersion: number): ExecutionPermit {
    if (disposed) throw new Error('Disposed archive execution')
    if (owner !== next || !token) { owner = next; epoch++; token = rig.claim(next) }
    currentPermit = Object.freeze({ kind, owner: next, ownerEpoch: epoch, resourceGeneration: generation, layoutVersion, requestId })
    return currentPermit
  }
  function invalidate(resource = false) {
    epoch++; if (resource) { generation++; photoTransfer?.dispose(); photoTransfer = null; nodeCache.clear() }
    photoTransfer?.hide(); token = null; owner = null; currentPermit = null
  }
  function node(name: string) {
    const cached = nodeCache.get(name)
    if (cached) return cached
    const result = model.getObjectByName(name)
    if (!result) throw new Error(`Missing archive node:${name}`)
    nodeCache.set(name, result)
    return result
  }
  function readNodes() {
    return Object.freeze(PERSONAL_ARCHIVE_REQUIRED_OBJECTS.map(({ name }) => {
      const object = node(name)
      const materials: Material[] = object instanceof Mesh ? (Array.isArray(object.material) ? object.material : [object.material]) as Material[] : []
      return Object.freeze({ name, parent: object.parent?.name ?? null, visible: object.visible,
        position: Object.freeze(object.position.toArray()), quaternion: Object.freeze(object.quaternion.toArray()), scale: Object.freeze(object.scale.toArray()), matrixWorld: Object.freeze([...object.matrixWorld.elements]),
        materials: Object.freeze(materials.map(m => {
          const map = 'map' in m && m.map instanceof Texture ? m.map : null
          return Object.freeze({ name: m.name, opacity: m.opacity, transparent: m.transparent, visible: m.visible, depthWrite: m.depthWrite,
            texture: map ? Object.freeze({ name: map.name, role: 'base-color', colorSpace: map.colorSpace, flipY: map.flipY, wrapS: map.wrapS, wrapT: map.wrapT, repeat: Object.freeze(map.repeat.toArray()), offset: Object.freeze(map.offset.toArray()) }) : null })
        })) })
    }))
  }
  function sample(permit: ExecutionPermit, frame: StoryFrame) {
    const currentToken = requirePermit(permit)
    if (permit.owner !== 'sample') throw new Error('Sample requires sample owner')
    // Resolve every non-animation dependency before A can write any action.
    const targets = carriers.map(node)
    const projectMonitor = targets[4]
    const photoMonitor = targets[5]
    if (!projectMonitor || !photoMonitor) throw new Error('Sample unavailable:missing-monitor-state')
    for (const object of targets.slice(0, 4)) {
      if (!(object instanceof Mesh)) throw new Error(`Sample unavailable:missing-mesh:${object.name}`)
      const materials: Material[] = (Array.isArray(object.material) ? object.material : [object.material]) as Material[]
      if (materials.length === 0 || materials.some(material => !material || !Number.isFinite(material.opacity))) throw new Error(`Sample unavailable:invalid-material:${object.name}`)
      if ((object.name === 'LifeMemoryPhoto' || object.name === 'ArchivePhoto_04') && !materials.some(material => 'map' in material && material.map instanceof Texture && material.map.source.data)) throw new Error(`Sample unavailable:missing-photo-texture:${object.name}`)
    }
    for (const surface of surfaces) for (const corner of ['TL', 'TR', 'BR', 'BL']) node(`${surface}_${corner}`)
    const result = rig.sample(currentToken, frame.world)
    if (result.status !== 'applied') throw new Error(`Sample unavailable:${result.issues.join(';')}`)
    model.updateMatrixWorld(true)
    photoTransfer ??= createArchivePhotoTransfer(model)
    photoTransfer.apply(frame.world.photo.placement)
    const photo = photoTransfer.readback()
    projectMonitor.visible = false
    photoMonitor.visible = frame.world.screen.mode === 'photo'
    const anchors: Record<string, readonly (readonly number[])[]> = {}
    anchors.FootballTransfer = photo.actual.slice(0,4)
    anchors.FootballSource = photo.source
    anchors.FootballWall = photo.target
    for (const surface of surfaces) anchors[surface] = Object.freeze(['TL', 'TR', 'BR', 'BL'].map(corner => Object.freeze(new Vector3().setFromMatrixPosition(node(`${surface}_${corner}`).matrixWorld).toArray())))
    return Object.freeze({ animation: rig.readback(), nodes: readNodes(), anchors: Object.freeze(anchors), photoMode: 'continuous-surface-v1' as const, transferGeometryApplied: true as const, photo })
  }
  function legacy(permit: ExecutionPermit, plan: LegacyWorldPlan) {
    const currentToken = requirePermit(permit)
    if (permit.owner !== 'legacy') throw new Error('Legacy requires legacy owner')
    photoTransfer?.hide()
    for (const [clip, amount] of Object.entries(plan.amounts)) rig.seekLegacy(currentToken, clip, amount)
    rig.evaluateLegacy(currentToken)
    carriers.forEach((name, index) => {
      const object = model.getObjectByName(name)
      if (!object) return
      object.visible = index === 4 ? false : index === 5 ? plan.monitorPhoto : plan.wallPhoto === undefined ? baseline.get(name) ?? true : index < 2 ? !plan.wallPhoto : plan.wallPhoto
    })
  }
  return { begin, sample, legacy, invalidate, validate: requirePermit, readNodes,
    get owner() { return owner }, get resourceGeneration() { return generation },
    dispose() { invalidate(); photoTransfer?.dispose(); photoTransfer = null; nodeCache.clear(); disposed = true },
  }
}
