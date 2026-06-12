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
npm run test:smoke
npm run test:unit
```

`npm run dev` and `npm run build` intentionally target the landing app for Vercel compatibility.
`npm run test:build` runs the static architecture guards; `npm run test:smoke` verifies the deployed same-domain Studio rewrites and their `/_next` assets.

## Cross-App Links

- Landing brand link: production uses same-origin `/blog` so the public domain stays canonical; local dev can set `VITE_STUDIO_URL` for `landing:5173 → studio:5174/blog`.
- Studio brand link: set `NEXT_PUBLIC_LANDING_URL` to the deployed Landing origin so `Tim Cai Studio` returns to the cinematic landing.
- Local defaults already point `landing:5173 → studio:5174/blog` and `studio:5174 → landing:5173`; run `npm run dev:landing` and `npm run dev:studio` in two terminals for local cross-app navigation. The landing dev server uses a strict `5173` port so Studio's return link cannot drift to the wrong app.

## Runtime Boundary

The studio must never import the landing runtime stack: GSAP, Lenis, Three, R3F, or the landing preload system. Studio pages are content-first SSR/SSG surfaces; landing remains the tuned client-side cinematic entry.

## Documentation

- `plan/03-platform-direction-a.md` — platform architecture and phasing.
- `plan/06-roadmap.md` — current execution status.
- `docs/` — landing architecture and visual/runtime docs.
