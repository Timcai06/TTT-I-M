/**
 * @description Loader 入场/进度动画的纯参数逻辑 —— 从 Loader.tsx 抽出，
 *   动画编排（GSAP timeline）留在组件里，这里只放可单测的数字计算：
 *   字符分组、入场 stagger、进度条阻尼缓动与显示值钳制。
 * @dependencies 无 —— 纯函数，node:test 直接覆盖（tests/loaderTiming.test.ts）
 * @caveats 这些常数与 intro 的视觉节奏强耦合：改动须同步目测 intro
 *   （字符四组依次升起、进度条 99% 边界在 renderReady 前不可越过）
 */

/** 'Tim Cai.' 的字符入场分组：T | im | Ca | i. —— 每组一拍，组内再细分。 */
export function introCharGroup(index: number): number {
  if (index === 0) return 0
  if (index >= 1 && index <= 3) return 1
  if (index >= 4 && index <= 6) return 2
  return 3
}

/** 组间 0.16s 一拍 + 组内字符 0.018s 细分，构成「成组浮现」的节奏。 */
export function introRiseStagger(group: number, index: number): number {
  return group * 0.16 + index * 0.018
}

/**
 * 进度条阻尼系数：render-ready 后加速收口（0.18），未就绪时缓慢追踪（0.075），
 * 避免 preload 进度跳变导致进度条视觉抖动。
 */
export function progressDampFactor(renderReady: boolean): number {
  return renderReady ? 0.18 : 0.075
}

/** 单帧阻尼步进：displayed 向 target 收敛。 */
export function stepDisplayedProgress(
  displayed: number,
  target: number,
  renderReady: boolean,
): number {
  return displayed + (target - displayed) * progressDampFactor(renderReady)
}

/**
 * 进度显示值钳制：render-ready 前上限 99（floor，不许假装完成）；
 * 就绪后向上取整并封顶 100（让收口动画能真正到达 100）。
 */
export function displayedProgressValue(displayed: number, renderReady: boolean): number {
  return renderReady
    ? Math.min(100, Math.ceil(displayed * 100))
    : Math.min(99, Math.floor(displayed * 100))
}
