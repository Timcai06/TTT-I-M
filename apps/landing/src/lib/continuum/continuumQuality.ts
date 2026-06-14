import type { GLQualityTier } from '../webgl/quality'

/**
 * @description 粒子连续体的设备分级**纯映射**：给定档位 → GPGPU 参数。
 *   无运行时 import（`GLQualityTier` 仅类型，编译后擦除），故可被 node:test 直测
 *   （沿用项目「纯核心 + 运行时入口分离」范式；运行时入口见 `continuumRuntime.ts`）。
 *
 *   纪律：三档**都**渲染粒子（low 档今天就在跑 Hero portrait，连续体不能让低端
 *   反而退回静态）。「不挂载、走静态兜底」的判定是 reduced-motion / 无 WebGL2，
 *   在 `continuumRuntime.shouldMountContinuum` 里单独做，不混进档位映射。
 *
 * @caveats particleTexSize 取偶数即可（WebGL2 支持 NPOT 纹理，无需 2 的幂）；
 *   particleCount = texSize²，一粒子一 texel。调档只改数量/DPR/噪声层，
 *   不改形态、颜色、行为（00 原则·不变量3）。
 */
export interface ContinuumQuality {
  tier: GLQualityTier
  /** GPGPU 位置/速度纹理边长（2 的幂）。粒子数 = texSize²。 */
  particleTexSize: number
  /** 粒子总数（= texSize²）。 */
  particleCount: number
  /** 点精灵基础尺寸（屏幕像素，再乘 DPR / 景深）。 */
  pointSize: number
  /** 湍流 curl 噪声叠加层数，低档减层省 ALU。 */
  noiseOctaves: number
  /** 复用质量档的 DPR 上限。 */
  dprMax: number
}

const TIER_TABLE: Record<GLQualityTier, { particleTexSize: number; pointSize: number; noiseOctaves: number }> = {
  high: { particleTexSize: 256, pointSize: 2.2, noiseOctaves: 3 },
  medium: { particleTexSize: 192, pointSize: 2.0, noiseOctaves: 2 },
  low: { particleTexSize: 128, pointSize: 1.8, noiseOctaves: 2 },
}

/** 从给定档位映射连续体参数（纯函数）。 */
export function continuumQualityForTier(tier: GLQualityTier, dprMax: number): ContinuumQuality {
  const base = TIER_TABLE[tier]
  return {
    tier,
    dprMax,
    particleCount: base.particleTexSize * base.particleTexSize,
    ...base,
  }
}
