import { CompressedTexture, HalfFloatType, Mesh, Texture, UnsignedByteType, type Material, type Scene, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import type { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

type DiagnosticWindow = Window & {
  __portfolioArchiveGpuInspect?: boolean
  __portfolioArchiveGpuSnapshot?: () => unknown
}

/** Opt-in, read-only inventory for comparing GPU allocations in the production mirror. */
export function installArchiveGpuDiagnostics(
  renderer: WebGLRenderer,
  scene: Scene,
  composer: EffectComposer,
  focus: BokehPass,
  bloom: UnrealBloomPass,
  extraTextures: readonly Texture[],
): () => void {
  const host = window as DiagnosticWindow
  if (host.__portfolioArchiveGpuInspect !== true) return () => {}

  const target = (name: string, item: WebGLRenderTarget) => {
    const channels = 4 // All inventory targets use RGBA colour or packed depth.
    const componentBytes = item.texture.type === HalfFloatType ? 2 : item.texture.type === UnsignedByteType ? 1 : 4
    const samples = Math.max(1, item.samples)
    const pixels = item.width * item.height
    return {
      name, width: item.width, height: item.height,
      format: item.texture.format, type: item.texture.type, samples: item.samples,
      depthBuffer: item.depthBuffer, stencilBuffer: item.stencilBuffer,
      // Resolve texture plus an MSAA buffer where applicable; depth is estimated
      // at 4 bytes per sample. Driver tiling and compression are not observable.
      estimatedBytes: pixels * (channels * componentBytes * (item.samples ? samples + 1 : 1) + (item.depthBuffer ? 4 * samples : 0)),
    }
  }

  const snapshot = () => {
    const textures = new Set<Texture>(extraTextures)
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        Object.values(material as Material).forEach(value => { if (value instanceof Texture) textures.add(value as Texture) })
      }
    })
    if (scene.environment) textures.add(scene.environment)
    const textureRows = [...textures].map(texture => {
      const image = texture.source.data as { width?: number; height?: number } | undefined
      const width = image?.width ?? 0, height = image?.height ?? 0
      const compressed = texture instanceof CompressedTexture
      const compressedBytes = compressed
        ? texture.mipmaps.reduce((sum, mip) => sum + (mip.data?.byteLength ?? 0), 0)
        : 0
      return {
        name: texture.name, width, height, compressed,
        estimatedBytes: compressed ? compressedBytes : width * height * 4 * (texture.generateMipmaps ? 4 / 3 : 1),
      }
    })
    const bokehDepth = (focus as unknown as { _renderTargetDepth: WebGLRenderTarget })._renderTargetDepth
    const shadowTargets: ReturnType<typeof target>[] = []
    scene.traverse(object => {
      const shadow = (object as unknown as { shadow?: { map?: WebGLRenderTarget } }).shadow
      if (shadow?.map) shadowTargets.push(target(`${object.name || object.type}.shadow`, shadow.map))
    })
    const targets = [
      target('composer.read', composer.renderTarget1),
      target('composer.write', composer.renderTarget2),
      target('bokeh.depth', bokehDepth),
      target('bloom.bright', bloom.renderTargetBright),
      ...bloom.renderTargetsHorizontal.map((item, index) => target(`bloom.horizontal.${index}`, item)),
      ...bloom.renderTargetsVertical.map((item, index) => target(`bloom.vertical.${index}`, item)),
      ...shadowTargets,
    ]
    return {
      dpr: renderer.getPixelRatio(),
      context: renderer.getContext().getContextAttributes(),
      rendererInfo: {
        memory: { ...renderer.info.memory },
        render: { ...renderer.info.render },
      },
      passes: composer.passes.map(pass => ({ name: pass.constructor.name, enabled: pass.enabled })),
      targets,
      textures: {
        count: textureRows.length,
        compressedBytes: textureRows.filter(row => row.compressed).reduce((sum, row) => sum + row.estimatedBytes, 0),
        uncompressedBytes: textureRows.filter(row => !row.compressed).reduce((sum, row) => sum + row.estimatedBytes, 0),
        uncompressed: textureRows.filter(row => !row.compressed),
      },
    }
  }
  host.__portfolioArchiveGpuSnapshot = snapshot
  return () => { if (host.__portfolioArchiveGpuSnapshot === snapshot) delete host.__portfolioArchiveGpuSnapshot }
}
