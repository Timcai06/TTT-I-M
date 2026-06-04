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
