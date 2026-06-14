import { getGLQualityProfile } from '../webgl/quality'
import { continuumQualityForTier, type ContinuumQuality } from './continuumQuality'

/**
 * @description 连续体的运行时入口：读设备能力档 → 连续体参数，以及挂载判定。
 *   与纯映射 `continuumQuality.ts` 分离，让纯核心可被 node:test 直测、本文件承接
 *   `window`/`navigator`/`getGLQualityProfile` 等运行时依赖。
 */

/** 读当前设备档 → 连续体参数。 */
export function getContinuumQuality(): ContinuumQuality {
  const profile = getGLQualityProfile()
  return continuumQualityForTier(profile.tier, profile.dprMax)
}

/**
 * 是否挂载连续体。reduced-motion 或缺 WebGL2 → 不挂载，各章走现有静态兜底
 * （00 原则·不变量2）。低端档**不**走这条路——它仍渲染稀疏粒子。
 */
export function shouldMountContinuum(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return hasWebGL2()
}

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}
