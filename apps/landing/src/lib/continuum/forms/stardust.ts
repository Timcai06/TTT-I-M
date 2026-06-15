/**
 * @description Life / Frame / Skills 的星云形态：更快收束到双臂星团目标，
 *   但仍作为背景呼吸层，不抢照片、红线和正文的前景权重。
 * @dependencies Continuum GPGPU simulation 的 `SimBehavior`
 * @performance / @caveats 中等刚度保证形态可辨；低湍流避免主体被揉成雾。
 */
export const stardustForm = {
  id: 'stardust' as const,
  fallback: '#frame',
  tint: '#b8d5c2',
  behavior: {
    stiffness: 0.58,
    turbulence: 0.18,
    damping: 0.91,
    noiseScale: 0.58,
    anchorStrength: 0.82,
  },
}
