import { isMobileExperience } from '../device'

export type GLQualityTier = 'high' | 'medium' | 'low'

/**
 * @description WebGL 视觉面的统一质量档位，集中控制点数、DPR 和可选 context 数量
 */
export interface GLQualityProfile {
  /** 当前设备能力档位，由内存、CPU 核心数和移动端体验共同决定 */
  tier: GLQualityTier
  /** Canvas/R3F 可使用的最高 DPR，防止高 DPR 屏幕把 fragment/point 成本放大 */
  dprMax: number
  /** 可选 WebGL surface 的最大并发数；Hero/About 等必要 surface 只登记不 gate */
  optionalContextLimit: number
  /** Hero portrait 球面分段数，直接影响顶点数量和 GPU 几何成本 */
  portraitSegments: number
}

interface NavigatorWithDeviceHints extends Navigator {
  /** Chromium 非标准设备内存 hint，单位 GB；Safari/Firefox 可能不存在 */
  deviceMemory?: number
}

/**
 * @description 基于浏览器设备 hint 推断 WebGL 质量档，给 landing 的多个视觉面共用
 * @dependencies 依赖 navigator.deviceMemory、navigator.hardwareConcurrency 和 isMobileExperience
 * @caveats 缺少浏览器环境时返回 medium，适配 SSR/测试环境；deviceMemory 不是所有浏览器都支持，因此默认按 8GB 处理
 */
function detectTier(): GLQualityTier {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'medium'

  const hints = navigator as NavigatorWithDeviceHints
  const memory = hints.deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 8
  const mobile = isMobileExperience()

  if (memory <= 4 || cores <= 4 || (mobile && memory <= 6)) return 'low'
  if (memory <= 6 || cores <= 6 || mobile) return 'medium'
  return 'high'
}

/**
 * @description 返回当前设备的 WebGL 预算配置，供 Hero、About 粒子、转场粒子和 contextRegistry 共享
 * @dependencies 依赖 detectTier 的设备能力判断
 * @performance 低配档主动减少 DPR、粒子点数和可选 context，优先保证滚动稳定而不是视觉密度
 */
export function getGLQualityProfile(): GLQualityProfile {
  const tier = detectTier()

  if (tier === 'low') {
    return {
      tier,
      dprMax: 1.15,
      optionalContextLimit: 1,
      portraitSegments: 150,
    }
  }

  if (tier === 'medium') {
    return {
      tier,
      dprMax: 1.35,
      optionalContextLimit: 2,
      portraitSegments: 220,
    }
  }

  return {
    tier,
    dprMax: 1.5,
    optionalContextLimit: 3,
    portraitSegments: 260,
  }
}
