import { LinearSRGBColorSpace, type WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import basisJsUrl from 'three/examples/jsm/libs/basis/basis_transcoder.js?url'
import basisWasmUrl from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url'
import { LoadingManager } from 'three'

interface ArchiveMaterialExtras {
  archive_lightmap_version?: number
  archive_lightmap_scale?: number
  archiveLightTexture?: { index: number; texCoord?: number }
}

/** Shared by production and review: AO is ORM.R; irradiance has its own slot. */
export function createArchiveModelLoader(renderer: WebGLRenderer) {
  const manager = new LoadingManager()
  manager.setURLModifier(url => {
    if (url === 'archive-basis/basis_transcoder.js') return basisJsUrl
    if (url === 'archive-basis/basis_transcoder.wasm') return basisWasmUrl
    return url
  })
  const ktx = new KTX2Loader(manager).setTranscoderPath('archive-basis/').setWorkerLimit(2).detectSupport(renderer)
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
