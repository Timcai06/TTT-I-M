import type { GlassOptions } from './vendor/Glass/GlassVanilla'

/** Unmodified Canvas UI Glass demo optics and portfolio-specific zoom targets. */
export const PROJECT_GLASS_CONFIG = {
  shape: 'circle',
  size: 120,
  aspect: 1.7,
  corner: 32,
  ior: 1.5,
  edge: 0.7,
  bevel: 4,
  depth: 250,
  aberration: 1,
  blur: 0,
  reflection: 1,
  shine: 0.01,
  zoom: 1.5,
  follow: 0.2,
  targets: '.media-frame__stage, .project-card__title, .project-card__link, .media-thumb',
} as const satisfies GlassOptions
