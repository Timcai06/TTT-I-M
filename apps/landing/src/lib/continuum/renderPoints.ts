import * as THREE from 'three'
import renderVertexShader from './shaders/render.vert'
import renderFragmentShader from './shaders/render.frag'

/**
 * @description 连续体点云的渲染 mesh —— N 个顶点，每个携带 `reference`（指向
 *   GPGPU 位置纹理的 uv），顶点着色器从纹理读位置投影。柔边圆精灵，章节色温 tint。
 * @caveats geometry 的 position 属性是占位（全 0），真实位置每帧从纹理读取；
 *   渲染顺序无关（depthWrite=false），blend 由 blending 决定（暗底 additive）。
 */

export interface ContinuumPoints {
  points: THREE.Points
  material: THREE.ShaderMaterial
  /** 把当前帧的位置纹理喂给渲染。 */
  setPositionTexture(texture: THREE.Texture): void
  setTint(color: THREE.Color): void
  setOpacity(value: number): void
  dispose(): void
}

export interface RenderPointsOptions {
  texSize: number
  pointSize: number
  tint?: THREE.ColorRepresentation
  blending?: THREE.Blending
}

export function buildContinuumPoints(opts: RenderPointsOptions): ContinuumPoints {
  const { texSize, pointSize } = opts
  const count = texSize * texSize

  const geometry = new THREE.BufferGeometry()
  // 占位 position（真实位置从纹理读）
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))

  // reference：每粒子在位置纹理里的 uv（texel 中心）
  const reference = new Float32Array(count * 2)
  for (let i = 0; i < count; i += 1) {
    reference[i * 2] = ((i % texSize) + 0.5) / texSize
    reference[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize
  }
  geometry.setAttribute('reference', new THREE.BufferAttribute(reference, 2))
  // 不参与视锥剔除（位置在 GPU，CPU 不知道包围盒）
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6)

  // 类型化的 uniform 引用，直接 mutate（绕开索引访问的 possibly-undefined）。
  const uniforms = {
    uPosition: { value: null as THREE.Texture | null },
    uPointSize: { value: pointSize },
    uSizeAtten: { value: 12 },
    uTint: { value: new THREE.Color(opts.tint ?? 0xffffff) },
    uOpacity: { value: 1 },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: opts.blending ?? THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  return {
    points,
    material,
    setPositionTexture(texture) {
      uniforms.uPosition.value = texture
    },
    setTint(color) {
      uniforms.uTint.value.copy(color)
    },
    setOpacity(value) {
      uniforms.uOpacity.value = value
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
