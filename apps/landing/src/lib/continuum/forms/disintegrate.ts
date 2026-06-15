/**
 * @description About 形态：粒子追踪横向文字尘埃目标，同时保留足够湍流，
 *   让自述段落背后出现“语言被拆开”的方向感。
 * @dependencies Continuum GPGPU simulation 的 `SimBehavior`
 * @performance / @caveats 行为只写 uniform；目标纹理在形态切换时生成一次，
 *   不进入逐帧路径。
 */
export const disintegrateForm = {
  id: 'disintegrate' as const,
  fallback: '#about .about__block--manifesto',
  blendMode: 'additive' as const,
  tint: '#d7c0a4',
  behavior: {
    stiffness: 0.68,
    turbulence: 1,
    damping: 0.91,
    noiseScale: 1.34,
    anchorStrength: 0.54,
  },
}
