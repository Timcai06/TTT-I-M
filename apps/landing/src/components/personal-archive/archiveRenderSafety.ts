import { MeshPhysicalMaterial, ShaderChunk } from 'three'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

const patched = new WeakSet<MeshPhysicalMaterial>()

/** Keep brushed-metal anisotropy, including its maps, without grazing-angle 0/0. */
export function stabilizeArchiveMaterial(material: MeshPhysicalMaterial) {
  if (!material.anisotropy || patched.has(material)) return
  const replacements = [
    ['float v = 0.5 / ( gv + gl );', 'float v = 0.5 / max( gv + gl, 1e-6 );'],
    ['float w2 = a2 / v2;', 'float w2 = a2 / max( v2, 1e-12 );'],
    ['float dotTL = dot( material.anisotropyT, lightDir );',
      'if (dotNL <= 0.0 || dotNV <= 0.0) return vec3(0.0);\nfloat dotTL = dot( material.anisotropyT, lightDir );'],
  ] as const
  let chunk = ShaderChunk.lights_physical_pars_fragment
  for (const [before, after] of replacements) {
    if (!chunk.includes(before)) throw new Error('Archive anisotropy shader contract changed')
    chunk = chunk.replace(before, after)
  }
  const compile = material.onBeforeCompile.bind(material), cacheKey = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer)
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', chunk)
  }
  material.customProgramCacheKey = () => `${cacheKey()}:archive-finite-anisotropy-v1`
  material.needsUpdate = true
  patched.add(material)
}

/** Contain any future HDR fault before a spatial filter spreads it to neighbors. */
export function createArchiveFinitePass() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      float finiteChannel(float value) {
        if (isnan(value) || isinf(value)) return 0.0;
        return clamp(value, 0.0, 65504.0);
      }
      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;
        gl_FragColor = vec4(finiteChannel(color.r), finiteChannel(color.g), finiteChannel(color.b), 1.0);
      }`,
  })
}
