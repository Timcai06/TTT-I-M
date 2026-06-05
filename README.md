# TTT I M Platform

Monorepo for Tim Cai's cinematic landing and future content studio.

## Structure

- `apps/landing` — current React/Vite portfolio landing with GSAP, Lenis, R3F, preload, Frame, and chapter runtime.
- `apps/studio` — Next App Router content surface for `/blog`, `/work`, `/dashboard`, RSS, sitemap, and OG images.
- `packages/tokens` — shared color/type/motion tokens consumed by both apps.
- `packages/content` — shared content schema and repository contracts.

## Commands

```bash
npm install
npm run dev:landing
npm run dev:studio
npm run build:landing
npm run build:studio
npm run typecheck
npm run lint
npm run test:build
```

`npm run dev` and `npm run build` intentionally target the landing app for Vercel compatibility.

## Cross-App Links

- Landing brand link: set `VITE_STUDIO_URL` to the deployed Studio origin if `/blog` is not yet wired as a Vercel multi-zone rewrite.
- Studio brand link: set `NEXT_PUBLIC_LANDING_URL` to the deployed Landing origin so `Tim Cai Studio` returns to the cinematic landing.

## Runtime Boundary

The studio must never import the landing runtime stack: GSAP, Lenis, Three, R3F, or the landing preload system. Studio pages are content-first SSR/SSG surfaces; landing remains the tuned client-side cinematic entry.

## Documentation

- `plan/03-platform-direction-a.md` — platform architecture and phasing.
- `plan/06-roadmap.md` — current execution status.
- `docs/` — landing architecture and visual/runtime docs.
