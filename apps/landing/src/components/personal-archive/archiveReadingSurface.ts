import { Group, Matrix4, Vector3, type Object3D, type PerspectiveCamera, type Texture } from 'three'
import { phase } from './chapterTracks.ts'
import type { SpatialShot } from './archiveDirector'
import { pageMatrix } from './pageProjection.ts'
import type { AnchorPoints, FinalArchiveCamera } from './archiveCameraRig.ts'
import type { StoryFrame } from '../../core/narrative/types.ts'

export interface ProjectionLayout {
  readonly width: number
  readonly height: number
  readonly pageWidth: number
  readonly pageHeight: number
  readonly originX: number
  readonly originY: number
}
export function projectArchiveQuad(points: AnchorPoints, camera: FinalArchiveCamera, layout: ProjectionLayout, expand: number, offset: number) {
  if (points.length !== 4 || !points.every(point => point.every(Number.isFinite)) || ![layout.width, layout.height, layout.pageWidth, layout.pageHeight, layout.originX, layout.originY, expand, offset].every(Number.isFinite)) throw new Error('Nonfinite projection input')
  const world = points.map(p => new Vector3().fromArray(p))
  const [tl, tr, , bl] = world
  if (!tl || !tr || !bl) throw new Error('Missing projection corner')
  const normal = tr.clone().sub(tl).cross(bl.clone().sub(tl)).normalize()
  if (normal.length() < .99) throw new Error('Degenerate projection plane')
  if (normal.dot(new Vector3().fromArray(camera.position).sub(tl)) < 0) normal.negate()
  const view = new Matrix4().fromArray(camera.view), projection = new Matrix4().fromArray(camera.projection)
  const destinations = [[0, 0], [layout.width, 0], [layout.width, layout.height], [0, layout.height]]
  const corners = world.map((p, index) => {
    p.addScaledVector(normal, offset).applyMatrix4(view)
    if (p.z >= -camera.near * 2) throw new Error('Projection crosses near plane')
    p.applyMatrix4(projection)
    if (![p.x, p.y, p.z].every(Number.isFinite) || p.z < -1 || p.z > 1) throw new Error('Projection outside depth range')
    const destination = destinations[index]
    if (!destination) throw new Error('Missing projection destination')
    const x = (p.x + 1) * layout.width / 2, y = (1 - p.y) * layout.height / 2
    return Object.freeze({ x: x + ((destination[0] ?? 0) - x) * expand - layout.originX, y: y + ((destination[1] ?? 0) - y) * expand - layout.originY })
  })
  const matrix = pageMatrix(corners, layout.pageWidth, layout.pageHeight)
  if (!matrix) throw new Error('Degenerate projected quad')
  return Object.freeze({ corners: Object.freeze(corners), matrix: Object.freeze(matrix), offset, layout: Object.freeze({ ...layout }), transformOrigin: '0 0' })
}

export function samplePageLayout(page: HTMLElement, width: number, height: number): ProjectionLayout {
  const offsetParent = page.offsetParent instanceof HTMLElement ? page.offsetParent : null
  // A `position: fixed` page has no offsetParent by spec, and its offsetLeft /
  // offsetTop are already measured from the initial containing block — the
  // viewport, which is exactly the space projectArchiveQuad computes corners in.
  //
  // Falling through to parentElement here, as this used to, added a *scrolling*
  // ancestor's viewport rect to a page that does not scroll. The Index panel is
  // `position: fixed` inside `.hero`, so `.hero`'s rect.top is precisely
  // -scrollY, originY came out as -scrollY, and `y - originY` pushed every
  // corner down one pixel for every pixel scrolled. That was the Index sliding
  // off the monitor as the reader scrolled: never an animation, a coordinate
  // space mixed into a viewport-space calculation.
  const fixed = !offsetParent
    && page.ownerDocument.defaultView?.getComputedStyle(page).position === 'fixed'
  const parent = offsetParent ?? (fixed ? null : page.parentElement)
  const origin = parent?.getBoundingClientRect()
  // offset*, not client*: pageMatrix maps (0,0)-(pageWidth,pageHeight) onto the
  // projected corners, but a CSS transform scales the BORDER box. The entry page
  // and the live About both carry `border-inline: clamp(18px,2vw,32px) solid
  // transparent` for the paper margin, so measuring the content box made the
  // matrix scale everything by borderBox/contentBox — about 4% at a 1440px
  // viewport — and the 3D→2D handoff snapped that 4% away in one frame.
  return Object.freeze({ width, height, pageWidth: page.offsetWidth, pageHeight: page.offsetHeight, originX: (origin?.left ?? 0) + page.offsetLeft, originY: (origin?.top ?? 0) + page.offsetTop })
}

function chapterSurfaces(id: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(id === 'frame' ? '#frame, section[data-archive-theme]' : `#${id}`)).filter(node => !node.closest('[data-archive-clone]'))
}

export function clearSamplePresentation(resetLive = true) {
  const root = document.documentElement
  delete root.dataset.archiveSampleOwner
  if (resetLive) {
    delete root.dataset.archiveRouting
    root.style.removeProperty('--archive-route-source-matrix')
    root.style.removeProperty('--archive-route-target-matrix')
  }
  for (const id of resetLive ? ['about', 'life', 'frame', 'skills', 'projects', 'contact'] : []) {
    for (const live of chapterSurfaces(id)) {
      live.inert = false; live.style.removeProperty('--archive-live-target')
      live.removeAttribute('data-archive-live-target')
      if (id === 'about') live.parentElement?.style.removeProperty('--archive-reading')
    }
  }
  for (const bridge of document.querySelectorAll<HTMLElement>('.archive-bridge')) {
    bridge.style.setProperty('--archive-room', '0'); bridge.style.setProperty('--archive-stage', 'hidden')
    for (const page of bridge.querySelectorAll<HTMLElement>('.archive-bridge__page')) { page.style.opacity = '0'; page.style.pointerEvents = 'none' }
    const hit = bridge.querySelector<HTMLButtonElement>('.archive-bridge__room-hit')
    if (hit) { hit.disabled = true; hit.setAttribute('aria-disabled', 'true'); hit.tabIndex = -1; hit.style.clipPath = 'polygon(0 0,0 0,0 0)'; hit.style.pointerEvents = 'none'; hit.style.visibility = 'hidden' }
  }
}

export function presentSampleFrame(frame: StoryFrame, targetPage: HTMLElement | null, sourcePage: HTMLElement | null,
  target: ReturnType<typeof projectArchiveQuad> | null, source: ReturnType<typeof projectArchiveQuad> | null,
  hitProjection: ReturnType<typeof projectArchiveQuad> | null) {
  const intent = frame.presentation
  // All numeric projections have already passed validation at this point.
  const focused = document.activeElement
  const retiredFocus = focused instanceof HTMLElement && Boolean(focused.closest('#about, #life, #frame, #skills, #projects, #contact, section[data-archive-theme], .archive-bridge__page, .archive-bridge__room-hit')) && !(intent.readingOwner && intent.readingOwner !== 'index' && chapterSurfaces(intent.readingOwner).some(live => live.contains(focused)))
  clearSamplePresentation(false)
  document.documentElement.dataset.archiveSampleOwner = frame.position.segment
  for (const id of ['about', 'life', 'frame', 'skills', 'projects', 'contact']) {
    const lives = chapterSurfaces(id)
    if (!lives.length) throw new Error(`Missing live chapter:${id}`)
    const readable = intent.readingOwner === id
    for (const live of lives) {
      live.inert = !readable
      live.setAttribute('data-archive-live-target', '')
      live.style.setProperty('--archive-live-target', readable ? '1' : '0')
      if (id === 'about') live.parentElement?.style.setProperty('--archive-reading', readable ? 'visible' : 'hidden')
    }
  }
  // The Hero Index panel is position:fixed, inset:0 and painted #070708. Its
  // projected opacity and matrix3d are INLINE styles, which outrank the
  // stylesheet's `opacity: 0`, and nothing reset them when the story left the
  // index segment. The panel therefore stayed on screen for the rest of the
  // page: visible as a stray Index in later chapters, and reading as a black
  // lock wherever it covered a chapter. Release it whenever it is not the
  // surface being presented.
  const indexPanel = document.querySelector<HTMLElement>('.hero__screen-page')
  if (indexPanel && indexPanel !== targetPage && indexPanel !== sourcePage) {
    indexPanel.style.opacity = '0'
    indexPanel.style.pointerEvents = 'none'
    indexPanel.style.removeProperty('transform')
    indexPanel.inert = true
  }
  const bridge = targetPage?.closest<HTMLElement>('.archive-bridge')
  const visible = !intent.readingOwner || intent.readingOwner === 'index'
  if (bridge) {
    bridge.dataset.phase = visible ? 'transfer' : 'released'
    bridge.style.setProperty('--archive-stage', visible ? 'visible' : 'hidden')
    bridge.style.setProperty('--archive-room', visible ? '1' : '0')
    bridge.style.setProperty('--archive-copy', '0')
    bridge.style.setProperty('--archive-target-opacity', String(intent.targetReveal))
  }
  for (const [page, projection, reveal] of [[targetPage, target, intent.targetReveal], [sourcePage, source, intent.sourceReveal]] as const) {
    if (!page) continue
    const interactiveIndex = page === targetPage && intent.readingOwner === 'index'
    page.inert = !interactiveIndex; page.style.pointerEvents = interactiveIndex ? 'auto' : 'none'; page.style.transformOrigin = '0 0'
    page.style.transform = projection ? `matrix3d(${projection.matrix.join(',')})` : 'none'
    page.style.opacity = String(visible && projection ? reveal : 0)
  }
  const hit = bridge?.querySelector<HTMLButtonElement>('.archive-bridge__room-hit')
  const stage = bridge?.querySelector<HTMLElement>('.archive-bridge__stage')
  const stageOwnsViewport = Boolean(stage && Math.abs(stage.getBoundingClientRect().top) < 1)
  if (hit && hitProjection && intent.roomHitEnabled && stageOwnsViewport) {
    const center = hitProjection.corners.reduce((sum, point) => ({
      x: sum.x + point.x / hitProjection.corners.length,
      y: sum.y + point.y / hitProjection.corners.length,
    }), { x: 0, y: 0 })
    const halfWidth = Math.max(...hitProjection.corners.map(point => Math.abs(point.x - center.x)))
    const halfHeight = Math.max(...hitProjection.corners.map(point => Math.abs(point.y - center.y)))
    const left = center.x - halfWidth
    const top = center.y - halfHeight
    Object.assign(hit.style, {
      left: `${left}px`, top: `${top}px`, width: `${halfWidth * 2}px`, height: `${halfHeight * 2}px`,
      pointerEvents: 'auto', visibility: 'visible',
      clipPath: `polygon(${hitProjection.corners.map(point => `${point.x - left}px ${point.y - top}px`).join(',')})`,
    })
    hit.disabled = false; hit.setAttribute('aria-disabled', 'false'); hit.tabIndex = 0
  }
  if (retiredFocus) {
    const destination = (intent.readingOwner && intent.readingOwner !== 'index' && document.getElementById(intent.readingOwner)) || (intent.readingOwner === 'index' ? targetPage : null) || (hit && !hit.disabled ? hit : document.querySelector<HTMLElement>('button[aria-label="Scroll to ABOUT"]'))
    if (destination) {
      const previous = destination.getAttribute('tabindex')
      destination.tabIndex = -1; destination.focus({ preventScroll: true })
      if (previous === null) destination.removeAttribute('tabindex')
      else destination.setAttribute('tabindex', previous)
    }
  }
}

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
    if (projected.some(value => (value[2] ?? NaN) < -1 || (value[2] ?? NaN) > 1)) return

    const width = page.clientWidth
    const height = page.clientHeight
    const matrix = pageMatrix(projected.map(value => ({
      x: ((value[0] ?? NaN) + 1) * width / 2,
      y: (1 - (value[1] ?? NaN)) * height / 2,
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
    if (projected.some(value => (value[2] ?? NaN) < -1 || (value[2] ?? NaN) > 1)) return
    const width = page.clientWidth
    const height = page.clientHeight
    const matrix = pageMatrix(projected.map(value => ({
      x: ((value[0] ?? NaN) + 1) * width / 2,
      y: (1 - (value[1] ?? NaN)) * height / 2,
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
