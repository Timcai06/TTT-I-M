# File Structure & Directory Governance

## Monorepo layout (npm workspaces)
```
apps/
  landing/   @timcai/landing — Vite SPA (the cinematic homepage)
  studio/    @timcai/studio  — Next.js App Router (content platform)
packages/
  tokens/    @timcai/tokens  — shared design tokens (CSS variables)
  content/   @timcai/content — content schema + repository interface + adapters
tests/build/ — cross-workspace platform-guards.mjs
plan/        — upgrade blueprint + phased roadmap (00–06)
docs/        — these docs
```
Root `package.json` orchestrates via workspace scripts (`build`, `build:studio`, `typecheck`, `test:build`).

## `apps/landing/src` Structure
- `components/`: UI components and visual elements.
- `chapters/`: `registry.ts` — single source of truth for page composition (drives App body, Nav, ScrollIndicator).
- `lib/`: core infra — `stage.ts` (runtime SSOT), `scroll/` (refresh coordinator), `webgl/` (contextRegistry/useGLSurface/textureCache/quality), `resources/` (manifest/loaders/preloadController/imageDecodeQueue), `timelines/` (GSAP factories), `chapterScrollMetrics.ts`, `lenis.ts`, `pretextIntroText.ts`, etc.
- `content/`: content boundary — `schema.ts` / `repositories.ts` / `adapters/` / `index.ts`. **Components import data from here, never from `data/` directly** (guard-enforced).
- `data/`: raw static content (consumed only by `content/adapters/static` and the preload manifest infra).
- `styles/`: global + per-component CSS.

## `apps/studio` Structure
- `app/`: Next App Router routes — `blog/`, `blog/[slug]/`, `work/`, `work/[slug]/`, `dashboard/`, `rss.xml/`, `sitemap.ts`, `opengraph-image.tsx`, `layout.tsx`.
- `content/`: `posts/*.mdx` (writing entry) + `mdx.ts` (`readPosts()` frontmatter parser) + `index.ts` (repository wiring).
- `components/MdxContent.tsx`: hand-rolled markdown-subset renderer (no `@mdx-js` yet).
- **Hard rule**: studio must not import GSAP/R3F/Three/Lenis/sitePreload (platform guard).

## `/public` (landing)
- `public/`: served as-is — `frame/{buildings,cuisine,scenery}/*.webp`, `portrait/`, `life/`, `projects/`, `noise/`, `favicon.svg`. Cache headers set in root `vercel.json`.
- `src/assets/`: imported into JS/CSS, hashed by Vite.

## Root Directories
- `scripts/` (in landing): asset generation (`setup-assets.mjs`, runs on predev/prebuild).
- `tests/`: Playwright e2e + per-workspace build guards (`apps/landing/tests/build/*`) + root `tests/build/platform-guards.mjs`.
