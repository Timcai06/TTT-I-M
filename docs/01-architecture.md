# Core Architecture & Page Flow

## Chapter Routing System
This portfolio does not use a traditional router (like `react-router`). Instead, it relies on a bespoke "Chapter" mechanism for section mounting, lazy rendering, and sequential transitions.
- Chapters are lazily loaded to prioritize the initial Hero paint.
- Every registry entry resolves through `src/chapters/<chapter>/index.ts`. Projects and Contact are full vertical slices; the remaining entries are migration-safe boundaries around their existing implementations.
- `src/lib/chaptersReady.ts` coordinates when a chapter is fully mounted and ready for GSAP ScrollTrigger calculation.

## Module Responsibilities
- **Loader**: The entry point of the site. `criticalReady` advances the stage label, while only `renderReady` releases the intro after the complete bounded Landing manifest has loaded or been explicitly skipped.
- **Hero & About**: Hero owns the eager portrait scene; About lazily mounts a source-pinned Canvas UI Decrypt Reveal over its identity dossier, then returns to semantic DOM evidence content.
- **Frame**: Maps vertical scroll to a horizontal photography rail; supported Chromium can add the chapter-local horizontal Bend while stable browsers retain the real DOM and edge-blur fallback.
- **Work**: Spatial 3D project archive or engineering-style grid.
- **Navigation Transition**: Handles the physical "shutter" or "glass break" effect when jumping between chapters.

## Animation Infrastructure
- **GSAP + ScrollTrigger + Lenis**: `Lenis` handles the smooth scrolling math and proxies the scroll events to `ScrollTrigger` via `requestAnimationFrame`.
- Always remember to call `ScrollTrigger.refresh()` when lazy chapters mount or DOM height changes to recalculate start/end points.

## Narrative and Effect Contracts
- `src/core/narrative/` is the data-only contract for long scroll stories. `WORK_TRANSITION_NARRATIVE` owns the Stack → Work geometry, named phases, and explicit CTA release gate; the component/controller consumes it instead of duplicating thresholds.
- `src/shared/effects/manifest.ts` records each optional visual's chapter, fallback, motion policy, GPU cost, and source/license boundary.
- Canvas handles share `pause / resume / resize / destroy`; each WebGL owner holds an idempotent named `ContextLease`. Optional allocation is atomic (`tryAcquireOptionalContext`), so two effects cannot consume the final budget slot concurrently.
- Native HTML-in-Canvas effects share `components/effects/CanvasUiHtmlSurface.tsx`: one real semantic DOM subtree always owns layout and interaction; hidden source and pointer-transparent output canvases only enhance it. Initial image readiness, renderer construction, and the first captured frame each have a bounded deadline. The DOM remains visible until that first frame, and every unsupported, timed-out, context-lost, or destroy-failed path restores the DOM, releases its lease, and explicitly loses the disposable WebGL context. Decrypt Reveal owns the About dossier; Glass starts only after the Work Laser handoff settles, captures one complete project card at a time through an exclusive surface slot, and is suspended for project dialogs.
- `ChapterBoundary` records the last measured chapter height. A render/chunk error is reported, preserves downstream scroll geometry, and exposes a reload recovery action instead of silently collapsing the chapter.
- `/lab` is development-only and dynamically imports `src/lab/VisualLab.tsx`. Production builds must not emit a Visual Lab chunk.

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
- `contextRegistry` — named WebGL leases, owner diagnostics, idempotent release, an atomic optional-context budget, and explicit `WEBGL_lose_context` disposal for abandoned canvases. Hero reserves its required lease before R3F may construct the renderer; deferred effects wait on registry events and release on cancellation, failure, or context loss.
- `textureCache` — ref-counted (last release disposes; preserves the unmount-frees-memory design); rejected loads are evicted so a transient failure cannot poison later consumers.
- `quality` — device-tier profile (deviceMemory / cores / coarse-pointer → high/medium/low) driving DPR, portrait segments, text targets, transition particles, context limit.

Reduced-motion is a separate native-scroll runtime: it does not construct Lenis or attach the GSAP ticker. Media-query state is fanned out through shared external stores, so toggling the OS preference updates every consumer without one native listener per component.

## Content Layer — `src/content/` + `@timcai/content`
UI components depend on a repository boundary, never on `src/data/*` directly (enforced by `content-layer-guards.mjs`). `CollectionRepository<T>` exposes sync `all()` (landing renders this — no async empty-frame flash) plus async `list()/get()` (the future MDX/DB contract). Static adapters freeze their collection snapshot, reject duplicate or whitespace-only identities, and key lookups once instead of rescanning on every request. Schema reserves `ContentMeta`/`PublishState` for the future publish/UGC workflow.

Project media additionally carries intrinsic `width / height`, independent `alt`, and optional evidence-backed metrics. PhotoSwipe and NumberFlow consume these contracts; invented or source-less metrics are rejected by tests.

## Platform Layer (Monorepo, direction A)
- `apps/landing` (Vite) stays the heavy client island; `apps/studio` (Next App Router) serves `/blog`·`/work`·`/dashboard` + RSS/sitemap/OG, consuming the same repository interface. studio is **hard-isolated** from GSAP/R3F/Three/Lenis (platform guard).
- Cross-zone routing: root `vercel.json` rewrites `/blog`,`/work`,`/dashboard`,`/rss.xml`,`/sitemap.xml` to the studio origin.
- **Fixed (2026-06-06)**: `/_next/:path*` is rewritten to the studio origin and MUST stay the *first* rewrite entry. `build-meta.json` (Landing) and `/__studio/build-meta.json` (Studio proxy) expose non-cacheable deployment commits. Push CI waits until both zones serve the exact pushed SHA before running the route/assets smoke, eliminating checks against stale production.
- studio's MDX is real MDX (2026-06-06): `MdxContent.tsx` compiles via `next-mdx-remote/rsc` on the server (compiler stays out of the client bundle), frontmatter via `gray-matter`. Publication state and quoted calendar dates are validated before exposure; invalid/duplicate slugs, empty required fields, future-state leakage, and reversed date ranges fail closed. Authored links pass through an allowlist that accepts relative, HTTP(S), mail, and telephone targets while rejecting executable protocols and credential-bearing URLs.
- Public GitHub preview is split into validation, bounded transport, success-only cache, and orchestration modules. The whole profile/repository/README operation shares one absolute deadline; each response also has byte and content-type ceilings. Only successful snapshots enter the bounded, case-normalized LRU cache, while transient failures remain retryable, same-handle callers share one request, and distinct outbound previews have a hard process-local concurrency ceiling with no unbounded queue.
