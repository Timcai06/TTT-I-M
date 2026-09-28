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
docs/roadmap/builder-graph/ — separate Builder Graph OS roadmap
docs/        — these docs
```
Root `package.json` orchestrates via workspace scripts (`build`, `build:studio`, `typecheck`, `test:build`).

## `apps/landing/src` Structure
- `chapters/`: vertical slices plus `registry.ts`, the page-composition source of truth. `hero/`, `about/`, `life/`, `frame/`, `skills/`, and `work-transition/` own their chapter bodies and CSS; `projects/` owns cards, Bento, Dialog, carousel, media modes, narrative hook, and five chapter-local CSS slices; `contact/` owns composition, iris reveal hook, contact content, and metadata. The About, Frame, and Work transition entries compose shared personal-archive bridges.
- `components/`: reusable visual primitives, shared effects, and the personal-archive runtime/bridges. `components/effects/` owns the shared HTML-in-Canvas host plus the About Decrypt and Projects Glass bindings; chapter-specific composition and styling live under `chapters/`.
- `core/narrative/`: data-only narrative specs and validators. No DOM or GSAP ownership.
- `shared/effects/`: lifecycle contracts and the visual-effect manifest.
- `shared/media/`: deferred media controllers such as the PhotoSwipe adapter shared by Work and Frame.
- `lab/`: development-only visual inventory available at `/lab`; it must never enter production assets.
- `lib/`: core infra — `stage.ts` (runtime SSOT), `scroll/` (refresh coordinator), `webgl/` (named leases/useGLSurface/textureCache/quality), `canvas-ui/` (source-pinned vendor engines, integrity manifest, configs and adapters), `resources/` (manifest/loaders/preloadController/taskDeadline/imageDecodeQueue/sharedResource), `mediaQueryStore.ts` (shared motion/device capability subscriptions), `timelines/` (GSAP factories), `chapterScrollMetrics.ts`, `lenis.ts`, `pretextIntroText.ts`, etc.
- `content/`: content boundary — `schema.ts` re-exports shared metadata from `@timcai/content`, `adapters/static.ts` re-exports its keyed static repository factory, and `index.ts` exposes the landing collections. The `KeyedCollectionRepository` contract and behavior live in `packages/content/src/index.ts` and its package tests. **Components import data from the landing content boundary, never from `data/` directly** (guard-enforced).
- `data/`: raw static content (consumed only by `content/adapters/static` and the preload manifest infra).
- `styles/`: global CSS and an ordered chapter/effect/primitive CSS aggregator; chapter-owned CSS lives beside its chapter.

CSS imports are assigned to the fixed cascade order `reset → tokens → base → primitives → chapters → effects → utilities`. Do not add unlayered application CSS.

## Agent Reading Anchors
- **Loader / true progress**: start at `apps/landing/src/components/Loader.tsx`, then `apps/landing/src/lib/resources/preloadController.ts` and `apps/landing/src/lib/resources/manifest.ts`.
- **Hero and About**: start at `apps/landing/src/chapters/hero/Hero.tsx` and `apps/landing/src/chapters/about/About.tsx`; the latter is mounted through `components/personal-archive/ArchiveAbout.tsx`.
- **Life and Skills**: start at `apps/landing/src/chapters/life/LifeGallery.tsx` and `apps/landing/src/chapters/skills/Skills.tsx`; their reading previews are reused by `components/personal-archive/ArchiveHandoffPage.tsx`.
- **Frame archive runtime**: start at `apps/landing/src/chapters/frame/ArchiveThemeSection.tsx`, then `useArchiveThemeScroll.ts`, `ArchiveImageSlot.tsx`, `shared/media/openImageLightbox.ts`, and `apps/landing/src/chapters/frame/styles/frame.css`.
- **Stack → Work transition**: start at `apps/landing/src/chapters/work-transition/ArchiveWorkTransition.tsx`; the reduced-motion/mobile component is `WorkTransition.tsx` and its visual rules are in `styles/work-transition.css`.
- **Work chapter**: start at `apps/landing/src/chapters/projects/Projects.tsx`; narrative is in `useProjectsNarrative.ts`, details in `ProjectCaseDialog.tsx`, and CSS in `chapters/projects/styles/`.
- **Canvas UI identity effects**: start at `apps/landing/src/components/effects/CanvasUiHtmlSurface.tsx`, then inspect `AboutDecryptReveal.tsx` / `ProjectGlassSurface.tsx`, their `lib/canvas-ui/*Config.ts`, and the pinned source/license record under `lib/canvas-ui/vendor/`.
- **Liquid Metal iframe control**: `LiquidMetalButton.tsx` owns React visibility/readiness/GPU admission; `liquidMetalAdapter.ts` owns the source-exact HTML bridge and play/circle transformations; `liquidMetalSource.ts` owns bounded shared retrieval.
- **Contact chapter**: start at `apps/landing/src/chapters/contact/Footer.tsx`; `useFooterReveal.ts` owns the ScrollTrigger/iris/Liquid gate and subcomponents remain DOM-only.
- **Visual inventory**: `apps/landing/src/shared/effects/manifest.ts` for policy, then `/lab` in development for real component rendering.
- **Pretext text interaction**: start at `apps/landing/src/lib/pretextIntroText.ts`; it owns font-ready waiting, glyph measurement, and idle-stop pointer disturbance.
- **WebGL budget**: start at `apps/landing/src/lib/webgl/quality.ts`, `contextRegistry.ts`, `programValidation.ts`, and `useGLSurface.ts`, then inspect the named lease in the concrete surface. Loose acquire/release counter calls and unchecked Shader/Program creation are forbidden.
- **Scroll state**: start at `apps/landing/src/lib/chapterScrollMetrics.ts`; `useActiveChapter` and `ScrollIndicator` should not grow separate layout-measurement loops.

## `apps/studio` Structure
- `app/`: Next App Router routes — `blog/`, `work/`, `graph/`, `dashboard/`, `api/build-meta/`, `rss.xml/`, `sitemap.ts`, `opengraph-image.tsx`, `layout.tsx`. `studio.css` is only an ordered aggregator; owned rules live in `styles/{base,editorial,article,graph,responsive}.css`, each capped at 500 lines by the platform guard. `editorial` owns indexes/cards, while `article` owns post/case/MDX document surfaces.
- `content/`: `posts/*.mdx` (writing entry) + `mdx.ts` (strict publication/date/slug boundary) + `index.ts` (repository wiring).
- `components/MdxContent.tsx`: server-side MDX renderer backed by `next-mdx-remote/rsc`; authored anchor targets are normalized by `lib/safeHref.ts` before rendering.
- `lib/site.ts`: validated canonical Studio origin. `lib/safeHref.ts`: authored-link protocol and credential boundary.
- `tests/`: Node unit tests for MDX publication rules and Studio URL/link boundaries, included in the root unit suite.
- **Hard rule**: studio must not import GSAP/R3F/Three/Lenis/sitePreload (platform guard).

## `packages/content` service boundaries
- `githubPublicService.ts`: public-preview orchestration and graph mapping only.
- `githubPublicTransport.ts`: abort deadline, response byte ceilings, content-type checks, body cancellation, and GitHub request headers.
- `githubPublicValidation.ts`: handle/repository limits plus trusted-origin and response-shape validation.
- `githubPublicPreviewCache.ts`: bounded success-only LRU, case-normalized keys, same-handle in-flight deduplication, distinct-request concurrency ceiling, expiry, and clear-generation protection.
- The platform guard caps each module at 500 lines and prevents transport or trust logic from drifting back into the orchestration layer.

## `/public` (landing)
- `public/`: served as-is — `frame/{buildings,cuisine,scenery}/*.webp`, `portrait/`, `life/`, `projects/`, `noise/`, `favicon.svg`. Cache headers set in root `vercel.json`.
- `src/assets/`: imported into JS/CSS, hashed by Vite.

## Root Directories
- `scripts/` (in landing): asset generation (`setup-assets.mjs`, runs on predev/prebuild).
- `art/<project>/`: source material for rendered or modelled assets. The README, `.gitignore` and briefs are tracked; the `.blend` files, textures and renders are local-only (`art/personal-archive` for the room, `art/intro-film` for the intro film).
- `tools/<project>/`: the tracked production scripts that build and render those assets (`tools/personal_space`, `tools/intro_film`).
- `art/project-films/`: source briefs and local production material for future project films.
- `tools/project_films/`: future independent Remotion production pipeline for project films; it is separate from the Landing build and playback runtime.
- `tests/`: Playwright e2e + per-workspace build guards (`apps/landing/tests/build/*`) + root `tests/build/platform-guards.mjs`.
