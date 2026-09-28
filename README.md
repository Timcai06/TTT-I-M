# TTT I M Platform

Tim Cai's portfolio platform is an npm-workspace monorepo. The cinematic Landing and content-focused Studio share design tokens and content contracts while keeping their runtimes separate.

## Start here

- [Documentation index](docs/README.md) — current architecture, runtime, asset, and verification guides.
- [Personal Archive asset tools](tools/personal_space/README.md) — source model and reproducible website-material pipeline.
- [Builder Graph OS roadmap](plan/README.md) — a separate future product direction, not the current implementation queue.

Older PM task cards and delivery reports remain under `docs/pm/` and `docs/landing/delivery/` as historical records. Check current source and runtime behavior before treating their status or acceptance statements as current.

## Workspaces and boundaries

- `apps/landing` — current React/Vite portfolio landing with GSAP, Lenis, R3F, preload, Frame, and chapter runtime.
- `apps/studio` — Next App Router content surface for `/blog`, `/work`, `/dashboard`, RSS, sitemap, and OG images.
- `packages/tokens` — shared color/type/motion tokens consumed by both apps.
- `packages/content` — shared content schema and repository contracts.

Studio serves content through its repository interface and must not import the Landing runtime stack (GSAP, Lenis, Three, R3F, or Landing preload). Landing remains the client-side visual entry. The [architecture guide](docs/01-architecture.md) covers the chapter and cross-app boundaries.

## Commands

```bash
npm ci
npm run dev:landing
npm run dev:studio
npm run build:landing
npm run build:studio
npm run typecheck
npm run lint
npm run test:build
npm run test:smoke
npm run test:unit
npm run test:studio
npm run test:e2e
npm run test:e2e:gates
npm run test:e2e:canvas-experimental
```

The repository contract is Node `>=24 <26` with npm `>=11 <12`; `package.json`
pins npm `11.11.0`, CI uses Node 24, and both Vercel projects install through
the committed lockfile with `npm ci`.

`npm run dev` and `npm run build` intentionally target the landing app for Vercel compatibility.
`npm run test:build` runs the static architecture guards; `npm run test:smoke` verifies deployed archive/detail rewrites, every referenced `/_next` asset, RSS, and sitemap after both zones expose the exact expected commit. Playwright builds and owns an isolated production preview on port 4173, so its results cannot accidentally describe a stale local dev process. `test:e2e:canvas-experimental` is the explicit CanvasDrawElement lane; the stable Chromium suite skips those two feature-flag-only assertions.

Canvas UI's HTML capture effects require Chromium's experimental `CanvasDrawElement` capability. A normal `npm run dev` tab intentionally keeps the complete DOM fallback when that capability is absent. Run `npm run dev:canvas` from the repository root instead; it starts Landing on port 5191 and opens an isolated Chrome profile with both required CanvasDrawElement feature flags enabled. Test the URL in that launched window rather than an already-running Chrome profile.

## Cross-App Links

- Landing brand link: production uses same-origin `/blog` so the public domain stays canonical; local dev can set `VITE_STUDIO_URL` for `landing:5173 → studio:5174/blog`.
- Studio brand link: set `NEXT_PUBLIC_LANDING_URL` to the deployed Landing origin so `Tim Cai Studio` returns to the cinematic landing.
- Local defaults already point `landing:5173 → studio:5174/blog` and `studio:5174 → landing:5173`; run `npm run dev:landing` and `npm run dev:studio` in two terminals for local cross-app navigation. The landing dev server uses a strict `5173` port so Studio's return link cannot drift to the wrong app.

For command scope and limits, see [tests and guards](docs/05-tests-and-guards.md). `test:smoke` checks deployed cross-zone routes only after both apps expose the expected commit.
