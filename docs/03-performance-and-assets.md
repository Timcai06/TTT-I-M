# Performance Strategy & Asset Governance

## Preload Manifest & Loader
- **Why it blocks**: `criticalReady` is only the SYSTEM → ARCHIVE phase marker. The intro exits on `renderReady`, after the complete bounded manifest has completed or entered the explicit non-fatal skip path.
- Generated via `scripts/setup-assets.mjs` (runs on `predev` and `prebuild`).

## Image Loading Strategy
- `apps/landing/src/lib/resources/manifest.ts` collects the bounded Landing image set as `visual`; eight workers fetch browser-selected candidates and complete decode before hand-off.
- Frame archive DOM images intentionally keep `loading="eager"` with responsive `srcSet/sizes`; this is the second line of defense against pop-in when users jump or scroll quickly into Frame.
- Do not add unbounded Studio/blog/work content to the landing manifest. Those routes load through the Next content surface, not through the cinematic landing loader.

## Animation & WebGL Guardrails
- **CSS / GSAP**: ONLY animate `transform` and `opacity`. Forcing layout recalculations (`width`, `top`, `left`, `margin`) will cause frame drops during smooth scroll.
- **Frame Scrolling**: The horizontal scrolling container must use `will-change: transform` to force hardware acceleration.
- **WebGL**: 
  - Limit particle counts and geometry complexity.
  - Dynamically adjust `dpr` (Device Pixel Ratio) based on performance/device capabilities (cap at 2 for high-DPI screens to save fill rate).
  - The registered page ceiling is two contexts on medium/high tiers and one on low. Required surfaces count toward optional admission; optional surfaces wait on registry events rather than poll or disappear permanently when capacity is temporarily full. Every abandoned enhancement explicitly requests `WEBGL_lose_context` after disposing its resources, so a released accounting lease cannot leave a hidden browser context alive.

## Build & Deployment (Vercel)
- Vercel handles edge caching for static assets.
- **Chunking Strategy**: `vite.config.ts` explicitly splits React, GSAP, Three/R3F and deferred feature libraries so content updates do not invalidate heavy vendor caches. PhotoSwipe, Base UI Dialog, Embla, and NumberFlow remain chapter/action scoped.
- Vercel Analytics and Speed Insights live behind a dedicated React lazy boundary: they still mount on the first commit, but their SDK bootstrap code cannot inflate the render-critical Hero entry. Content-hashed `/assets/*` receive `max-age=31536000, immutable`; unhashed public photography keeps its shorter revalidation policy.
- **Chunk budget guard** (`chunk-guards.mjs`): total JS ≤ 540 KB gzip and total CSS ≤ 160 KB gzip, with independent ceilings for Projects, Dialog, PhotoSwipe, Embla, and NumberFlow. A dependency bump or accidental eager import fails CI.
- **Deferred image byte guard** (`deferred-image-budget-guards.mjs`): audits the bounded landing preload manifest so Frame/Life/Work assets cannot silently grow beyond the agreed background-preload budget.

## Runtime budget hardening (plan 02.5)
- **Preload tiers**: critical tasks run first, then the bounded visual set runs eight-wide; `renderReady` is the only exit gate. Every task receives a child `AbortSignal`: the 12s deadline and Loader unmount both cancel image requests, remove queued decodes, detach global activity listeners and prevent late state writes. Dynamic imports/font readiness cannot be physically cancelled by browser APIs, but the controller stops awaiting them immediately and ignores their later completion. Liquid Metal and the Stack → Work Spark document are consumed into the HTTP/source cache before hand-off. A failed resource remains a recorded non-fatal skip, so one bad URL cannot strand the intro. A lightweight `window.__portfolioPreloadDebug.snapshot()` remains readable in production for deterministic support/E2E evidence; only development builds allocate stall timers or write console reports.
- **WebGL quality tiers (B3)**: `lib/webgl/quality.ts` picks high/medium/low from device hints and scales DPR, Hero portrait segments, About text targets, transition particles, and the context-admission budget. Every context has a named, idempotent lease. Optional Bend/Laser/Particle/Liquid Metal surfaces wait for a lease through registry notifications and release it on section exit, failure, or context loss. HTML-in-Canvas keeps the semantic DOM painted until a bounded first frame succeeds; image, factory, frame, or context failure is therefore a deterministic enhancement fallback rather than a blank loading state.
- **Reduced motion / observer fallback**: reduced-motion never creates Lenis or its ticker. Authored visual primitives share the motion media-query store, pause while hidden/offscreen, and treat missing ResizeObserver/IntersectionObserver as an explicit resize/static fallback instead of throwing.
- **Iframe/Canvas lifecycle**: the Stack → Work Spark renderer is preloaded by the real Loader, mounted only inside a wide `useGLSurface` chapter band, and paused outside its narrow render band. This removes first-visit pop-in without retaining its Canvas across the rest of the document.
- **Optional UI loading**: Project Dialog, PhotoSwipe, NumberFlow, and mobile-only Embla are dynamically imported from their interaction/viewport boundary. SciScope's real video/audio remains outside PhotoSwipe and retains native playback controls.
- **Single scroll snapshot (B5)**: active chapter + progress rail both read `lib/chapterScrollMetrics.ts` (one `useSyncExternalStore` snapshot, one ScrollTrigger, idle teardown) instead of independent measurements.
- **Grain (B4)**: desktop keeps the idle `mix-blend` overlay; under scroll pressure (`.disable-hover`) and on mobile/coarse-pointer it switches to a static PNG + normal blend to avoid full-screen re-compositing in the hot window.
- **Scroll throttle (A4)**: `.disable-hover` relies on `pointer-events` inheritance (body-only), not a `.disable-hover *` wildcard, so toggling it per scroll burst doesn't trigger a full-tree style recalc.

## Runtime verification status
- ~~Studio `/_next` assets 404 on the main domain~~ **Fixed 2026-06-06**: `/_next/:path*` rewrite added as the first entry in root `vercel.json`; `platform-guards.mjs` pins the entry and its ordering. Runtime verification covers archive and detail routes, checks every referenced `/_next` CSS/JS asset plus its content type on the canonical origin, and validates RSS and sitemap payloads after both zones report the exact expected commit.
- Runtime perf gates cover LCP / long-task / CLS / heap / scroll-scrub / stage / overlay, plus INP and FPS-p95 budgets. Context leases have owner/idempotence unit tests, and runtime chapter traversal enforces the page-level two-canvas ceiling. Browser automation proves engineering contracts; visual acceptance remains a separate human review.
