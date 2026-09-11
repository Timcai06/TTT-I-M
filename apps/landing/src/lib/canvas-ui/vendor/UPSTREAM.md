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
  existing GSAP ScrollTrigger stage, plus pause/resume lifecycle hooks.

  This entry used to end "that do not alter the upstream renderer while active",
  which is not true, and the inaccuracy matters because the local beam visibly
  differs from the published component. Diffed against the pinned tree on
  2026-09-11: 64 added and 29 removed lines, of which two change what is drawn.

  1. **The beam travels.** Upstream sets `uBeamY` to
     `min(max(config.offset, 0) / clientH, 0.95)` — a position fixed by config,
     with `activity` supplying the motion. The local file caps that inset at 0.22
     and then sweeps the beam across the remaining band with the externally fed
     progress: `localInset + controlledProgress * (1 - localInset * 2)`. So the
     published laser sits where it is configured and reacts; this one sweeps from
     roughly 0.22 to 0.78 of the surface height as the reader scrolls.
  2. **The beam is anchored to a chosen element.** Upstream derives `beamCX` and
     `beamSpan` from `content.clientWidth / output.clientWidth`, then refines them
     from the first element child's rect and horizontal padding. The local file
     takes an added `beamTarget` and measures it against the output rect instead,
     so the beam centres and spans under real project DOM rather than under the
     capture's own first child.

  Everything else in the diff is the documented surface: the `@ts-nocheck` header,
  the WebGL validation boundary, `setScrollActivity`, and `pause`/`resume`. The
  shaders, heat model, wave and render passes are untouched.
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
  idempotent destroy, and pause/resume hooks. Glass additionally consumes the
  landing's frame-coalesced pointer coordinator, preserves kinematics while the
  Work controller hands capture between project surfaces, and requests a new
  HTML capture when the semantic hover target changes. Work additionally maps
  each local capture into a viewport-sized output so the lens is not clipped by
  project boxes. The refraction model, render passes, optical defaults and HTML
  capture path remain upstream.
- All vendored engines call the application-owned WebGL validation boundary
  before accepting shaders, linked programs, buffers, textures, framebuffers,
  or vertex arrays. Allocation, compile, link, or framebuffer failure throws
  into the owning DOM-fallback lifecycle instead of reporting an empty first
  frame. These checks do not alter successful shader output or timing.

The horizontal Bend adapter does not modify the vendored engine. Its Shader is
a direct X-axis port of the upstream rounded 40-sample fold solver.

`../particlePortal.ts` is an application-owned finite-transition adaptation of
the ParticleScroll UV sampling and point-rendering approach. It does not alter
the pinned upstream file: source/target rect mapping, object-fit crop math and
the four narrative vector fields remain isolated in the local adapter.
