import { HalfFloatType, Mesh, PerspectiveCamera, Raycaster, Scene, Texture, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, type Material, type BufferGeometry } from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { acquireRetainedContext, type ContextLease } from '../../lib/webgl/contextRegistry'
import { getGLQualityProfile } from '../../lib/webgl/quality'
import modelUrl from '../../assets/personal-archive/personal-space.glb?url'
import type { ArchiveView, SpatialShot } from './archiveDirector'
import { createArchiveAtmosphere } from './archiveAtmosphere'
import { createArchiveBackdrop } from './archiveBackdrop'
import { createArchiveLighting } from './archiveRuntimeLighting'
import { clearSamplePresentation, presentSampleFrame, projectArchiveQuad, samplePageLayout } from './archiveReadingSurface'
import { createArchiveSignal } from './archiveRuntimeSignal'
import { prepareArchiveMaterials } from './archiveMaterials'
import { createArchiveFinitePass } from './archiveRenderSafety'
import type { ArchiveProgress } from './scrollPose'
import { createSharedResource } from '../../lib/resources/sharedResource'
import { reportArchiveBytes, resetArchiveBytes } from '../../lib/resources/downloadProgress'
import { prepareChapterPages } from '../../lib/resources/prepareChapterPages'
import { addContactReadingPlane } from './readingFrame'
import { calibrateRoomPaper } from './roomPalette'
import { phase } from './chapterTracks'
import { createArchiveAnimationRig } from './archiveAnimationRig'
import { createArchiveExecution } from './archiveExecution'
import { solveArchiveCamera, applyArchiveCamera } from './archiveCameraRig'
import { getSampleLayout, positionAtScroll, retainSamplePosition, getRetainedSamplePosition, invalidateSampleLayout, ARCHIVE_ROOM_PROGRESS } from './archiveSamplePosition'
import { currentArchiveRequest, cancelArchiveRouting } from '../../lib/archiveRoute'
import { sampleStory } from '../../core/narrative/sampleStory'
import { PERSONAL_ARCHIVE_SAMPLE_STORY } from '../../core/narrative/specs'
import type { ArchiveSeekResult } from '../../lib/chapterScroll'
import type { StoryChapter, StoryPosition } from '../../core/narrative/types'

interface SurfaceEvents { ready(): void; pending(): void; failed(): void }
interface ActiveSurface {
  token: symbol
  alive: boolean
  page: HTMLElement | null
  sourcePage: HTMLElement | null
  shot: SpatialShot
  progress: ArchiveProgress
  events: SurfaceEvents
}
export interface ArchiveRuntime {
  readingTransition(requestId: number, chapter: StoryChapter, mode: 'return' | 'open', layer: HTMLElement, from?: number): Promise<ArchiveSeekResult>
  commitPosition(requestId: number, targetId?: string): ArchiveSeekResult
  setIndexInspection(amount: number): void
  mount(host: HTMLElement): () => void
  rest(view: ArchiveView): void
  activate(page: HTMLElement | null, sourcePage: HTMLElement | null, shot: SpatialShot, progress: ArchiveProgress, events: SurfaceEvents): () => void
  dispose(): void
}
let current: ArchiveRuntime | null = null
export const archiveEnabled = () => !matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches

function disposeModel(model: GLTF) {
  const materials = new Set<Material>(), textures = new Set<Texture>()
  model.scene.traverse(object => {
    if (!(object instanceof Mesh)) return
    const mesh = object as Mesh<BufferGeometry, Material | Material[]>
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material)
  })
  for (const material of materials) {
    Object.values(material).forEach(value => { if (value instanceof Texture) textures.add(value) }); material.dispose()
  }
  for (const texture of textures) { texture.dispose(); const data: unknown = texture.source.data; if (data instanceof ImageBitmap) data.close() }
}

async function createRuntime(signal: AbortSignal): Promise<ArchiveRuntime> {
  const response = await fetch(modelUrl, { signal })
  if (!response.ok) throw new Error(`Archive model HTTP ${response.status}`)
  // Stream instead of arrayBuffer() so the intro can show this download moving.
  // It is the single largest thing the site fetches, and it used to be one opaque
  // wait. Falls back to the buffered read when the body cannot be streamed or the
  // length is unknown, in which case the bar simply keeps its task-level weight.
  const declared = Number(response.headers.get('content-length') ?? 0)
  let bytes: ArrayBuffer
  if (response.body && Number.isFinite(declared) && declared > 0) {
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    reportArchiveBytes(0, declared)
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) { chunks.push(value); received += value.byteLength; reportArchiveBytes(received, declared) }
      }
    } catch (error) { resetArchiveBytes(); throw error }
    const joined = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
    bytes = joined.buffer as ArrayBuffer
  } else {
    bytes = await response.arrayBuffer()
  }
  reportArchiveBytes(1, 1)
  const assetHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('')
  const model = await new GLTFLoader().parseAsync(bytes, '')
  let lease: ContextLease | undefined, renderer: WebGLRenderer | undefined
  const cleanup: (() => void)[] = [() => disposeModel(model)]
  try {
    signal.throwIfAborted(); lease = acquireRetainedContext('personal-archive-shared')
    renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    const gl = renderer, canvas = gl.domElement
    let shaderFailure: Error | null = null
    gl.debug.onShaderError = (context, program) => {
      shaderFailure = new Error(`Archive shader failed: ${context.getProgramInfoLog(program) ?? 'unknown shader error'}`)
    }
    canvas.dataset.archiveShared = 'true'
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', display: 'block' })
    const scene = new Scene(), camera = new PerspectiveCamera(40, innerWidth / innerHeight, .01, 80)
    scene.add(model.scene)
    cleanup.push(addContactReadingPlane(model.scene))
    const lighting = createArchiveLighting(gl, scene); cleanup.push(() => lighting.dispose())
    const animationRig = createArchiveAnimationRig(model); cleanup.push(() => animationRig.dispose())
    const execution = createArchiveExecution(model.scene, animationRig); cleanup.push(() => execution.dispose())
    const signalPicture = await createArchiveSignal(model.scene); cleanup.push(() => signalPicture.dispose())
    const atmosphere = createArchiveAtmosphere(model.scene); cleanup.push(() => atmosphere.dispose())
    await prepareChapterPages(signal)
    await document.fonts.ready
    const textures = new Set<Texture>()
    prepareArchiveMaterials(model.scene, gl.capabilities.getMaxAnisotropy())
    const backdrop = createArchiveBackdrop(model.scene)
    if (backdrop) cleanup.push(() => backdrop.dispose())
    model.scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        Object.values(material as Material).forEach(value => { if (value instanceof Texture) textures.add(value) })
      }
    })
    for (const texture of [...textures, ...signalPicture.textures]) {
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); texture.needsUpdate = true; gl.initTexture(texture)
    }
    const context = gl.getContext()
    const webgl2 = context as WebGL2RenderingContext
    const halfFloatSamples = gl.capabilities.isWebGL2 && context.getExtension('EXT_color_buffer_float')
      ? Array.from(webgl2.getInternalformatParameter(webgl2.RENDERBUFFER, webgl2.RGBA16F, webgl2.SAMPLES) as Int32Array)
      : []
    const quality = getGLQualityProfile()
    const requestedSamples = quality.tier === 'high' ? 4 : quality.tier === 'medium' ? 2 : 0
    const samples = halfFloatSamples
      .filter(value => Number.isFinite(value) && value > 0 && value <= requestedSamples)
      .sort((a, b) => b - a)[0] ?? 0
    const renderTarget = new WebGLRenderTarget(innerWidth, innerHeight, { type: HalfFloatType, samples })
    const composer = new EffectComposer(gl, renderTarget), renderPass = new RenderPass(scene, camera)
    const focus = new BokehPass(scene, camera, { focus: 1, aperture: .000025, maxblur: .0025 })
    const focusUniforms = focus.uniforms as Record<string, { value: number }>
    const bloom = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), .12, .35, 1.35), output = new OutputPass()
    const finite = createArchiveFinitePass()
    const fxaa = samples === 0 ? new ShaderPass(FXAAShader) : null
    composer.addPass(renderPass); composer.addPass(finite); composer.addPass(focus); composer.addPass(bloom); composer.addPass(output)
    if (fxaa) composer.addPass(fxaa)
    canvas.dataset.archiveAa = samples > 0 ? `msaa-${samples}x` : 'fxaa'
    cleanup.push(() => { finite.dispose(); focus.dispose(); bloom.dispose(); output.dispose(); fxaa?.dispose(); composer.dispose(); renderTarget.dispose() })
    let width = innerWidth, height = innerHeight, frame = 0, disposed = false
    let state: 'ready' | 'recovering' | 'failed' = 'ready', recovery = 0, recoveryTimer = 0
    let mountedHost: HTMLElement | null = null
    let indexPage: HTMLElement | null = null
    let active: ActiveSurface | null = null
    let preparing = true, attemptId = 0, frameId = 0
    let sampleUnavailable: string | null = null
    let transientSampleFailure: Readonly<{ layoutVersion: number; requestId: number; resourceGeneration: number }> | null = null
    let lastSampleCommitted = false
    let indexInspection=0
    let readingRoute: { requestId: number; layoutVersion: number; resourceGeneration: number; chapter: StoryChapter; mode: 'return' | 'open'; layer: HTMLElement; started: number; from?: number; resolve(result: ArchiveSeekResult): void } | null = null
    let lastWorldKey = ''
    function endReadingRoute(result: ArchiveSeekResult) {
      const route = readingRoute
      if (!route) return
      readingRoute = null
      route.layer.remove()
      if (document.documentElement.dataset.archiveReadingRequest === String(route.requestId)) {
        delete document.documentElement.dataset.archiveReadingRequest
        delete document.documentElement.dataset.archiveRouting
        delete document.documentElement.dataset.archiveReturnPhase
      }
      route.resolve(result)
    }
    type DrawResult = 'sample' | 'none'
    function reveal(result: DrawResult) {
      if (result === 'none' || disposed || preparing || state !== 'ready' || !mountedHost) return
      canvas.style.visibility = 'visible'
      document.documentElement.dataset.archiveVisible = 'true'
    }
    const records: unknown[] = []
    let diagnosticEnabled = false
    const diagnosticHost = window as unknown as Record<string, unknown>
    let diagnostic: Readonly<{ getSnapshot(): readonly unknown[] }> | null = null
    try {
      diagnosticEnabled = diagnosticHost.__portfolioArchiveExecutionEnabled === true && !('__portfolioArchiveExecution' in diagnosticHost)
      if (diagnosticEnabled) {
        diagnostic = Object.freeze({ getSnapshot: () => Object.freeze([...records]) })
        Object.defineProperty(diagnosticHost, '__portfolioArchiveExecution', { configurable: true, value: diagnostic })
      }
    } catch { diagnosticEnabled = false }
    function record(build: () => unknown) {
      if (!diagnosticEnabled) return
      const value = build()
      try {
        const freeze = (item: unknown): unknown => {
          if (item && typeof item === 'object') { for (const child of Object.values(item)) freeze(child); Object.freeze(item) }
          return item
        }
        records.push(freeze(JSON.parse(JSON.stringify(value)) as unknown)); if (records.length > 32) records.shift()
      } catch { /* diagnostics cannot affect execution */ }
    }
    function photoVisibility(points: number[][], owner: string) {
      const ray = new Raycaster()
      return points.map(point => {
        const world = new Vector3().fromArray(point), direction = world.clone().sub(camera.position)
        ray.set(camera.position,direction.clone().normalize()); ray.far = direction.length()-1e-5
        const blocked = ray.intersectObject(model.scene,true).find(hit => {
          if (hit.object.name === owner || !(hit.object instanceof Mesh)) return false
          let visible = true
          hit.object.traverseAncestors(parent => { if (!parent.visible) visible = false })
          const mesh = hit.object as Mesh<BufferGeometry, Material | Material[]>
          const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material
          return visible && hit.object.visible && material?.visible && material.opacity > .99 && !('transmission' in material && Number(material.transmission) > 0)
        })
        return { ndc:world.project(camera).toArray(), blockedBy:blocked?.object.name ?? null, distance:blocked?.distance ?? null }
      })
    }
    cleanup.push(() => { try { if (diagnosticHost.__portfolioArchiveExecution === diagnostic) delete diagnosticHost.__portfolioArchiveExecution; records.length = 0 } catch { /* diagnostic cleanup is isolated */ } })
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, ambientFrame = 0, lastAmbient = 0
    const pointerMove = (event: PointerEvent) => {
      targetX = event.clientX / Math.max(1, innerWidth) * 2 - 1
      targetY = 1 - event.clientY / Math.max(1, innerHeight) * 2
    }
    const pointerLeave = () => { targetX = 0; targetY = 0 }
    const ambient = (now: number) => {
      if (disposed || document.hidden) { ambientFrame = 0; return }
      ambientFrame = requestAnimationFrame(ambient)
      if (state !== 'ready' || !mountedHost || (!active && !getRetainedSamplePosition()) || now - lastAmbient < 16) return
      const delta = Math.min(.05, (now - lastAmbient) / 1000); lastAmbient = now
      const blend = 1 - Math.exp(-delta * 5)
      pointerX += (targetX - pointerX) * blend; pointerY += (targetY - pointerY) * blend
      atmosphere.update(now / 1000)
      schedule()
    }
    window.addEventListener('pointermove', pointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', pointerLeave)
    ambientFrame = requestAnimationFrame(ambient)
    cleanup.push(() => {
      cancelAnimationFrame(ambientFrame)
      window.removeEventListener('pointermove', pointerMove)
      document.documentElement.removeEventListener('pointerleave', pointerLeave)
    })
    const setState = (next: typeof state) => { state = next; canvas.dataset.archiveState = next }
    setState('ready')
    function hide() {
      lastSampleCommitted = false
      canvas.style.visibility = 'hidden'
      if (active?.page) active.page.style.opacity = '0'
      if (active?.sourcePage) active.sourcePage.style.opacity = '0'
      delete document.documentElement.dataset.archiveVisible
      cancelAnimationFrame(frame); frame = 0
    }
    function fail(error: unknown) {
      if (disposed) return
      endReadingRoute('readable-fallback')
      setState('failed'); hide(); window.clearTimeout(recoveryTimer)
      console.error('[personal-archive] Rendering failed', error)
      active?.events.failed()
      execution.invalidate(); clearSamplePresentation()
      document.documentElement.dataset.archiveSampleFallback = 'true'
      record(() => ({ kind: 'execution-error', attemptId, reason: error instanceof Error ? error.message : String(error) }))
    }
    function sampleFallback(error: unknown, layoutVersion: number, requestId: number) {
      endReadingRoute('readable-fallback')
      const reason = error instanceof Error ? error.message : String(error)
      const recoverable = !/Sample unavailable:|Missing archive node:/.test(reason)
      if (recoverable) transientSampleFailure = Object.freeze({ layoutVersion, requestId, resourceGeneration: execution.resourceGeneration })
      else sampleUnavailable = reason
      clearSamplePresentation(); hide(); execution.invalidate()
      document.documentElement.dataset.archiveSampleFallback = 'true'
      if (recoverable) active?.events.pending()
      else active?.events.failed()
      record(() => ({ kind: 'execution-error', attemptId, reason, recoverable, layoutVersion, requestId, resourceGeneration: execution.resourceGeneration }))
    }
    function drawSample(requestId = currentArchiveRequest().requestId): boolean {
      lastSampleCommitted = false
      if (preparing || !mountedHost || state !== 'ready') return false
      const layout = getSampleLayout()
      if (!layout) {
        if (!getRetainedSamplePosition()) return false
        clearSamplePresentation(); hide(); return true
      }
      if (readingRoute && (readingRoute.requestId !== requestId || readingRoute.layoutVersion !== layout.version || readingRoute.resourceGeneration !== execution.resourceGeneration)) endReadingRoute('cancelled')
      const route = readingRoute
      const routeSegment = route ? ({ about:'entry', life:'about-life', frame:'life-frame', stack:'frame-stack', work:'stack-work', contact:'work-contact' } as const)[route.chapter] : null
      // A RETURN retraces toward ARCHIVE_ROOM_PROGRESS instead of stopping where the authored
      // path is already spent; an OPEN resumes from wherever the reader actually was, so
      // docking to a surface has no start pop. Duration follows the distance actually covered,
      // so a near carrier and a far one no longer share one wall-clock number.
      const routeFrom = !route ? 0 : route.mode === 'return' ? 1 : Math.min(1, Math.max(0, route.from ?? ARCHIVE_ROOM_PROGRESS))
      const routeTo = route?.mode === 'return' ? ARCHIVE_ROOM_PROGRESS : 1
      const elapsed = route ? performance.now() - route.started : 0
      const routeProgress = Math.min(1, elapsed / (560 + 620 * Math.abs(routeTo - routeFrom)))
      const movement = phase(routeProgress,0,1)
      const routePosition: StoryPosition | null = route && routeSegment
        ? { segment:routeSegment, progress: routeFrom + (routeTo - routeFrom) * movement } : null
      const position = routePosition ?? positionAtScroll(layout, scrollY)
      if (!position) {
        if (execution.owner === 'sample') clearSamplePresentation()
        retainSamplePosition(null)
        return false
      }
      if (!route) retainSamplePosition(position)
      if (sampleUnavailable) { clearSamplePresentation(); hide(); return true }
      if (transientSampleFailure?.layoutVersion === layout.version && transientSampleFailure.requestId === requestId && transientSampleFailure.resourceGeneration === execution.resourceGeneration) return true
      transientSampleFailure = null
      attemptId++
      lastSampleCommitted = false
      let rendering = false
      const trace: string[] = []
      try {
        if (currentArchiveRequest().requestId !== requestId) throw new Error('Stale sample request')
        const permit = execution.begin('sample', 'foreground', requestId, layout.version)
        trace.push('permit-check')
        const sampled = sampleStory({ position, storyVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion, contentVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion, user:{indexInspection} })
        for (const id of ['about', 'life', 'frame', 'skills', 'projects', 'contact']) if (!document.getElementById(id)) throw new Error(`Missing live chapter:${id}`)
        const currentIndexPage = indexPage ?? document.querySelector<HTMLElement>('.hero__screen-page')
        if (!indexPage && currentIndexPage) indexPage = currentIndexPage
        const bridge = position.segment === 'entry' ? document.getElementById('archive-entry')
          : position.segment === 'about-life' || position.segment === 'life-frame' || position.segment === 'frame-stack' || position.segment === 'stack-work' || position.segment === 'work-contact' ? document.querySelector<HTMLElement>(`[data-archive-track="${position.segment}"]`) : null
        const page = position.segment === 'index' ? currentIndexPage : bridge?.querySelector<HTMLElement>(position.segment === 'entry' ? '.archive-bridge__page' : '.archive-chapter-bridge__page') ?? null
        const sourcePage = position.segment === 'entry' ? currentIndexPage : bridge?.querySelector<HTMLElement>('.archive-bridge__page--source') ?? null
        if (bridge && (!page || !sourcePage)) throw new Error('Missing sample preview DOM')
        const world = execution.sample(permit, sampled)
        trace.push('actions/world', 'matrix/anchors')
        // Parallax was hard-cut to zero for the whole route and restored at full gain on the
        // first scroll-driven frame, which snapped the camera the instant a return landed.
        // It now ramps along the same curve that drives the move.
        const pointerScale = route ? (route.mode === 'return' ? movement : 1 - movement) : 1
        const finalCamera = solveArchiveCamera(sampled, world.anchors, layout.viewport, { x: pointerX * pointerScale, y: pointerY * pointerScale })
        applyArchiveCamera(camera, finalCamera)
        // Slide the outside view before anything reads the scene, so the window can
        // never frame past the edge of it from any authored position.
        backdrop?.update(camera.position, performance.now() / 1000)
        trace.push('camera')
        const pageLayout = (element: HTMLElement, kind: 'source' | 'target') => {
          const snapshot = layout.pages[`${position.segment}:${kind}`]
          const currentLayout = samplePageLayout(element, layout.viewport.width, layout.viewport.height)
          if (!snapshot || snapshot.pageWidth !== currentLayout.pageWidth || snapshot.pageHeight !== currentLayout.pageHeight) throw new Error('Page size changed without a valid layout refresh')
          // Sticky containers move on scroll without changing layout. Sizes are
          // versioned; their current viewport origin is captured once per draw.
          return { ...snapshot, originX: currentLayout.originX, originY: currentLayout.originY }
        }
        const target = !route && page && sampled.presentation.targetReveal > 0 && (!sampled.presentation.readingOwner || sampled.presentation.readingOwner === 'index') ? projectArchiveQuad(world.anchors[sampled.presentation.targetSurface]!, finalCamera, pageLayout(page, 'target'), sampled.presentation.targetExpand, .0015) : null
        // An empty source page must never be presented. It carries the paper
        // surface as its own background, so with nothing cloned into it a full
        // viewport of near-white is all the reader sees. That was survivable while
        // the sheet retracted onto the notebook within progress .18; now that it
        // holds its registration and only dissolves, an empty one is a white screen.
        const sourceHasContent = Boolean(sourcePage?.firstChild)
        const source = !route && sourcePage && sourceHasContent && sampled.presentation.sourceSurface && sampled.presentation.sourceReveal > 0 ? projectArchiveQuad(world.anchors[sampled.presentation.sourceSurface]!, finalCamera, pageLayout(sourcePage, 'source'), sampled.presentation.sourceExpand, .0018) : null
        // Direct open/return reuses the sampled bridge coordinate. The route
        // layer therefore retracts into the same real surface at the same T
        // that expands it, rather than owning a second animation curve.
        const routeExpand = route ? sampled.presentation.targetExpand : 0
        const routeProjection = route ? projectArchiveQuad(world.anchors[`${route.chapter[0]!.toUpperCase()}${route.chapter.slice(1)}Reading`]!,finalCamera,{width,height,pageWidth:width,pageHeight:height,originX:0,originY:0},routeExpand,.0018) : null
        let hit: ReturnType<typeof projectArchiveQuad> | null = null
        if (!route && page && sampled.presentation.roomHitEnabled) {
          try { hit = projectArchiveQuad(world.anchors[sampled.presentation.targetSurface]!, finalCamera, { ...pageLayout(page, 'target'), pageWidth: width, pageHeight: height }, 0, .0015) } catch { hit = null }
        }
        trace.push('projections')
        execution.validate(permit)
        if (getSampleLayout() !== layout || currentArchiveRequest().requestId !== requestId) throw new Error('Stale sample layout/request')
        presentSampleFrame(route ? {...sampled,presentation:{...sampled.presentation,readingOwner:null,roomHitEnabled:false,sourceReveal:0,targetReveal:0}} : sampled, page, sourcePage, target, source, hit)
        if (route && routeProjection) {
          document.documentElement.dataset.archiveRouting = 'true'
          document.documentElement.dataset.archiveReturnPhase = route.mode === 'open' ? 'expand' : routeProgress < .3 ? 'retract' : 'move'
          route.layer.style.transform = `matrix3d(${routeProjection.matrix.join(',')})`
          route.layer.style.opacity = String(route.mode === 'return' ? 1-phase(routeProgress,.45,.95) : 1)
        }
        focusUniforms.focus!.value = finalCamera.focus
        focusUniforms.aperture!.value = sampled.presentation.aperture
        // Aperture already fades with targetExpand, so a route can carry depth of field
        // through instead of popping it back on at the handoff frame.
        focus.enabled = sampled.presentation.focusEnabled && !target && !source
        trace.push('DOM/passes')
        canvas.dataset.archiveShot = position.segment
        canvas.dataset.archiveProgress = String(position.segment === 'index' ? indexInspection : position.progress)
        canvas.dataset.archiveSheet = target ? JSON.stringify(target) : 'hidden'
        const beforeRender = diagnosticEnabled ? { animation: animationRig.readback(), nodes: execution.readNodes() } : null
        // The room is static between story states, so its two shadow maps only need
        // redrawing when a controlled object actually moved.
        const worldKey = JSON.stringify(sampled.world)
        if (worldKey !== lastWorldKey) { gl.shadowMap.needsUpdate = true; lastWorldKey = worldKey }
        rendering = true
        composer.render()
        if (shaderFailure) throw shaderFailure
        rendering = false
        trace.push('render')
        const committed = ++frameId
        trace.push('publish')
        let visibility = null
        if (diagnosticEnabled && position.segment === 'life-frame' && position.progress >= .24 && position.progress <= .561) {
          try { visibility = photoVisibility(world.photo.actual,world.photo.owner === 'source' ? 'LifeMemoryPhoto' : world.photo.owner === 'wall' ? 'ArchivePhoto_04' : 'ArchiveFootballTransfer') } catch { /* read-only evidence must not change a committed frame */ }
        }
        record(() => ({ kind: 'sample-committed', attemptId, frameId: committed, permit, rigGeneration: world.animation.generation, assetHash, bindingVersion: 'nr01b-v1', story: sampled, position, layout, world, beforeRender, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, view: [...camera.matrixWorldInverse.elements], projection: [...camera.projectionMatrix.elements] }, target, source, hit, photoVisibility:visibility, signal:signalPicture.content, readingRoute:route ? { requestId:route.requestId, mode:route.mode, storyPosition:positionAtScroll(layout,scrollY), phase:document.documentElement.dataset.archiveReturnPhase, progress:routeProgress, projection:routeProjection, snapshotInert:route.layer.inert } : null, passes: { focus: focus.enabled, aperture: focusUniforms.aperture!.value }, trace }))
        lastSampleCommitted = true
        transientSampleFailure = null
        delete document.documentElement.dataset.archiveSampleFallback
        canvas.style.visibility = 'visible'; document.documentElement.dataset.archiveVisible = 'true'
        if (!route && active?.alive && active.shot === position.segment) active.events.ready()
        if (route && routeProgress === 1) endReadingRoute('committed')
        return true
      } catch (error) {
        if (error instanceof Error && /Stale/.test(error.message)) { record(() => ({ kind: 'cancelled-attempt', attemptId, reason: error.message })); return true }
        if (rendering) fail(error)
        else sampleFallback(error, layout.version, requestId)
        return true
      }
    }
    function drawActive(): DrawResult {
      return drawSample() && lastSampleCommitted ? 'sample' : 'none'
    }
    function schedule() {
      if (frame || disposed || state !== 'ready' || (!active && !getRetainedSamplePosition() && !readingRoute) || document.hidden) return
      frame = requestAnimationFrame(() => {
        frame = 0; if (disposed || state !== 'ready') return
        try { reveal(drawActive()) } catch (error) { fail(error) }
        if (readingRoute) schedule()
      })
    }
    function resize() {
      if (readingRoute) endReadingRoute('cancelled')
      if (width !== innerWidth || height !== innerHeight) invalidateSampleLayout()
      width = innerWidth; height = innerHeight
      gl.setPixelRatio(Math.min(devicePixelRatio || 1, quality.tier === 'high' ? 2 : quality.dprMax))
      gl.setSize(width, height, false); composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(width, height)
      if (fxaa) {
        const resolution = fxaa.material.uniforms.resolution?.value as Vector2 | undefined
        resolution?.set(1 / Math.max(1, width * gl.getPixelRatio()), 1 / Math.max(1, height * gl.getPixelRatio()))
      }
      camera.aspect = width / height; camera.updateProjectionMatrix()
      schedule()
    }
    resize()
    async function preparePosition(position: StoryPosition) {
      signal.throwIfAborted()
      const requestId = currentArchiveRequest().requestId
      const permit = execution.begin('sample', 'prepare', requestId, getSampleLayout()?.version ?? 0)
      const sampled = sampleStory({ position, storyVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.storyVersion, contentVersion: PERSONAL_ARCHIVE_SAMPLE_STORY.contentVersion, user:{ indexInspection:0 } })
      const world = execution.sample(permit, sampled)
      applyArchiveCamera(camera, solveArchiveCamera(sampled, world.anchors, { width, height }))
      await gl.compileAsync(scene, camera)
      signal.throwIfAborted(); execution.validate(permit)
      record(() => ({ kind: 'preparation', position, permit, trace: ['sample-world', 'sample-camera', 'compile'] }))
      return permit
    }
    // Prewarm real semantic variants on the retained context, behind the intro.
    for (const [segment, progress] of [
      ['index', 0], ['entry', .62], ['about-life', .48], ['life-frame', .48],
      ['frame-stack', .44], ['stack-work', .68], ['work-contact', .82], ['contact-reading', 1],
    ] as const) {
      await preparePosition({ segment, progress })
    }
    const calibration = await preparePosition({ segment:'entry', progress:.94 })
    focus.enabled = false
    calibrateRoomPaper(gl, composer, model.scene, camera)
    execution.validate(calibration)
    record(() => ({ kind: 'preparation', position:{ segment:'entry', progress:.94 }, permit:calibration, trace: ['sample-world', 'sample-camera', 'paper-calibration'] }))
    await preparePosition({ segment:'index', progress:0 })
    preparing = false
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; lastWorldKey = ''
    if (gl.getContext().isContextLost() || gl.info.render.calls === 0) throw new Error('Archive GPU preparation failed')
    const lost = (event: Event) => {
      event.preventDefault(); if (disposed) return
      endReadingRoute('cancelled')
      recovery++; setState('recovering'); hide(); active?.events.pending()
      execution.invalidate(true); cancelArchiveRouting(); clearSamplePresentation()
      window.clearTimeout(recoveryTimer)
      recoveryTimer = window.setTimeout(() => fail(new Error('Archive GPU recovery timed out')), 15000)
    }
    const restored = () => {
      if (disposed || state !== 'recovering') return
      const generation = recovery
      void (async () => {
        preparing = true
        shaderFailure = null
        // Render-target contents are lost too: rebuild the environment reflection.
        lighting.restore(); resize()
        for (const texture of [...textures, ...signalPicture.textures]) { texture.needsUpdate = true; gl.initTexture(texture) }
        for (const [segment, progress] of [
          ['index', 0], ['entry', .62], ['about-life', .48], ['life-frame', .48],
          ['frame-stack', .44], ['stack-work', .68], ['work-contact', .82], ['contact-reading', 1],
        ] as const) {
          const prepared = await preparePosition({ segment, progress })
          if (disposed || recovery !== generation || state !== 'recovering') return
          execution.validate(prepared)
        }
        if (gl.getContext().isContextLost()) return
        preparing = false
        gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; lastWorldKey = ''
        sampleUnavailable = null
        setState('ready')
        const result = drawActive()
        window.clearTimeout(recoveryTimer)
        reveal(result)
      })().catch(error => { if (recovery === generation) fail(error) })
    }
    const hidden = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; cancelAnimationFrame(ambientFrame); ambientFrame = 0 } else { if (!ambientFrame) ambientFrame = requestAnimationFrame(ambient); schedule() } }
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored); window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', hidden)
    cleanup.push(() => {
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); window.removeEventListener('resize', resize)
      window.clearTimeout(recoveryTimer)
      document.removeEventListener('visibilitychange', hidden); cancelAnimationFrame(frame); canvas.remove()
    })
    return {
      readingTransition(requestId, chapter, mode, layer, from) {
        const layout = getSampleLayout()
        if (!layout || disposed || preparing || state !== 'ready' || sampleUnavailable || currentArchiveRequest().requestId !== requestId) { layer.remove(); return Promise.resolve('readable-fallback') }
        endReadingRoute('cancelled')
        return new Promise(resolve => {
          readingRoute = { requestId, chapter, mode, layer, from, layoutVersion:layout.version, resourceGeneration:execution.resourceGeneration, started:performance.now(), resolve }
          document.documentElement.dataset.archiveReadingRequest = String(requestId)
          schedule()
        })
      },
      commitPosition(requestId) {
        if (disposed || state !== 'ready' || preparing || !mountedHost || currentArchiveRequest().requestId !== requestId) return 'readable-fallback'
        if (drawSample(requestId)) return lastSampleCommitted && getSampleLayout() ? 'committed' : 'readable-fallback'
        return 'readable-fallback'
      },
      setIndexInspection(amount) {
        if(!Number.isFinite(amount))return
        indexInspection=Math.max(0,Math.min(1,amount))
        schedule()
      },
      mount(host) {
        mountedHost = host
        if (canvas.parentElement !== host) host.appendChild(canvas)
        canvas.style.visibility = 'hidden'
        return () => {
          if (mountedHost !== host) return
          mountedHost = null
          hide(); execution.invalidate(); clearSamplePresentation()
          canvas.remove()
        }
      },
      rest(view) {
        void view
        if (disposed || state !== 'ready' || !mountedHost || document.hidden) return
        try { reveal(drawActive()) } catch (error) { fail(error) }
      },
      activate(page, sourcePage, shot, progress, events) {
        if (disposed || state === 'failed') { if (page) page.style.opacity = '0'; events.failed(); return () => {} }
        if (shot === 'index') indexPage = page
        const token = Symbol(shot)
        const surface: ActiveSurface = { token, alive: true, page, sourcePage, shot, progress, events }
        active = surface
        if (mountedHost && canvas.parentElement !== mountedHost) mountedHost.appendChild(canvas)
        if (state === 'recovering' || gl.getContext().isContextLost()) { hide(); events.pending() }
        else try {
          reveal(drawActive())
        } catch (error) { fail(error) }
        const unsubscribe = progress.subscribe(schedule)
        return () => {
          unsubscribe()
          surface.alive = false
          if (active?.token === token) {
            active = null
            schedule()
          }
        }
      },
      dispose() {
        if (disposed) return
        if (active?.page) active.page.style.opacity = '0'
        if (active?.sourcePage) active.sourcePage.style.opacity = '0'
        if (indexPage) indexPage.style.opacity = '0'
        endReadingRoute('cancelled')
        disposed = true; active = null; indexPage = null; mountedHost = null
        execution.invalidate(); clearSamplePresentation()
        delete document.documentElement.dataset.archiveVisible
        for (const stop of cleanup.reverse()) stop()
        gl.dispose(); gl.forceContextLoss(); lease?.release()
      },
    }
  } catch (error) {
    for (const stop of cleanup.reverse()) stop()
    renderer?.dispose(); renderer?.forceContextLoss(); lease?.release(); throw error
  }
}
const resource = createSharedResource(async (signal) => {
  const runtime = await createRuntime(signal)
  if (signal.aborted) { runtime.dispose(); signal.throwIfAborted() }
  current = runtime
  return runtime
})
export function prepareArchiveRuntime(signal: AbortSignal): Promise<ArchiveRuntime> {
  return resource.load(signal)
}
export function getPreparedArchiveRuntime() { return current }
if (import.meta.hot) {
  // A GPU runtime cannot hot-swap independently of the completed intro gate.
  // Start the same boot sequence again instead of leaving stale React adapters.
  import.meta.hot.accept(() => window.location.reload())
  import.meta.hot.dispose(() => { resource.clear(); current?.dispose(); current = null })
}
