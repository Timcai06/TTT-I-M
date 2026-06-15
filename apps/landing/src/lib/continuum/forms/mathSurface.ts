import type { SimBehavior } from '../simulation'

/**
 * @description Work 章节的数学曲面形态：用低透明参数曲面暗示工程/建模能力，
 *   只作为项目卡片背后的系统轨迹，不替代作品截图。
 * @dependencies Continuum GPGPU simulation 的 `SimBehavior`
 * @performance / @caveats 中低锚定和低湍流保证曲线可读但不抢 Work 内容。
 */
export const mathSurfaceForm = {
  id: 'mathSurface' as const,
  fallback: '#projects',
  tint: '#d6b06f',
  blendMode: 'additive' as const,
  behavior: {
    stiffness: 0.52,
    turbulence: 0.12,
    damping: 0.92,
    noiseScale: 0.48,
    anchorStrength: 0.68,
  } satisfies SimBehavior,
}
