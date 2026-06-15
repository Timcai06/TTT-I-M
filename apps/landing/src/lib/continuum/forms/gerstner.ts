import type { SimBehavior } from '../simulation'

/**
 * @description Contact 章节的亮底水面形态：把全站粒子叙事收束成浅色余波，
 *   用 normal blending 保护 footer 文本和 CTA 可读性。
 * @dependencies Continuum GPGPU simulation 的 `SimBehavior`
 * @performance / @caveats 低透明、低湍流，避免亮底上出现灰雾或抢占联系入口。
 */
export const gerstnerForm = {
  id: 'gerstner' as const,
  fallback: '#contact',
  tint: '#c9d8d0',
  blendMode: 'normal' as const,
  behavior: {
    stiffness: 0.74,
    turbulence: 0.05,
    damping: 0.93,
    noiseScale: 0.34,
    anchorStrength: 0.9,
  } satisfies SimBehavior,
}
