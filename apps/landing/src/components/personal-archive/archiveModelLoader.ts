import { FileLoader, LinearSRGBColorSpace, LoadingManager, type WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import basisWasmUrl from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url'

/**
 * The transcoder worker, served from its own path so it can carry its own policy.
 *
 * Not a Vite asset import: the URL has to stay literal and stable, because
 * vercel.json grants 'unsafe-eval' to exactly this path. A hashed filename would
 * silently fall outside that rule on the next build. scripts/emit-ktx2-worker.mjs
 * writes the file into public/ before every build.
 */
const KTX2_WORKER_URL = '/archive-basis/ktx2-worker.js'

interface ArchiveMaterialExtras {
  archive_lightmap_version?: number
  archive_lightmap_scale?: number
  archiveLightTexture?: { index: number; texCoord?: number }
}

/**
 * KTX2Loader, with its worker loaded from a URL instead of a Blob.
 *
 * three builds the worker body in memory and hands it to URL.createObjectURL. A
 * blob: worker inherits the creating document's Content-Security-Policy, and the
 * Emscripten transcoder evaluates a string as it starts, so under a strict policy
 * it threw an EvalError — inside a promise nothing awaited. The rejection escaped
 * the loader's chain, `renderer:personal-archive` never settled, and the intro sat
 * at 99 until its 600s deadline let the reader into a room that had never loaded.
 *
 * A worker fetched over http(s) takes its policy from its own response headers.
 * Pointing at a real file is what lets 'unsafe-eval' apply to the transcoder alone
 * while the document keeps the strict policy. The body is byte-identical to the
 * one three would have built; only where it lives changes.
 */
class ScopedWorkerKTX2Loader extends KTX2Loader {
  override init() {
    if (!this.transcoderPending) {
      const binary = new FileLoader(this.manager)
      binary.setResponseType('arraybuffer')
      binary.setWithCredentials(this.withCredentials)
      this.transcoderPending = binary.loadAsync(basisWasmUrl).then((transcoderBinary) => {
        // The worker file already contains basis_transcoder.js, so only the wasm
        // still has to travel; three posts it in rather than letting the worker
        // fetch it, which keeps the worker's own connect-src closed.
        this.transcoderBinary = transcoderBinary as ArrayBuffer
        this.workerPool.setWorkerCreator(() => {
          const worker = new Worker(KTX2_WORKER_URL)
          const copy = (this.transcoderBinary as ArrayBuffer).slice(0)
          worker.postMessage({ type: 'init', config: this.workerConfig, transcoderBinary: copy }, [copy])
          return worker
        })
      })
    }
    return this.transcoderPending
  }
}

/** Shared by production and review: AO is ORM.R; irradiance has its own slot. */
export function createArchiveModelLoader(renderer: WebGLRenderer) {
  const manager = new LoadingManager()
  const ktx = new ScopedWorkerKTX2Loader(manager).setWorkerLimit(2).detectSupport(renderer)
  const loader = new GLTFLoader(manager).setKTX2Loader(ktx)
  loader.register(parser => ({
    name: 'ARCHIVE_material_irradiance',
    extendMaterialParams(index, params) {
      const json = parser.json as { materials: { extras?: ArchiveMaterialExtras }[] }
      const extras = json.materials[index]?.extras
      if (extras?.archive_lightmap_version !== 2 || !extras.archiveLightTexture) return null
      const scale = extras.archive_lightmap_scale ?? .95
      if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid archive irradiance scale')
      params.lightMapIntensity = scale
      return parser.assignTexture(params, 'lightMap', extras.archiveLightTexture, LinearSRGBColorSpace)
    },
  }))
  return { loader, dispose: () => ktx.dispose() }
}
