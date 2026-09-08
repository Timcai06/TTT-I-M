import { Mesh, PerspectiveCamera, Scene, Texture, Vector2, WebGLRenderer, type Material, type BufferGeometry } from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { acquireRetainedContext, type ContextLease } from '../../lib/webgl/contextRegistry'
import { getGLQualityProfile } from '../../lib/webgl/quality'
import modelUrl from '../../assets/personal-archive/personal-space.glb?url'
import { createArchiveDirector, type SpatialShot } from './archiveDirector'
import { createArchiveLighting } from './archiveRuntimeLighting'
import { createArchiveReadingSurface } from './archiveReadingSurface'
import { createArchiveSignal } from './archiveRuntimeSignal'
import { prepareArchiveMaterials } from './archiveMaterials'
import { createArchiveFinitePass } from './archiveRenderSafety'
import type { ArchiveProgress } from './scrollPose'
import { createSharedResource } from '../../lib/resources/sharedResource'
import { prepareChapterPages } from '../../lib/resources/prepareChapterPages'

interface SurfaceEvents { ready(): void; pending(): void; failed(): void }
export interface ArchiveRuntime {
  attach(host: HTMLElement, page: HTMLElement | null, shot: SpatialShot, progress: ArchiveProgress, events: SurfaceEvents): () => void
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
    const scene = new Scene(), camera = new PerspectiveCamera(40, innerWidth / innerHeight, .01, 30)
    scene.add(model.scene)
    const lighting = createArchiveLighting(gl, scene); cleanup.push(() => lighting.dispose())
    const director = createArchiveDirector(model, camera); cleanup.push(() => director.dispose())
    const signalPicture = await createArchiveSignal(model.scene); cleanup.push(() => signalPicture.dispose())
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
    const composer = new EffectComposer(gl), renderPass = new RenderPass(scene, camera)
    const focus = new BokehPass(scene, camera, { focus: 1, aperture: .000025, maxblur: .0025 })
    const focusUniforms = focus.uniforms as Record<string, { value: number }>
    const bloom = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), .12, .35, 1.35), output = new OutputPass()
    const finite = createArchiveFinitePass()
    composer.addPass(renderPass); composer.addPass(finite); composer.addPass(focus); composer.addPass(bloom); composer.addPass(output)
    cleanup.push(() => { finite.dispose(); focus.dispose(); bloom.dispose(); output.dispose(); composer.dispose() })
    let width = innerWidth, height = innerHeight, frame = 0, disposed = false
    let state: 'ready' | 'recovering' | 'failed' = 'ready', recovery = 0, recoveryTimer = 0
    let active: { token: symbol; page: HTMLElement | null; shot: SpatialShot; progress: ArchiveProgress; events: SurfaceEvents } | null = null
    const setState = (next: typeof state) => { state = next; canvas.dataset.archiveState = next }
    setState('ready')
    function hide() {
      canvas.style.visibility = 'hidden'
      if (active?.page) active.page.style.opacity = '0'
      delete document.documentElement.dataset.archiveVisible
      cancelAnimationFrame(frame); frame = 0
    }
    function fail(error: unknown) {
      if (disposed) return
      setState('failed'); hide(); window.clearTimeout(recoveryTimer)
      console.error('[personal-archive] Rendering failed', error)
      active?.events.failed()
    }
    function draw(shot: SpatialShot, p: number, page: HTMLElement | null) {
      const pose = director.pose(shot, p, page)
      sheet.update(shot, p, pose.surface, camera, page)
      focusUniforms.focus!.value = pose.focus; focusUniforms.aperture!.value = .000025 * (1 - pose.flatten)
      focus.enabled = pose.flatten < .8 && shot !== 'frame-stack' && !sheet.active
      canvas.dataset.archiveShot = shot
      canvas.dataset.archiveProgress = String(p)
      canvas.dataset.archiveSheet = sheet.active ? JSON.stringify(sheet.mesh.userData.archiveSurface) : 'hidden'
      composer.render()
      if (shaderFailure) throw shaderFailure
    }
    function schedule() {
      if (frame || disposed || state !== 'ready' || !active || document.hidden) return
      frame = requestAnimationFrame(() => {
        frame = 0; if (!active || disposed || state !== 'ready') return
        try { draw(active.shot, active.progress.get(), active.page) } catch (error) { fail(error) }
      })
    }
    function resize() {
      width = innerWidth; height = innerHeight
      for (const page of document.querySelectorAll<HTMLElement>('.archive-bridge__page')) {
        sheet.prepare((page.closest<HTMLElement>('.archive-bridge')?.dataset.archiveTrack ?? 'entry') as SpatialShot, page)
      }
      const quality = getGLQualityProfile()
      gl.setPixelRatio(Math.min(devicePixelRatio || 1, quality.tier === 'high' ? 2 : quality.dprMax))
      gl.setSize(width, height, false); composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(width, height)
      camera.aspect = width / height; camera.updateProjectionMatrix(); schedule()
    }
    resize()
    // Prewarm actual state variants on the same retained context, behind the intro.
    for (const [shot, p] of [['entry', 0], ['entry', .65], ['frame-stack', .4], ['stack-work', .8]] as const) {
      signal.throwIfAborted(); director.pose(shot, p, null)
      await gl.compileAsync(scene, camera); draw(shot, p, null)
    }
    draw('entry', 0, null); signal.throwIfAborted()
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
        for (const [shot, p] of [['entry', .65], ['frame-stack', .4], ['stack-work', .8]] as const) {
          director.pose(shot, p, null)
          await gl.compileAsync(scene, camera)
          if (disposed || recovery !== generation || state !== 'recovering') return
          draw(shot, p, null)
        }
        if (gl.getContext().isContextLost()) return
        if (active) draw(active.shot, active.progress.get(), active.page)
        else draw('entry', 0, null)
        window.clearTimeout(recoveryTimer); setState('ready'); canvas.style.visibility = 'visible'
        if (active) { document.documentElement.dataset.archiveVisible = 'true'; active.events.ready() }
      })().catch(error => { if (recovery === generation) fail(error) })
    }
    const hidden = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else schedule() }
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored); window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', hidden)
    cleanup.push(() => {
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); window.removeEventListener('resize', resize)
      window.clearTimeout(recoveryTimer)
      document.removeEventListener('visibilitychange', hidden); cancelAnimationFrame(frame); canvas.remove()
    })
    return {
      attach(host, page, shot, progress, events) {
        if (disposed || state === 'failed') { if (page) page.style.opacity = '0'; events.failed(); return () => {} }
        if (active?.page && active.page !== page) active.page.style.opacity = '0'
        const token = Symbol(shot); active = { token, page, shot, progress, events }
        host.appendChild(canvas)
        if (state === 'recovering' || gl.getContext().isContextLost()) { hide(); events.pending() }
        else try {
          draw(shot, progress.get(), page); canvas.style.visibility = 'visible'
          document.documentElement.dataset.archiveVisible = 'true'; events.ready()
        } catch (error) { fail(error) }
        const unsubscribe = progress.subscribe(schedule)
        return () => {
          unsubscribe()
          if (active?.token === token) {
            if (page) page.style.opacity = '0'
            active = null; canvas.remove(); cancelAnimationFrame(frame); frame = 0
            delete document.documentElement.dataset.archiveVisible
          }
        }
      },
      dispose() {
        if (disposed) return
        if (active?.page) active.page.style.opacity = '0'
        disposed = true; active = null
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
