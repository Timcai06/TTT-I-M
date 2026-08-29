# Canvas UI upstream

- Repository: https://github.com/DavidHDev/canvas-ui
- Pinned tree: `cd17ebd6c4b68e38c5daaa37e037de1055c1d70f`
- Imported: 2026-08-29
- License: `LICENSE.md` in this directory

Vendored files preserve the upstream rendering pipelines. Local integration
changes are deliberately limited to:

- `LaserVanilla.ts`: an externally-driven scroll-activity method used by the
  existing GSAP ScrollTrigger stage, plus pause/resume lifecycle hooks that do
  not alter the upstream renderer while active.
- `LiquidVanilla.ts`: a `captureContent` switch so the Footer can render the
  complete fluid solver as a dye-only layer without distorting real Footer DOM,
  plus the same pause/resume lifecycle hooks.
- `@ts-nocheck` headers because the application enables stricter indexed-access
  checks than the upstream build.

The horizontal Bend adapter does not modify the vendored engine. Its Shader is
a direct X-axis port of the upstream rounded 40-sample fold solver.
