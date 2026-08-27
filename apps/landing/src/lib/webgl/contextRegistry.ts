import { getGLQualityProfile } from './quality'

let active = 0

/**
 * @description 返回当前已登记的 WebGL context 数量，用于调试和可选视觉面的预算判断
 * @dependencies 依赖本模块内存态 active；没有跨 tab 或跨页面持久化
 */
export function activeContextCount(): number {
  return active
}

/**
 * @description 判断可选 WebGL surface 当前是否还能创建新的 context
 * @dependencies 依赖 getGLQualityProfile().optionalContextLimit
 * @performance 可选转场/氛围层在预算不足时应跳过，而不是和 Hero/About 抢 GPU 资源
 * @caveats 必要 surface 仍应调用 acquireContext/releaseContext 登记数量，但不应该被这个判断阻止渲染
 */
export function canAcquire(): boolean {
  return active < getGLQualityProfile().optionalContextLimit
}

/**
 * @description canAcquire 的语义化别名，给调用方明确表达“可选视觉面”的预算检查
 * @dependencies 复用 canAcquire
 */
export function canAcquireOptionalSurface(): boolean {
  return canAcquire()
}

/**
 * @description 登记一个已挂载的 WebGL context，保证可选 surface 能看到真实并发压力
 * @dependencies 由 Hero 等 WebGL surface 在挂载时调用
 * @caveats 必须和 releaseContext 成对出现，否则后续可选 surface 会被错误跳过
 */
export function acquireContext(): void {
  active += 1
}

/**
 * @description 释放一个已卸载的 WebGL context 登记，防止热更新或路由切换后预算被长期占用
 * @dependencies 与 acquireContext 成对使用
 * @caveats 使用 Math.max 防御重复 cleanup，避免 active 变成负数
 */
export function releaseContext(): void {
  active = Math.max(0, active - 1)
}
