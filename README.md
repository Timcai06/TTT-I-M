# Tim Cai Portfolio

High-motion personal portfolio for Tim Cai, built as a static React/Vite site with GSAP, Lenis, and a WebGL particle portrait.

## Quick Start

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Content Editing

- Chapter order and nav/progress metadata: `src/chapters/registry.ts`
- Project cards and media: `src/data/projects.ts`
- Skill rows: `src/data/skills.ts`
- Frame architecture gallery: `src/data/frames.ts`
- Life gallery photos: `src/data/life.ts`
- Intro, hero, about, skills, work, life, and contact sections: `src/components/`

## Architecture Notes

- `src/chapters/registry.ts` is the source of truth for page order, nav entries, and scroll-progress entries.
- Below-the-fold chapters are lazy-loaded so the hero can paint first.
- GSAP and Lenis are integrated through `src/lib/gsap.ts` and `src/lib/lenis.ts`.
- Intro handoff timing is centralized in `src/lib/intro.ts`.
- Chapter scrolling and hash updates are centralized in `src/lib/chapterScroll.ts`.
- The WebGL portrait lives in `src/components/ParticlePortrait.tsx`.

## Assets

- `scripts/setup-assets.mjs` prepares generated/public assets before dev and build.
- Active public assets live under `public/portrait`, `public/life`, `public/frame`, and `public/projects`.
- Frame architecture photos are sourced from `../sources/beautified/buildings` and generated into `public/frame/buildings` by `npm run setup`.
- Large unused source/archive material should stay outside `public`, otherwise Vite will ship it.

## Deployment

The project is configured for Vercel through `vercel.json`. Any static host that serves Vite's `dist/` output also works.
