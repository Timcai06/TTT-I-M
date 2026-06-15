import * as THREE from 'three'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import simPositionShader from './shaders/sim-position.glsl'
import simVelocityShader from './shaders/sim-velocity.glsl'

const positionShaderSource = String(simPositionShader)
const velocityShaderSource = String(simVelocityShader)

/**
 * @description 连续体的 GPGPU 仿真核心 —— position / velocity 两张浮点纹理的
 *   ping-pong 积分（朝形态目标的弹簧力 + curl 湍流）。一粒子一 texel。
 *   纯命令式，不依赖 React；由 ParticleContinuum 在 useFrame 里逐帧 compute。
 *
 * @dependencies three 的 GPUComputationRenderer（随 three 自带，examples/jsm）；
 *   sim-position / sim-velocity 着色器（curl 噪声经 vite-plugin-glsl #include 解析）。
 * @caveats 需要 WebGL2 + 浮点可渲染（EXT_color_buffer_float）；init 失败抛错，
 *   由挂载处 catch 降级到静态兜底（00 原则·失败不致命）。
 */

/** per-form 行为参数（由形态注册表提供）。 */
export interface SimBehavior {
  stiffness: number
  turbulence: number
  damping: number
  noiseScale: number
  anchorStrength: number
}

export interface ContinuumSimulation {
  /** 推进一帧；返回当前位置纹理供渲染读取。 */
  compute(dt: number, behavior: SimBehavior, morph: number): THREE.Texture
  /** 当前位置纹理（compute 后有效）。 */
  readonly positionTexture: THREE.Texture
  /** 当前起点目标纹理，w 通道供渲染层读取亮度权重。 */
  readonly fromTargetTexture: THREE.Texture
  /** 当前终点目标纹理，w 通道供渲染层读取亮度权重。 */
  readonly toTargetTexture: THREE.Texture
  /** 设置当前形态的目标位置纹理（forms 注入）。 */
  setTarget(texture: THREE.Texture): void
  /** 设置当前滚动段的形态混合目标纹理（M1 morph）。 */
  setTargets(fromTexture: THREE.Texture, toTexture: THREE.Texture): void
  dispose(): void
}

function hash01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** 在 [-r, r]³ 的球内确定性播种初始位置，w 存每粒子 seed（0..1）。 */
function seedScatter(texSize: number, radius: number): Float32Array {
  const data = new Float32Array(texSize * texSize * 4)
  for (let i = 0; i < texSize * texSize; i += 1) {
    let x = 0
    let y = 0
    let z = 0
    let d2 = 2
    let attempt = 0
    while (d2 > 1) {
      x = hash01(i * 17 + attempt * 3 + 1) * 2 - 1
      y = hash01(i * 19 + attempt * 5 + 2) * 2 - 1
      z = hash01(i * 23 + attempt * 7 + 3) * 2 - 1
      d2 = x * x + y * y + z * z
      attempt += 1
    }
    const o = i * 4
    data[o] = x * radius
    data[o + 1] = y * radius
    data[o + 2] = z * radius
    data[o + 3] = hash01(i * 29 + 5)
  }
  return data
}

/** 默认目标：球壳（M0-sim 烟测用；forms 会替换成肖像等真实目标）。 */
function seedSphereShell(texSize: number, radius: number): Float32Array {
  const data = new Float32Array(texSize * texSize * 4)
  for (let i = 0; i < texSize * texSize; i += 1) {
    const u = hash01(i * 31 + 7)
    const v = hash01(i * 37 + 11)
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const o = i * 4
    data[o] = radius * Math.sin(phi) * Math.cos(theta)
    data[o + 1] = radius * Math.sin(phi) * Math.sin(theta)
    data[o + 2] = radius * Math.cos(phi)
    data[o + 3] = 1
  }
  return data
}

function dataTexture(data: Float32Array, texSize: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, texSize, texSize, THREE.RGBAFormat, THREE.FloatType)
  tex.needsUpdate = true
  return tex
}

export interface SimulationOptions {
  renderer: THREE.WebGLRenderer
  texSize: number
  /** 初始/默认目标球半径（归一化空间）。 */
  radius?: number
}

export function createContinuumSimulation(opts: SimulationOptions): ContinuumSimulation {
  const { renderer, texSize } = opts
  const radius = opts.radius ?? 1

  const gpu = new GPUComputationRenderer(texSize, texSize, renderer)

  const posTex = gpu.createTexture()
  const velTex = gpu.createTexture()
  ;(posTex.image.data as Float32Array).set(seedScatter(texSize, radius * 1.6))
  // velocity 初始为 0（createTexture 已清零）

  const posVar: Variable = gpu.addVariable('texturePosition', positionShaderSource, posTex)
  const velVar: Variable = gpu.addVariable('textureVelocity', velocityShaderSource, velTex)
  gpu.setVariableDependencies(posVar, [posVar, velVar])
  gpu.setVariableDependencies(velVar, [posVar, velVar])

  // 默认目标球壳（forms 注入真实目标前的占位 / 烟测目标）
  let fromTargetTexture: THREE.Texture = dataTexture(seedSphereShell(texSize, radius), texSize)
  let toTargetTexture: THREE.Texture = fromTargetTexture

  // 持有类型化的 uniform 引用，逐帧 mutate 这些局部（避免索引访问的 possibly-undefined）。
  const uPosDelta = { value: 1 / 60 }
  const uTime = { value: 0 }
  const uVelDelta = { value: 1 / 60 }
  const uStiffness = { value: 3 }
  const uTurbulence = { value: 0.6 }
  const uDamping = { value: 0.9 }
  const uNoiseScale = { value: 0.6 }
  const uAnchorStrength = { value: 0.8 }
  const uMorph = { value: 0 }
  const uMorphSpread = { value: 0.18 }
  const uFromTarget: { value: THREE.Texture } = { value: fromTargetTexture }
  const uToTarget: { value: THREE.Texture } = { value: toTargetTexture }

  Object.assign(posVar.material.uniforms, { uDelta: uPosDelta, uAnchorStrength, uMorph, uMorphSpread, uFromTarget, uToTarget })
  Object.assign(velVar.material.uniforms, {
    uTime,
    uDelta: uVelDelta,
    uStiffness,
    uTurbulence,
    uDamping,
    uNoiseScale,
    uMorph,
    uMorphSpread,
    uFromTarget,
    uToTarget,
  })

  const err = gpu.init()
  if (err !== null) {
    fromTargetTexture.dispose()
    throw new Error(`Continuum GPGPU init failed: ${err}`)
  }

  let time = 0

  return {
    compute(dt, behavior, morph) {
      // clamp dt 防卡顿后大步长炸裂
      const d = Math.min(Math.max(dt, 1 / 240), 1 / 30)
      time += d
      uPosDelta.value = d
      uTime.value = time
      uVelDelta.value = d
      uStiffness.value = behavior.stiffness
      uTurbulence.value = behavior.turbulence
      uDamping.value = behavior.damping
      uNoiseScale.value = behavior.noiseScale
      uAnchorStrength.value = behavior.anchorStrength
      uMorph.value = Math.min(1, Math.max(0, morph))
      gpu.compute()
      return gpu.getCurrentRenderTarget(posVar).texture
    },
    get positionTexture() {
      return gpu.getCurrentRenderTarget(posVar).texture
    },
    get fromTargetTexture() {
      return fromTargetTexture
    },
    get toTargetTexture() {
      return toTargetTexture
    },
    setTarget(texture) {
      this.setTargets(texture, texture)
    },
    setTargets(fromTexture, toTexture) {
      const oldFrom = fromTargetTexture
      const oldTo = toTargetTexture
      fromTargetTexture = fromTexture
      toTargetTexture = toTexture
      uFromTarget.value = fromTexture
      uToTarget.value = toTexture
      for (const oldTexture of new Set([oldFrom, oldTo])) {
        if (oldTexture !== fromTexture && oldTexture !== toTexture) oldTexture.dispose()
      }
    },
    dispose() {
      gpu.dispose()
      fromTargetTexture.dispose()
      if (toTargetTexture !== fromTargetTexture) toTargetTexture.dispose()
    },
  }
}
