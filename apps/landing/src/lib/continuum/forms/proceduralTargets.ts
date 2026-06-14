import * as THREE from 'three'
import type { ContinuumFormId } from './registry.ts'
import { loadPortraitTargetTexture } from './portrait.ts'

function hash01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function createTexture(data: Float32Array, texSize: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, texSize, texSize, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return texture
}

/**
 * @description 生成 About 解体形态的目标纹理，让粒子从肖像语义过渡为“被拆开的文字尘埃”。
 * @dependencies Three.js DataTexture；与 `simulation.ts` 的 uTarget RGBA 浮点纹理格式一致。
 * @performance / @caveats 只在形态切换时生成一次，不能进入逐帧路径；使用确定性 hash，
 *   避免强制刷新后星点布局忽大忽小或重新洗牌。
 * @steps
 * step1: 以横向文本带作为主体骨架，保留 About 章节的语言感
 * step2: 对每个粒子加入向右上漂移的错位，让形态带有解体方向
 * step3: 写入 xyz 目标坐标，w 保留亮度权重供未来形态采样扩展
 */
export function createDisintegrateTargetTexture(texSize: number): THREE.DataTexture {
  const count = texSize * texSize
  const data = new Float32Array(count * 4)

  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / texSize)
    const col = i % texSize
    const u = texSize <= 1 ? 0 : col / (texSize - 1)
    const v = texSize <= 1 ? 0 : row / (texSize - 1)
    const line = Math.floor(v * 5)
    const lineProgress = (v * 5) % 1
    const drift = Math.pow(u, 1.35)
    const breakNoise = hash01(i * 17 + line * 31)
    const offset = i * 4

    data[offset] = (u - 0.5) * 3.15 + drift * 0.62 + (breakNoise - 0.5) * 0.18
    data[offset + 1] = 0.82 - line * 0.32 + (lineProgress - 0.5) * 0.08 + drift * 0.28
    data[offset + 2] = (hash01(i * 19 + 7) - 0.5) * 0.46
    data[offset + 3] = 0.72 + hash01(i * 23 + 3) * 0.28
  }

  return createTexture(data, texSize)
}

/**
 * @description 生成 Frame/Archive 章节的星云目标纹理：高密度核心 + 双旋臂 + 外围尘埃。
 * @dependencies Three.js DataTexture；目标坐标由 GPGPU spring force 读取并追踪。
 * @performance / @caveats 这是章节切换期一次性 CPU 生成，不读取 DOM，不下载图片；
 *   旋臂参数保持确定性，保证每次刷新看到的是同一个“星团主体”。
 * @steps
 * step1: 将一部分粒子压到核心，形成可识别的亮点重心
 * step2: 其余粒子按双螺旋臂分布，制造银河形态特征
 * step3: 外围粒子轻微散射到 z 轴，滚动时保留空间深度
 */
export function createStardustTargetTexture(texSize: number): THREE.DataTexture {
  const count = texSize * texSize
  const data = new Float32Array(count * 4)

  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0 : i / (count - 1)
    const seed = hash01(i * 29 + 11)
    const arm = i % 2 === 0 ? 0 : Math.PI
    const coreBias = Math.pow(t, 0.72)
    const radius = 0.08 + 1.18 * coreBias
    const angle = coreBias * Math.PI * 4.7 + arm + (seed - 0.5) * 0.55
    const scatter = (hash01(i * 31 + 5) - 0.5) * (0.05 + radius * 0.09)
    const squash = 0.58
    const offset = i * 4

    data[offset] = Math.cos(angle) * radius * 1.38 + scatter
    data[offset + 1] = Math.sin(angle) * radius * squash + scatter * 0.45
    data[offset + 2] = (hash01(i * 37 + 13) - 0.5) * (0.24 + radius * 0.28)
    data[offset + 3] = 1 - Math.min(0.6, radius * 0.28)
  }

  return createTexture(data, texSize)
}

export async function loadContinuumTargetTexture(formId: ContinuumFormId, texSize: number): Promise<THREE.DataTexture> {
  if (formId === 'portrait') {
    return loadPortraitTargetTexture('/portrait/tim.jpg', texSize)
  }

  if (formId === 'disintegrate') {
    return createDisintegrateTargetTexture(texSize)
  }

  return createStardustTargetTexture(texSize)
}
