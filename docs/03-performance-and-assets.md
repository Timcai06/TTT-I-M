# Performance Strategy & Asset Governance

## Preload Manifest & Loader
- **Why it blocks**: The `Loader` waits for `critical` resources only (`criticalReady`): hero texture, fonts, motion chunks, lazy chapter chunks, and the About text-particle field. `deferred` images continue in the background after the panel exits.
- Generated via `scripts/setup-assets.mjs` (runs on `predev` and `prebuild`).

## Image Loading Strategy
- `apps/landing/src/lib/resources/manifest.ts` collects the bounded landing image set and marks it `deferred`; these tasks use low-priority eager fetch plus idle decode through `imageDecodeQueue`.
- Frame archive DOM images intentionally keep `loading="eager"` with responsive `srcSet/sizes`; this is the second line of defense against pop-in when users jump or scroll quickly into Frame.
- Do not add unbounded Studio/blog/work content to the landing manifest. Those routes load through the Next content surface, not through the cinematic landing loader.

## Animation & WebGL Guardrails
- **CSS / GSAP**: ONLY animate `transform` and `opacity`. Forcing layout recalculations (`width`, `top`, `left`, `margin`) will cause frame drops during smooth scroll.
- **Frame Scrolling**: The horizontal scrolling container must use `will-change: transform` to force hardware acceleration.
- **WebGL**: 
  - Limit particle counts and geometry complexity.
  - Dynamically adjust `dpr` (Device Pixel Ratio) based on performance/device capabilities (cap at 2 for high-DPI screens to save fill rate).

## Build & Deployment (Vercel)
- Vercel handles edge caching for static assets.
- **Chunking Strategy**: `vite.config.ts` explicitly splits React, GSAP, Three/R3F and deferred feature libraries so content updates do not invalidate heavy vendor caches. PhotoSwipe, Base UI Dialog, Embla, and NumberFlow remain chapter/action scoped.
- **Chunk budget guard** (`chunk-guards.mjs`): total JS ≤ 540 KB gzip and total CSS ≤ 160 KB gzip, with independent ceilings for Projects, Dialog, PhotoSwipe, Embla, and NumberFlow. A dependency bump or accidental eager import fails CI.
- **Deferred image byte guard** (`deferred-image-budget-guards.mjs`): audits the bounded landing preload manifest so Frame/Life/Work assets cannot silently grow beyond the agreed background-preload budget.

## Runtime budget hardening (plan 02.5)
- **Preload tiers (B2, gate split 2026-06-10)**: the intro-exit gate is the *critical* tier only (`criticalReady`: hero texture, fonts, chunks, About particles) — the loader bar shows critical progress and 100% = runtime ready. Deferred images keep eager-fetching through the concurrency queue (6-wide) *after* the panel exits (the Loader stays mounted, so the run is never cancelled), with idle decode via `lib/resources/imageDecodeQueue.ts`. Same total download as the whole-site gate, smaller black-screen window (00-principles preheat fix ②). Frame DOM images stay eager as the pop-in second line of defense. Failures are non-fatal (per-task timeout — a single 404/slow image can never strand the loader). Background `decode()` rejections are swallowed silently (some valid WebP rejects background decode in Chrome; the DOM `<img>` still paints).
- **WebGL quality tiers (B3)**: `lib/webgl/quality.ts` picks high/medium/low from device hints and scales DPR, Hero portrait segments, About text targets, transition particles, and the optional-context budget.
- **Optional UI loading**: Project Dialog, PhotoSwipe, NumberFlow, and mobile-only Embla are dynamically imported from their interaction/viewport boundary. SciScope's real video/audio remains outside PhotoSwipe and retains native playback controls.
- **Single scroll snapshot (B5)**: active chapter + progress rail both read `lib/chapterScrollMetrics.ts` (one `useSyncExternalStore` snapshot, one ScrollTrigger, idle teardown) instead of independent measurements.
- **Grain (B4)**: desktop keeps the idle `mix-blend` overlay; under scroll pressure (`.disable-hover`) and on mobile/coarse-pointer it switches to a static PNG + normal blend to avoid full-screen re-compositing in the hot window.
- **Scroll throttle (A4)**: `.disable-hover` relies on `pointer-events` inheritance (body-only), not a `.disable-hover *` wildcard, so toggling it per scroll burst doesn't trigger a full-tree style recalc.

## Runtime verification status
- ~~Studio `/_next` assets 404 on the main domain~~ **Fixed 2026-06-06**: `/_next/:path*` rewrite added as the first entry in root `vercel.json`; `platform-guards.mjs` pins the entry and its ordering. Runtime verification: `tests/runtime/cross-zone-smoke.mjs` fetches the main-domain `/blog` and asserts its referenced `/_next` assets all 200 (the failure mode string guards can't see).
- Runtime perf gates now cover LCP / long-task / CLS / heap / scroll-scrub / stage / overlay, plus INP and FPS-p95 budgets in `apps/landing/tests/e2e/performance.spec.ts`. CI can relax budgets through env vars on constrained runners; local runs remain the authoritative visual/perf check. Remaining gap: repeated chapter-jump WebGL context-leak verification.
