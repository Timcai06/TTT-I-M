# Plan03-B Studio Editorial Archive Design

## Context

The landing app is now stable enough to return to the platform plan. Plan01, Plan02, Plan02.5, Plan03-A, and Plan04 have already established the runtime architecture, performance hardening, monorepo split, Studio app, MDX posts, RSS, sitemap, and shared content contracts.

The remaining visible gap is Studio quality. `apps/studio` has working `/blog`, `/blog/[slug]`, `/work`, and `/work/[slug]` routes, but the current experience is still a basic text-and-card shell. Plan03-B should turn Studio into a real content product without importing the heavy landing runtime.

## Goal

Build Studio as a quiet editorial archive: a lightweight, readable, high-trust content surface for posts and project case studies.

Studio should feel connected to Tim Cai's landing site through typography, color, restraint, and small cinematic details, but it should not duplicate the landing's WebGL, GSAP, Lenis, loader, or chapter machinery.

## Non-Goals

- Do not add authentication, Postgres, uploads, moderation, or UGC.
- Do not bring GSAP, Three, R3F, Lenis, or landing preload/runtime systems into Studio.
- Do not make Studio a second landing page.
- Do not depend on new image assets for the first implementation pass.
- Do not redesign the landing app in this phase.

## Design Direction

Use the `Quiet Editorial Archive` direction.

The tone is calm, precise, and archival:

- large serif titles
- mono metadata
- thin lines and structured spacing
- readable body width
- light hover states
- clear information hierarchy
- one-column mobile reading flow

The page should feel more like a curated studio archive than a marketing page.

## Routes

### `/blog`

The blog index becomes an editorial entry page:

- hero area with Studio / Blog eyebrow, title, and short positioning copy
- featured/latest post treatment using the first post from the repository
- secondary post list rendered as quiet archive cards
- each post shows date, reading time, title, excerpt, and a subtle arrow

The page should work with the current small number of posts and scale cleanly when more MDX posts are added.

### `/blog/[slug]`

The post detail page becomes a focused reading surface:

- back link to `/blog`
- article header with date, author, reading time, title, and excerpt
- metadata strip separated from the body by a thin rule
- MDX body constrained to a comfortable reading width
- improved heading rhythm, links, code, lists, and pre blocks

The route continues to use the existing MDX pipeline.

### `/work`

The work index becomes an archive ledger rather than a generic grid:

- hero area with Studio / Work eyebrow and clearer positioning copy
- each work item is a case-study entry, not a marketing tile
- entries show title, year, status, summary/description, tags, and a detail arrow
- layout should feel structured and editorial, with light interaction only

This route must still work if only one work item exists.

### `/work/[slug]`

The work detail page becomes a case-study skeleton:

- back link to `/work`
- title, year/status/tags, summary, and description
- overview section
- stack section
- notes section
- external links when provided

This is intentionally structured data first, not MDX first. Work MDX can be introduced later if the case-study format grows.

## Data Model

Extend `WorkEntry` with optional fields so existing consumers remain safe:

- `year?: string`
- `status?: string`
- `summary?: string`
- `stack?: string[]`
- `repository?: string`
- `liveUrl?: string`
- `notes?: string[]`

The current `description`, `href`, `meta`, `slug`, `tags`, and `title` fields remain required.

Blog posts continue to use the current `Post` contract and MDX content loader.

## Component and CSS Strategy

Keep the implementation small and local:

- update route markup in `apps/studio/app/blog/page.tsx`
- update route markup in `apps/studio/app/blog/[slug]/page.tsx`
- update route markup in `apps/studio/app/work/page.tsx`
- update route markup in `apps/studio/app/work/[slug]/page.tsx`
- extend static work content in `apps/studio/content/index.ts`
- extend shared content types in `packages/content/src/index.ts`
- evolve Studio styles in `apps/studio/app/studio.css`

Do not introduce a component library unless duplication becomes clearly harmful during implementation.

## Responsive Behavior

Mobile must remain a single-column editorial flow:

- no horizontal overflow
- no wide fixed grid
- no tiny multi-column metadata
- tap targets stay comfortable
- article body remains readable

Desktop can use asymmetric editorial spacing and wider archive rows, but mobile should prioritize reading.

## Accessibility and SEO

- Keep semantic `section`, `article`, heading, and link structure.
- Preserve route metadata titles and descriptions.
- Keep RSS and sitemap behavior intact.
- Use visible link text and avoid icon-only navigation.
- Respect reduced-motion expectations by keeping Studio interactions CSS-light.

## Verification

Run the Studio-specific checks after implementation:

```bash
npm run typecheck:studio
npm run build:studio
```

If shared package types change, also run:

```bash
npm run typecheck
```

If landing-related shared packages or root platform behavior are touched, run the relevant root build guards before merging.

## Acceptance Criteria

- `/blog` feels like a real editorial archive, not a plain card grid.
- `/blog/[slug]` is comfortable to read and visibly more polished.
- `/work` presents projects as case-study entries with stronger hierarchy.
- `/work/[slug]` has enough structure to be useful even before rich media assets.
- Studio remains lightweight and does not import landing runtime dependencies.
- Mobile Studio pages remain readable with no horizontal overflow.
- Studio typecheck and build pass.
