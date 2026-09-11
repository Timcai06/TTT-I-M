import { ShaderChunk, type MeshStandardMaterial } from 'three'

const patched = new WeakSet<MeshStandardMaterial>()

/** The Cycles bounce already contains visibility. AO only attenuates realtime IBL. */
export function preserveBakedIrradiance(material: MeshStandardMaterial) {
  if (patched.has(material) || !material.lightMap || material.userData.archive_lightmap_version !== 2) return
  const before = 'irradiance += lightMapIrradiance;'
  if (!ShaderChunk.lights_fragment_maps.includes(before)) throw new Error('Archive lightmap shader contract changed')
  const maps = ShaderChunk.lights_fragment_maps.replace(before, '// Add baked irradiance after realtime AO.')
  const compile = material.onBeforeCompile.bind(material), cacheKey = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_fragment_maps>', maps)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        #if defined(USE_LIGHTMAP) && defined(RE_IndirectDiffuse)
          RE_IndirectDiffuse(lightMapIrradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        #endif`)
  }
  material.customProgramCacheKey = () => `${cacheKey()}:archive-baked-visibility-v2`
  material.needsUpdate = true; patched.add(material)
}
