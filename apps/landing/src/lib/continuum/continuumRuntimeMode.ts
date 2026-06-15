import type { Frameloop } from '@react-three/fiber'
import type { Stage } from '../stage.ts'

const visibleOpacityThreshold = 0.001

/**
 * @description Particle Continuum 的运行门控。它只在 live 且确实可见时推进 GPGPU，
 *   避免 intro/transition/hero 不可见阶段仍占用第二个 WebGL 帧循环。
 * @dependencies `stage.ts` 的运行阶段机，以及 `ContinuumScrollState.opacity`。
 * @performance / @caveats 阈值必须大于 0，避免浮点残留让不可见 canvas 继续跑帧。
 */
export function shouldRunContinuumFrame(stage: Stage, opacity: number): boolean {
  return stage === 'live' && opacity > visibleOpacityThreshold
}

/**
 * @description 把运行门控映射成 R3F frameloop；用于 Canvas 级暂停，而不是只在 shader 内 early return。
 */
export function getContinuumFrameloop(stage: Stage, opacity: number): Frameloop {
  return shouldRunContinuumFrame(stage, opacity) ? 'always' : 'never'
}
