import { Group, Vector3, type Object3D, type PerspectiveCamera, type Texture } from 'three'
import { phase } from './chapterTracks'
import type { SpatialShot } from './archiveDirector'
import { pageMatrix } from './pageProjection'

/**
 * Project the real chapter composition onto exported paper/screen anchors.
 * The scene owns depth and light; the DOM remains the only typography source.
 */
export function createArchiveReadingSurface(model: Object3D) {
  const mesh = new Group()
  mesh.name = 'ArchiveReadingSheet'
  mesh.visible = false
  const textures = new Map<SpatialShot, Texture>()
  let active = false
  const point = new Vector3()
  const normal = new Vector3()
  const right = new Vector3()
  const down = new Vector3()
  const anchors = ['TL', 'TR', 'BR', 'BL'] as const
  const ndc = [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const

  function prepare(shot: SpatialShot, page: HTMLElement) {
    // Real React composition is already mounted. Readiness is owned by the
    // shared page/font/image preloader rather than a second Canvas text pass.
    void shot
    void page
  }

  function update(
    shot: SpatialShot,
    p: number,
    surface: string,
    camera: PerspectiveCamera,
    page: HTMLElement | null,
  ) {
    if (page) {
      page.style.opacity = '0'
      page.style.transform = 'none'
      page.style.pointerEvents = 'none'
    }
    mesh.visible = false
    mesh.userData.archiveSurface = undefined
    active = false
    if (!page) return

    const reveal = shot === 'index' ? 1 - phase(p, .72, .96) : phase(p, .66, .74)
    if (reveal === 0) return
    const expand = shot === 'index' ? 0 : phase(p, .94, 1)
    const points = anchors.map(suffix => model.getObjectByName(`${surface}_${suffix}`)?.getWorldPosition(new Vector3()))
    if (points.some(value => !value)) return
    const [tl, tr, , bl] = points
    if (!tl || !tr || !bl) return

    normal.copy(right.copy(tr).sub(tl)).cross(down.copy(bl).sub(tl)).normalize()
    if (normal.dot(point.copy(camera.position).sub(tl)) < 0) normal.negate()
    const projected: number[][] = []
    for (let index = 0; index < points.length; index++) {
      const world = points[index]
      const corner = ndc[index]
      if (!world || !corner) return
      world.addScaledVector(normal, .0015)
      const view = world.clone().applyMatrix4(camera.matrixWorldInverse)
      if (expand < 1 && view.z >= -camera.near * 2) return
      const screen = world.project(camera)
      // Only after alignment and dolly: settle aspect ratio in screen coordinates.
      // No near-camera plane can sweep through the room or cross the near clip.
      screen.x += (corner[0] - screen.x) * expand
      screen.y += (corner[1] - screen.y) * expand
      projected.push(screen.toArray())
    }
    if (projected.some(value => value[2]! < -1 || value[2]! > 1)) return

    const width = page.clientWidth
    const height = page.clientHeight
    const matrix = pageMatrix(projected.map(value => ({
      x: (value[0]! + 1) * width / 2,
      y: (1 - value[1]!) * height / 2,
    })), width, height)
    if (!matrix) return

    page.style.transform = `matrix3d(${matrix.join(',')})`
    page.style.opacity = String(reveal)
    page.style.pointerEvents = shot === 'index' && reveal > .02 ? 'auto' : 'none'
    if (shot === 'entry') page.style.setProperty('--paper-hint', String(expand))
    mesh.userData.archiveSurface = { shot, expand, merge: 0, projected, depthTest: false }
    active = true
  }

  /** Project an outgoing live-composition snapshot back onto its own object. */
  function projectSource(
    page: HTMLElement,
    surface: string,
    camera: PerspectiveCamera,
    reveal: number,
    expand: number,
  ) {
    page.style.opacity = '0'
    page.style.pointerEvents = 'none'
    if (reveal <= 0) return
    const points = anchors.map(suffix => model.getObjectByName(`${surface}_${suffix}`)?.getWorldPosition(new Vector3()))
    if (points.some(value => !value)) return
    const [tl, tr, , bl] = points
    if (!tl || !tr || !bl) return
    normal.copy(right.copy(tr).sub(tl)).cross(down.copy(bl).sub(tl)).normalize()
    if (normal.dot(point.copy(camera.position).sub(tl)) < 0) normal.negate()
    const projected: number[][] = []
    for (let index = 0; index < points.length; index++) {
      const world = points[index]
      const corner = ndc[index]
      if (!world || !corner) return
      world.addScaledVector(normal, .0018)
      const screen = world.project(camera)
      // Only after alignment and dolly: settle aspect ratio in screen coordinates.
      // No near-camera plane can sweep through the room or cross the near clip.
      screen.x += (corner[0] - screen.x) * expand
      screen.y += (corner[1] - screen.y) * expand
      projected.push(screen.toArray())
    }
    if (projected.some(value => value[2]! < -1 || value[2]! > 1)) return
    const width = page.clientWidth
    const height = page.clientHeight
    const matrix = pageMatrix(projected.map(value => ({
      x: (value[0]! + 1) * width / 2,
      y: (1 - value[1]!) * height / 2,
    })), width, height)
    if (!matrix) return
    page.style.transform = `matrix3d(${matrix.join(',')})`
    page.style.opacity = String(reveal)
    active = true
  }

  return {
    mesh,
    textures,
    prepare,
    update,
    projectSource,
    get active() { return active },
    dispose() { textures.clear() },
  }
}
