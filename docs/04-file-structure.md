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
plan/        — next-phase blueprint: Particle Continuum (00–06); shipped platform frozen in 06
docs/        — these docs
```
Root `package.json` orchestrates via workspace scripts (`build`, `build:studio`, `typecheck`, `test:build`).

## `apps/landing/src` Structure
- `chapters/`: vertical-slice entrypoints plus `registry.ts`, the page-composition source of truth. `projects/` owns cards, Bento, Dialog, carousel, media modes, narrative hook, and five chapter-local CSS slices; `contact/` owns composition, iris reveal hook, contact content, and metadata.
- `components/`: reusable visual primitives and migration-safe chapter implementations. `components/effects/` owns the shared HTML-in-Canvas host plus the About Decrypt and Projects Glass bindings; new chapter-specific behavior otherwise belongs under `chapters/`.
- `core/narrative/`: data-only narrative specs and validators. No DOM or GSAP ownership.
- `shared/effects/`: lifecycle contracts and the visual-effect manifest.
- `shared/media/`: deferred media controllers such as the PhotoSwipe adapter shared by Work and Frame.
- `lab/`: development-only visual inventory available at `/lab`; it must never enter production assets.
- `lib/`: core infra — `stage.ts` (runtime SSOT), `scroll/` (refresh coordinator), `webgl/` (contextRegistry/useGLSurface/textureCache/quality), `canvas-ui/` (source-pinned vendor engines, provenance, configs and adapters), `resources/` (manifest/loaders/preloadController/imageDecodeQueue), `timelines/` (GSAP factories), `chapterScrollMetrics.ts`, `lenis.ts`, `pretextIntroText.ts`, etc.
- `content/`: content boundary — `schema.ts` / `repositories.ts` / `adapters/` / `index.ts`. **Components import data from here, never from `data/` directly** (guard-enforced).
- `data/`: raw static content (consumed only by `content/adapters/static` and the preload manifest infra).
- `styles/`: global + per-component CSS.

CSS imports are assigned to the fixed cascade order `reset → tokens → base → primitives → chapters → effects → utilities`. Do not add unlayered application CSS.

## Agent Reading Anchors
- **Loader / true progress**: start at `apps/landing/src/components/Loader.tsx`, then `apps/landing/src/lib/resources/preloadController.ts` and `apps/landing/src/lib/resources/manifest.ts`.
- **Frame archive runtime**: start at `apps/landing/src/components/frame/ArchiveThemeSection.tsx`, then `useArchiveThemeScroll.ts`, `ArchiveImageSlot.tsx`, `shared/media/openImageLightbox.ts`, and `apps/landing/src/styles/components/frame.css`.
- **Work chapter**: start at `apps/landing/src/chapters/projects/Projects.tsx`; narrative is in `useProjectsNarrative.ts`, details in `ProjectCaseDialog.tsx`, and CSS in `chapters/projects/styles/`.
- **Canvas UI identity effects**: start at `apps/landing/src/components/effects/CanvasUiHtmlSurface.tsx`, then inspect `AboutDecryptReveal.tsx` / `ProjectGlassSurface.tsx`, their `lib/canvas-ui/*Config.ts`, and the pinned source/license record under `lib/canvas-ui/vendor/`.
- **Contact chapter**: start at `apps/landing/src/chapters/contact/Footer.tsx`; `useFooterReveal.ts` owns the ScrollTrigger/iris/Liquid gate and subcomponents remain DOM-only.
- **Visual inventory**: `apps/landing/src/shared/effects/manifest.ts` for policy, then `/lab` in development for real component rendering.
- **Pretext text interaction**: start at `apps/landing/src/lib/pretextIntroText.ts`; it owns font-ready waiting, glyph measurement, and idle-stop pointer disturbance.
- **WebGL budget**: start at `apps/landing/src/lib/webgl/quality.ts`, `contextRegistry.ts`, and `useGLSurface.ts`, then inspect the concrete surface (`ParticlePortrait.tsx`, `TextParticles.tsx`, or `ChapterTransition.tsx`).
- **Scroll state**: start at `apps/landing/src/lib/chapterScrollMetrics.ts`; `useActiveChapter` and `ScrollIndicator` should not grow separate layout-measurement loops.

## `apps/studio` Structure
- `app/`: Next App Router routes — `blog/`, `blog/[slug]/`, `work/`, `work/[slug]/`, `dashboard/`, `rss.xml/`, `sitemap.ts`, `opengraph-image.tsx`, `layout.tsx`.
- `content/`: `posts/*.mdx` (writing entry) + `mdx.ts` (`readPosts()` frontmatter parser) + `index.ts` (repository wiring).
- `components/MdxContent.tsx`: server-side MDX renderer backed by `next-mdx-remote/rsc`.
- **Hard rule**: studio must not import GSAP/R3F/Three/Lenis/sitePreload (platform guard).

## `/public` (landing)
- `public/`: served as-is — `frame/{buildings,cuisine,scenery}/*.webp`, `portrait/`, `life/`, `projects/`, `noise/`, `favicon.svg`. Cache headers set in root `vercel.json`.
- `src/assets/`: imported into JS/CSS, hashed by Vite.

## Root Directories
- `scripts/` (in landing): asset generation (`setup-assets.mjs`, runs on predev/prebuild).
- `tests/`: Playwright e2e + per-workspace build guards (`apps/landing/tests/build/*`) + root `tests/build/platform-guards.mjs`.
