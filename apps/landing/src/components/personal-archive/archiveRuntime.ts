import { HalfFloatType, Mesh, PerspectiveCamera, Scene, Texture, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, type Material, type BufferGeometry } from 'three'
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
import { createArchiveDirector, type ArchiveView, type SpatialShot } from './archiveDirector'
import { createArchiveAtmosphere } from './archiveAtmosphere'
import { createArchiveLighting } from './archiveRuntimeLighting'
import { createArchiveReadingSurface } from './archiveReadingSurface'
import { createArchiveSignal } from './archiveRuntimeSignal'
import { prepareArchiveMaterials } from './archiveMaterials'
import { createArchiveFinitePass } from './archiveRenderSafety'
import type { ArchiveProgress } from './scrollPose'
import { createSharedResource } from '../../lib/resources/sharedResource'
import { prepareChapterPages } from '../../lib/resources/prepareChapterPages'
import { addContactReadingPlane } from './readingFrame'
import { calibrateRoomPaper } from './roomPalette'
import { phase } from './chapterTracks'
import { pageMatrix } from './pageProjection'

interface SurfaceEvents { ready(): void; pending(): void; failed(): void }
interface ActiveSurface {
  token: symbol
  alive: boolean
  page: HTMLElement | null
  sourcePage: HTMLElement | null
  shot: SpatialShot
  progress: ArchiveProgress
  events: SurfaceEvents
  navigation?: { from: ArchiveView; to: ArchiveView }
  previous?: ActiveSurface | null
}
export interface ArchiveRuntime {
  mount(host: HTMLElement): () => void
  rest(view: ArchiveView): void
  activate(page: HTMLElement | null, sourcePage: HTMLElement | null, shot: SpatialShot, progress: ArchiveProgress, events: SurfaceEvents): () => void
  navigate(from: ArchiveView, to: ArchiveView, progress: ArchiveProgress, events: SurfaceEvents): () => void
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
  const model = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
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
    const director = createArchiveDirector(model, camera); cleanup.push(() => director.dispose())
    const signalPicture = await createArchiveSignal(model.scene); cleanup.push(() => signalPicture.dispose())
    const atmosphere = createArchiveAtmosphere(model.scene); cleanup.push(() => atmosphere.dispose())
    const sheet = createArchiveReadingSurface(model.scene); scene.add(sheet.mesh); cleanup.push(() => sheet.dispose())
    await prepareChapterPages(signal)
    await document.fonts.ready
    for (const page of document.querySelectorAll<HTMLElement>('.archive-bridge__page')) {
      const bridge = page.closest<HTMLElement>('.archive-bridge')
      sheet.prepare((bridge?.dataset.archiveTrack ?? 'entry') as SpatialShot, page)
    }
    const textures = new Set<Texture>(sheet.textures.values())
    prepareArchiveMaterials(model.scene)
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
    let restView: ArchiveView = 'home'
    let active: ActiveSurface | null = null
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, ambientFrame = 0, lastAmbient = 0
    const pointerMove = (event: PointerEvent) => {
      targetX = event.clientX / Math.max(1, innerWidth) * 2 - 1
      targetY = 1 - event.clientY / Math.max(1, innerHeight) * 2
    }
    const pointerLeave = () => { targetX = 0; targetY = 0 }
    const ambient = (now: number) => {
      if (disposed || document.hidden) { ambientFrame = 0; return }
      ambientFrame = requestAnimationFrame(ambient)
      if (state !== 'ready' || !mountedHost || !active || now - lastAmbient < 16) return
      const delta = Math.min(.05, (now - lastAmbient) / 1000); lastAmbient = now
      const blend = 1 - Math.exp(-delta * 5)
      pointerX += (targetX - pointerX) * blend; pointerY += (targetY - pointerY) * blend
      director.pointer(pointerX, pointerY)
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
      canvas.style.visibility = 'hidden'
      if (active?.page) active.page.style.opacity = '0'
      if (active?.sourcePage) active.sourcePage.style.opacity = '0'
      delete document.documentElement.dataset.archiveVisible
      cancelAnimationFrame(frame); frame = 0
    }
    function fail(error: unknown) {
      if (disposed) return
      setState('failed'); hide(); window.clearTimeout(recoveryTimer)
      console.error('[personal-archive] Rendering failed', error)
      active?.events.failed()
    }
    function draw(shot: SpatialShot, p: number, page: HTMLElement | null, sourcePage: HTMLElement | null = null) {
      const pose = director.pose(shot, p, page)
      sheet.update(shot, p, pose.surface, camera, page)
      const hit = page?.closest('.archive-bridge')?.querySelector<HTMLElement>('.archive-bridge__room-hit')
      if (hit && pose.surface !== 'ContactReading') {
        const points = ['TL', 'TR', 'BR', 'BL'].map(suffix => model.scene.getObjectByName(`${pose.surface}_${suffix}`)?.getWorldPosition(new Vector3()))
        if (points.every(point => point && point.clone().applyMatrix4(camera.matrixWorldInverse).z < -camera.near)) {
          const screen = points.map(point => point!.project(camera))
          const xs = screen.map(point => (point.x + 1) * width / 2), ys = screen.map(point => (1 - point.y) * height / 2)
          const left = Math.min(...xs), top = Math.min(...ys)
          Object.assign(hit.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(44, Math.max(...xs) - left)}px`, height: `${Math.max(44, Math.max(...ys) - top)}px` })
        }
      }
      if (indexPage && indexPage !== page) {
        const indexOpacity = shot === 'entry' ? 1 - Math.min(1, Math.max(0, (p - .36) / .20)) : 0
        if (shot === 'entry' && indexOpacity > 0) sheet.projectSource(indexPage, 'StackReading', camera, indexOpacity, 0)
        else indexPage.style.opacity = '0'
        indexPage.style.pointerEvents = shot === 'entry' && p < .015 ? 'auto' : 'none'
      }
      const sourceSurface = shot === 'about-life' ? 'AboutReading'
        : shot === 'life-frame' ? 'LifeReading'
          : shot === 'frame-stack' ? 'FrameReading'
        : shot === 'stack-work' ? 'StackReading'
          : shot === 'work-contact' ? 'WorkReading'
            : null
      if (sourcePage && sourceSurface) {
        sheet.projectSource(sourcePage, sourceSurface, camera, 1 - phase(p, .20, .26), 1 - phase(p, 0, .08))
      }
      focusUniforms.focus!.value = pose.focus; focusUniforms.aperture!.value = .000025 * (1 - pose.flatten)
      focus.enabled = pose.flatten < .8 && shot !== 'frame-stack' && !sheet.active
      canvas.dataset.archiveShot = shot
      canvas.dataset.archiveProgress = String(p)
      canvas.dataset.archiveSheet = sheet.active ? JSON.stringify(sheet.mesh.userData.archiveSurface) : 'hidden'
      composer.render()
      if (shaderFailure) throw shaderFailure
    }
    const surfaceForView = (view: ArchiveView) => view === 'home' || view === 'stack' ? 'StackReading'
      : view === 'about' ? 'AboutReading'
        : view === 'life' ? 'LifeReading'
          : view === 'frame' ? 'FrameReading'
            : view === 'work' ? 'WorkReading'
              : 'ContactReading'
    function projectedMatrix(surface: string) {
      const points = ['TL', 'TR', 'BR', 'BL'].map(suffix => model.scene.getObjectByName(`${surface}_${suffix}`)?.getWorldPosition(new Vector3()))
      if (points.some(value => !value)) return 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'
      const projected = points.map(point => point!.project(camera))
      const matrix = pageMatrix(projected.map(point => ({ x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 })), innerWidth, innerHeight)
      return matrix ? `matrix3d(${matrix.join(',')})` : 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'
    }
    function drawNavigation(from: ArchiveView, to: ArchiveView, p: number) {
      const pose = director.navigationPose(from, to, p)
      focusUniforms.focus!.value = pose.focus
      focusUniforms.aperture!.value = .000025
      focus.enabled = p > .12 && p < .88
      canvas.dataset.archiveShot = `navigate:${from}:${to}`
      canvas.dataset.archiveProgress = String(p)
      canvas.dataset.archiveSheet = 'hidden'
      composer.render()
      if (shaderFailure) throw shaderFailure
    }
    function drawRest() {
      const pose = director.navigationPose(restView, restView, 1, true)
      focusUniforms.focus!.value = pose.focus
      focusUniforms.aperture!.value = .000025
      focus.enabled = false
      canvas.dataset.archiveShot = `rest:${restView}`
      canvas.dataset.archiveProgress = '1'
      canvas.dataset.archiveSheet = 'hidden'
      composer.render()
      if (shaderFailure) throw shaderFailure
    }
    function restoreRest() {
      if (!mountedHost || state !== 'ready') return
      try { drawRest(); canvas.style.visibility = 'visible' } catch (error) { fail(error) }
    }
    function previousAlive(surface: ActiveSurface) {
      let previous = surface.previous ?? null
      while (previous && !previous.alive) previous = previous.previous ?? null
      return previous
    }
    function resumePrevious(surface: ActiveSurface) {
      active = previousAlive(surface)
      cancelAnimationFrame(frame); frame = 0
      if (!active) { restoreRest(); return }
      if (state !== 'ready') { active.events.pending(); return }
      try {
        drawActive(); canvas.style.visibility = 'visible'
        document.documentElement.dataset.archiveVisible = 'true'; active.events.ready()
      } catch (error) { fail(error) }
    }
    function drawActive() {
      if (!active) return
      if (active.navigation) drawNavigation(active.navigation.from, active.navigation.to, active.progress.get())
      else draw(active.shot, active.progress.get(), active.page, active.sourcePage)
    }
    function schedule() {
      if (frame || disposed || state !== 'ready' || !active || document.hidden) return
      frame = requestAnimationFrame(() => {
        frame = 0; if (!active || disposed || state !== 'ready') return
        try { drawActive() } catch (error) { fail(error) }
      })
    }
    function resize() {
      width = innerWidth; height = innerHeight
      for (const page of document.querySelectorAll<HTMLElement>('.archive-bridge__page')) {
        sheet.prepare((page.closest<HTMLElement>('.archive-bridge')?.dataset.archiveTrack ?? 'entry') as SpatialShot, page)
      }
      gl.setPixelRatio(Math.min(devicePixelRatio || 1, quality.tier === 'high' ? 2 : quality.dprMax))
      gl.setSize(width, height, false); composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(width, height)
      if (fxaa) {
        const resolution = fxaa.material.uniforms.resolution?.value as Vector2 | undefined
        resolution?.set(1 / Math.max(1, width * gl.getPixelRatio()), 1 / Math.max(1, height * gl.getPixelRatio()))
      }
      camera.aspect = width / height; camera.updateProjectionMatrix()
      if (active) schedule()
      else restoreRest()
    }
    resize()
    // Prewarm actual state variants on the same retained context, behind the intro.
    for (const [shot, p] of [
      ['index', 0], ['entry', 0], ['entry', .62], ['about-life', .48], ['life-frame', .48],
      ['frame-stack', .44], ['frame-stack', .82], ['stack-work', .68], ['work-contact', .82],
    ] as const) {
      signal.throwIfAborted(); director.pose(shot, p, null)
      await gl.compileAsync(scene, camera); draw(shot, p, null)
    }
    director.pose('entry', .94, null)
    focus.enabled = false
    calibrateRoomPaper(gl, composer, model.scene, camera)
    draw('index', 0, null); signal.throwIfAborted()
    if (gl.getContext().isContextLost() || gl.info.render.calls === 0) throw new Error('Archive GPU preparation failed')
    const lost = (event: Event) => {
      event.preventDefault(); if (disposed) return
      recovery++; setState('recovering'); hide(); active?.events.pending()
      window.clearTimeout(recoveryTimer)
      recoveryTimer = window.setTimeout(() => fail(new Error('Archive GPU recovery timed out')), 15000)
    }
    const restored = () => {
      if (disposed || state !== 'recovering') return
      const generation = recovery
      void (async () => {
        shaderFailure = null
        // Render-target contents are lost too: rebuild the environment reflection.
        lighting.restore(); resize()
        for (const texture of [...textures, ...signalPicture.textures]) { texture.needsUpdate = true; gl.initTexture(texture) }
        for (const [shot, p] of [
          ['index', 0], ['entry', .62], ['about-life', .48], ['life-frame', .48],
          ['frame-stack', .44], ['stack-work', .68], ['work-contact', .82],
        ] as const) {
          director.pose(shot, p, null)
          await gl.compileAsync(scene, camera)
          if (disposed || recovery !== generation || state !== 'recovering') return
          draw(shot, p, null)
        }
        if (gl.getContext().isContextLost()) return
        if (active) drawActive()
        else drawRest()
        window.clearTimeout(recoveryTimer); setState('ready'); canvas.style.visibility = 'visible'
        if (active) { document.documentElement.dataset.archiveVisible = 'true'; active.events.ready() }
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
      mount(host) {
        mountedHost = host
        if (canvas.parentElement !== host) host.appendChild(canvas)
        canvas.style.visibility = state === 'failed' ? 'hidden' : 'visible'
        return () => {
          if (mountedHost !== host) return
          mountedHost = null
          canvas.remove()
        }
      },
      rest(view) {
        restView = view
        if (disposed || state !== 'ready' || active || !mountedHost || document.hidden) return
        try {
          drawRest(); canvas.style.visibility = 'visible'
          document.documentElement.dataset.archiveVisible = 'true'
        } catch (error) { fail(error) }
      },
      activate(page, sourcePage, shot, progress, events) {
        if (disposed || state === 'failed') { if (page) page.style.opacity = '0'; events.failed(); return () => {} }
        if (shot === 'index') indexPage = page
        if (active?.page && active.page !== page && active.shot !== 'index') active.page.style.opacity = '0'
        const token = Symbol(shot)
        const surface: ActiveSurface = { token, alive: true, previous: active, page, sourcePage, shot, progress, events }
        active = surface
        if (mountedHost && canvas.parentElement !== mountedHost) mountedHost.appendChild(canvas)
        if (state === 'recovering' || gl.getContext().isContextLost()) { hide(); events.pending() }
        else try {
          draw(shot, progress.get(), page, sourcePage); canvas.style.visibility = 'visible'
          document.documentElement.dataset.archiveVisible = 'true'; events.ready()
        } catch (error) { fail(error) }
        const unsubscribe = progress.subscribe(schedule)
        return () => {
          unsubscribe()
          surface.alive = false
          if (page && shot !== 'index') page.style.opacity = '0'
          if (sourcePage) sourcePage.style.opacity = '0'
          if (active?.token === token) {
            resumePrevious(surface)
          }
        }
      },
      navigate(from, to, progress, events) {
        if (disposed || state === 'failed') { events.failed(); return () => {} }
        if (active?.page) active.page.style.opacity = '0'
        if (active?.sourcePage) active.sourcePage.style.opacity = '0'
        const token = Symbol(`navigate:${from}:${to}`)
        director.navigationPose(from, to, 0)
        document.documentElement.style.setProperty('--archive-route-source-matrix', projectedMatrix(surfaceForView(from)))
        director.navigationPose(from, to, 1)
        document.documentElement.style.setProperty('--archive-route-target-matrix', projectedMatrix(surfaceForView(to)))
        const surface: ActiveSurface = { token, alive: true, previous: active, page: null, sourcePage: null, shot: 'index', progress, events, navigation: { from, to } }
        active = surface
        const unsubscribe = progress.subscribe(schedule)
        try {
          drawNavigation(from, to, progress.get())
          canvas.style.visibility = 'visible'
          document.documentElement.dataset.archiveVisible = 'true'
          events.ready()
        } catch (error) { fail(error) }
        return () => {
          unsubscribe()
          surface.alive = false
          if (active?.token === token) {
            resumePrevious(surface)
          }
          document.documentElement.style.removeProperty('--archive-route-source-matrix')
          document.documentElement.style.removeProperty('--archive-route-target-matrix')
        }
      },
      dispose() {
        if (disposed) return
        if (active?.page) active.page.style.opacity = '0'
        if (active?.sourcePage) active.sourcePage.style.opacity = '0'
        if (indexPage) indexPage.style.opacity = '0'
        disposed = true; active = null; indexPage = null; mountedHost = null
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
