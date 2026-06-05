# Performance Strategy & Asset Governance

## Preload Manifest & Loader
- **Why it blocks**: The `Loader` must wait for critical assets because the first impression of the 3D render and high-res typography cannot afford texture pop-in or layout shifts.
- Generated via `scripts/setup-assets.mjs` (runs on `predev` and `prebuild`).

## Image Loading Strategy
- Critical hero images are preloaded via the manifest.
- Below-the-fold or non-critical images must use `loading="lazy"` and appropriate `srcset` sizes.
- Use `vite-plugin-image-optimizer` to compress assets at build time (WebP/AVIF preferred) to reduce payload size.

## Animation & WebGL Guardrails
- **CSS / GSAP**: ONLY animate `transform` and `opacity`. Forcing layout recalculations (`width`, `top`, `left`, `margin`) will cause frame drops during smooth scroll.
- **Frame Scrolling**: The horizontal scrolling container must use `will-change: transform` to force hardware acceleration.
- **WebGL**: 
  - Limit particle counts and geometry complexity.
  - Dynamically adjust `dpr` (Device Pixel Ratio) based on performance/device capabilities (cap at 2 for high-DPI screens to save fill rate).

## Build & Deployment (Vercel)
- Vercel handles edge caching for static assets.
- **Chunking Strategy**: `vite.config.ts` explicitly splits `react-vendor`, `gsap-vendor`, and `three-vendor` to prevent content updates from busting the long-term cache of heavy dependencies. Keep these boundaries clean.
- **Chunk budget guard** (`chunk-guards.mjs`): gzip ceilings per chunk (three 260 / react 72 / gsap 66 / index 40 / layout 24) + total JS ≤ 460 KB (currently ~394 KB). A dependency bump or an accidental eager `three`/`gsap` import fails CI.

## Runtime budget hardening (plan 02.5)
- **Preload tiers (B2)**: critical assets gate the intro; deferred images use native `loading="lazy"` + a near-viewport idle decode queue (`lib/resources/imageDecodeQueue.ts`). Failures are non-fatal (per-task timeout — a single 404/slow image can never strand the loader). Background `decode()` rejections are swallowed silently (some valid WebP rejects background decode in Chrome; the DOM `<img>` still paints).
- **WebGL quality tiers (B3)**: `lib/webgl/quality.ts` picks high/medium/low from device hints and scales DPR, Hero portrait segments, About text targets, transition particles, and the optional-context budget.
- **Single scroll snapshot (B5)**: active chapter + progress rail both read `lib/chapterScrollMetrics.ts` (one `useSyncExternalStore` snapshot, one ScrollTrigger, idle teardown) instead of independent measurements.
- **Grain (B4)**: desktop keeps the idle `mix-blend` overlay; under scroll pressure (`.disable-hover`) and on mobile/coarse-pointer it switches to a static PNG + normal blend to avoid full-screen re-compositing in the hot window.
- **Scroll throttle (A4)**: `.disable-hover` relies on `pointer-events` inheritance (body-only), not a `.disable-hover *` wildcard, so toggling it per scroll burst doesn't trigger a full-tree style recalc.

## Known performance/deploy gaps (open)
- **Studio `/_next` assets 404 on the main domain**: cross-zone rewrites proxy studio HTML but there's no `/_next/*` rewrite / `assetPrefix`, so `ttt-i-m.vercel.app/blog` loads unstyled. (See `plan/03`.) This is a deploy-config issue the source-string guards can't catch — needs a runtime check.
- No runtime perf gates yet (LCP/INP/CLS/FPS/long-task budgets from plan 05 are unimplemented).
