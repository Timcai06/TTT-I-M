# Core Architecture & Page Flow

## Chapter Routing System
This portfolio does not use a traditional router (like `react-router`). Instead, it relies on a bespoke "Chapter" mechanism for section mounting, lazy rendering, and sequential transitions.
- Chapters are lazily loaded to prioritize the initial Hero paint.
- `src/lib/chaptersReady.ts` coordinates when a chapter is fully mounted and ready for GSAP ScrollTrigger calculation.

## Module Responsibilities
- **Loader**: The entry point of the site. Blocks the initial render until critical assets (fonts, hero images, essential 3D textures) are preloaded to prevent FOUC (Flash of Unstyled Content).
- **Hero & About**: High-performance areas carrying heavy Text / Particle interactions. These need tight lifecycle management.
- **Frame**: Hijacks vertical scrolling via `Lenis` and maps it to a horizontal scroll or Z-axis camera push for photography display.
- **Work**: Spatial 3D project archive or engineering-style grid.
- **Navigation Transition**: Handles the physical "shutter" or "glass break" effect when jumping between chapters.

## Animation Infrastructure
- **GSAP + ScrollTrigger + Lenis**: `Lenis` handles the smooth scrolling math and proxies the scroll events to `ScrollTrigger` via `requestAnimationFrame`.
- Always remember to call `ScrollTrigger.refresh()` when lazy chapters mount or DOM height changes to recalculate start/end points.

## Three.js / React Three Fiber (R3F) Lifecycle
- Three.js scenes must manage their own disposal to prevent memory leaks over time.
- Use `useFrame` cautiously. Pause or unmount R3F canvases when they are not in the viewport to save GPU cycles.

## Pretext Interaction
- Used for interactive typography (magnetic forces, spacing tension).
- Ensure Pretext does not conflict with `SplitText`'s DOM wrapping by maintaining clear container boundaries.

## Runtime SSOT — `lib/stage.ts`
Composition has a single source of truth (`chapters/registry.ts`); runtime phase now has a matching one. `lib/stage.ts` is a small `useSyncExternalStore` machine (`booting → intro → live → transitioning`) that replaced the scattered `introExited` / `introExitedOnce` / `busyRef` flags and the loose `INTRO_EXIT_EVENT` window event.
- `intro.ts` delegates to it; the loader hand-off (`dispatchIntroExit`) is the only thing that flips `stage→live`. The `onIntroExit` 2.2s fallback is **local-only** (it must NOT advance the global stage, or the App's settle-time `ScrollTrigger.refresh` fires too early — that was a real regression, now fixed).
- Heavy WebGL self-pauses during `transitioning` (Hero frameloop gated on stage).
- Scroll refreshes route through `lib/scroll/requestRefresh` (rAF-coalesced + immediate bypass). Active chapter + progress rail read one snapshot source: `lib/chapterScrollMetrics.ts`.

## WebGL Layer — `lib/webgl/`
- `useGLSurface` — reusable dual-IntersectionObserver mount/pause lifecycle (extracted from ParticlePortrait).
- `contextRegistry` — WebGL context budget; optional surfaces (transition field) call `canAcquire()` and skip when tight.
- `textureCache` — ref-counted (last release disposes; preserves the unmount-frees-memory design).
- `quality` — device-tier profile (deviceMemory / cores / coarse-pointer → high/medium/low) driving DPR, portrait segments, text targets, transition particles, context limit.

## Content Layer — `src/content/` + `@timcai/content`
UI components depend on a repository boundary, never on `src/data/*` directly (enforced by `content-layer-guards.mjs`). `CollectionRepository<T>` exposes sync `all()` (landing renders this — no async empty-frame flash) plus async `list()/get()` (the future MDX/DB contract). Schema reserves `ContentMeta`/`PublishState` for the future publish/UGC workflow.

## Platform Layer (Monorepo, direction A)
- `apps/landing` (Vite) stays the heavy client island; `apps/studio` (Next App Router) serves `/blog`·`/work`·`/dashboard` + RSS/sitemap/OG, consuming the same repository interface. studio is **hard-isolated** from GSAP/R3F/Three/Lenis (platform guard).
- Cross-zone routing: root `vercel.json` rewrites `/blog`,`/work`,`/dashboard`,`/rss.xml` to the studio origin.
- **Known gap (open)**: there is no `/_next/*` rewrite / studio `assetPrefix`, so proxied studio pages load HTML but their `/_next` assets 404 on the main domain (unstyled/non-hydrated). See `plan/03-platform-direction-a.md`.
- studio's "MDX" is currently a hand-rolled markdown subset (`components/MdxContent.tsx` + flat-frontmatter parser), not real `@mdx-js` (no JSX/components yet).
