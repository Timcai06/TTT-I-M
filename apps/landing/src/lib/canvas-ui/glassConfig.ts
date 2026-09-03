import type { GlassOptions } from './vendor/Glass/GlassVanilla'

/** Canvas UI demo optics, enlarged slightly so the lens reads over dark project imagery. */
export const PROJECT_GLASS_CONFIG = {
  shape: 'circle',
  size: 140,
  aspect: 1.7,
  corner: 32,
  ior: 1.5,
  edge: 0.7,
  bevel: 4,
  depth: 250,
  aberration: 1,
  blur: 0,
  reflection: 1.12,
  shine: 0.14,
  zoom: 1.5,
  follow: 0.2,
  targets: '[data-glass-target]',
} as const satisfies GlassOptions
