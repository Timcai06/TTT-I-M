# Canvas UI upstream

- Repository: https://github.com/DavidHDev/canvas-ui
- Pinned tree: `cd17ebd6c4b68e38c5daaa37e037de1055c1d70f`
- Imported: 2026-08-29
- License: `LICENSE.md` in this directory

Decrypt Reveal and Glass were added from the later pinned tree
`a4b40d03ad92a6210af114df7a1900a2675fe288` on 2026-09-03:

- `DecryptReveal/DecryptRevealVanilla.ts`
- `Glass/GlassVanilla.ts`

Vendored files preserve the upstream rendering pipelines. Local integration
changes are deliberately limited to:

- `LaserVanilla.ts`: an externally-driven scroll-activity method used by the
  existing GSAP ScrollTrigger stage, plus pause/resume lifecycle hooks that do
  not alter the upstream renderer while active.
- `LiquidVanilla.ts`: a `captureContent` switch so the Footer can render the
  complete fluid solver as a dye-only layer without distorting real Footer DOM,
  plus the same pause/resume lifecycle hooks.
- `ParticleScrollVanilla.ts`: a page-progress method that changes only the
  upstream content element's `scrollTop`, plus a first-capture callback and an
  application DPR cap. Shaders, opaque composition, formation line, row texture,
  point grid, stagger, drift, one-second intro and settle solver remain upstream.
- `@ts-nocheck` headers because the application enables stricter indexed-access
  checks than the upstream build.
- `DecryptRevealVanilla.ts` and `GlassVanilla.ts`: first-captured-frame callbacks,
  idempotent destroy, and pause/resume hooks. Their shaders, render passes,
  pointer solvers, defaults and HTML capture path remain upstream.

The horizontal Bend adapter does not modify the vendored engine. Its Shader is
a direct X-axis port of the upstream rounded 40-sample fold solver.

`../particlePortal.ts` is an application-owned finite-transition adaptation of
the ParticleScroll UV sampling and point-rendering approach. It does not alter
the pinned upstream file: source/target rect mapping, object-fit crop math and
the four narrative vector fields remain isolated in the local adapter.
