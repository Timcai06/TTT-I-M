# Portfolio Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the portfolio to a reliably shippable state, then improve type safety, performance, SEO/accessibility, and maintainability without diluting the current high-motion editorial identity.

**Architecture:** Keep the existing React/Vite single-page structure and the chapter registry as the source of truth. Stabilize runtime behavior first, then add guardrails around TypeScript, linting, tests, URL state, resource handling, and docs. Avoid routing/framework churn unless a future brand-site version needs true multi-page content.

**Tech Stack:** React 19, TypeScript, Vite 8, GSAP/ScrollTrigger, Lenis, Three/R3F, native CSS, Vitest, GitHub Actions.

---

## Report Synthesis

The pasted report and the latest local inspection agree on the main shape: this is a scroll-driven personal portfolio with unusually strong motion/performance intent for a personal site. Both reviews identify the chapter registry, code-splitting, WebGL offscreen pause, reduced-motion handling, and resource setup script as strong decisions.

The main difference is severity. The pasted report described the missing `gsap` import in `ScrollIndicator.tsx` as a hidden global-dependency bug. The latest browser check showed the bug is already active in the current workspace: opening the dev server produced `ReferenceError: gsap is not defined`, React cleared `#root`, and the page rendered black. Therefore, runtime recovery is Task 1 and blocks visual QA.

## Execution Order

1. **Rescue release path:** fix black screen and verify browser runtime.
2. **Shrink shipped assets:** remove unused `public/` payload from the deployment path.
3. **Add quality guardrails:** strict TypeScript, type-aware lint, and small unit tests.
4. **Unify scroll state:** reduce duplicated active-section logic and add hash deep links.
5. **Tame intro timing:** centralize `loader:exit` event and fallback timing.
6. **SEO/accessibility pass:** add share metadata, focus states, and semantics fixes.
7. **Docs and handoff:** replace the Vite README and update drifted docs.
8. **Visual/mobile QA:** only after the page runs, tune mobile hero/nav/project reading flow.

---

### Task 1: Fix Runtime Black Screen

**Files:**
- Modify: `src/components/ScrollIndicator.tsx`
- Verify: browser at `http://127.0.0.1:5187/`

- [ ] **Step 1: Import `gsap` explicitly**

Replace the current import:

```tsx
import { ScrollTrigger } from '../lib/gsap'
```

with:

```tsx
import { gsap, ScrollTrigger } from '../lib/gsap'
```

- [ ] **Step 2: Run static checks**

Run:

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit --pretty false
```

Expected: both commands exit `0`.

- [ ] **Step 3: Verify in browser**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5187
```

Open `http://127.0.0.1:5187/`.

Expected:
- Hero renders instead of black screen.
- Dev console has no `ReferenceError: gsap is not defined`.
- `document.querySelector('#hero')` returns an element.
- `document.querySelector('main')` returns an element.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScrollIndicator.tsx
git commit -m "Fix scroll indicator GSAP import"
```

---

### Task 2: Remove Unused Public Payload From Release Path

**Files:**
- Modify: `.gitignore`
- Move or delete from `public/`: `img1.jpg` to `img9.jpg`, `profile.jpg`, `server.glb`
- Check: `src/**`, `index.html`, `docs/**`

- [ ] **Step 1: Confirm unused assets**

Run:

```bash
rg -n "img[1-9]\\.jpg|profile\\.jpg|server\\.glb" src index.html docs README.md scripts
```

Expected current result: only docs references, no `src` or `index.html` dependency.

- [ ] **Step 2: Move unused release assets out of `public`**

Recommended target:

```txt
../sources/archive/portfolio-unused-public/
```

Move:

```txt
public/img1.jpg
public/img2.jpg
public/img3.jpg
public/img4.jpg
public/img5.jpg
public/img6.jpg
public/img7.jpg
public/img8.jpg
public/img9.jpg
public/profile.jpg
public/server.glb
```

Do not move:

```txt
public/portrait/*
public/life/*
public/projects/*
public/favicon.svg
public/icons.svg
```

- [ ] **Step 3: Keep future archive files out of Git**

Add to `.gitignore`:

```gitignore
sources/archive/
public/img*.jpg
public/profile.jpg
public/server.glb
```

- [ ] **Step 4: Build and compare output size**

Run:

```bash
npm run build
du -sh dist public
find dist -maxdepth 2 -type f -print0 | xargs -0 ls -lh | sort -k5 -hr | head -n 20
```

Expected:
- `dist/server.glb` absent.
- `dist/img*.jpg` absent.
- `dist/profile.jpg` absent.
- `dist` shrinks by roughly 30MB+ uncompressed.

- [ ] **Step 5: Commit**

```bash
git add .gitignore public
git commit -m "Remove unused public release assets"
```

---

### Task 3: Enable Strict TypeScript Safely

**Files:**
- Modify: `tsconfig.app.json`
- Likely modify: `src/components/Projects.tsx`, `src/components/ScrollIndicator.tsx`, `src/components/Nav.tsx`

- [ ] **Step 1: Enable strict compiler options**

In `tsconfig.app.json`, add:

```json
"strict": true,
"noUncheckedIndexedAccess": true,
```

inside `compilerOptions`.

- [ ] **Step 2: Run type check and collect failures**

Run:

```bash
npx tsc -p tsconfig.app.json --noEmit --pretty false
```

Expected: failures may appear around array indexing such as `shots[active]`, `sections[0]`, and `proportions[i]`.

- [ ] **Step 3: Fix `ProjectMedia` active shot access**

Use a safe fallback:

```tsx
const shot = shots[active] ?? shots[0]
if (!shot) return null
```

Then keep `chromeLabel` and `figcaption` using the narrowed `shot`.

- [ ] **Step 4: Fix scroll indicator defaults**

Use a safe initial section:

```tsx
const firstSection = sections[0] ?? { id: 'hero', index: '01', name: 'HOME' }
```

Then initialize state from `firstSection`.

When reading proportions:

```tsx
const prop = proportions[i] ?? 0
```

- [ ] **Step 5: Run checks**

Run:

```bash
npx tsc -p tsconfig.app.json --noEmit --pretty false
npm run lint
npm run build
```

Expected: all exit `0`.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.app.json src
git commit -m "Enable strict TypeScript checks"
```

---

### Task 4: Upgrade ESLint to Type-Aware Rules

**Files:**
- Modify: `eslint.config.js`
- Possibly modify: `src/**/*.ts`, `src/**/*.tsx`

- [ ] **Step 1: Configure parser project**

Update `eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: if new type-aware findings appear, fix them in the smallest local scope.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js src
git commit -m "Enable type-aware linting"
```

---

### Task 5: Add Minimal Unit Tests for Pure Logic

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/chapters/registry.test.ts`
- Create: `src/lib/scrollMath.ts`
- Create: `src/lib/scrollMath.test.ts`
- Modify: `src/components/ScrollIndicator.tsx`

- [ ] **Step 1: Install test dependency**

Run:

```bash
npm install -D vitest
```

- [ ] **Step 2: Add test scripts**

In `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Extract scroll fill math**

Create `src/lib/scrollMath.ts`:

```ts
export function segmentFillPercent(
  scrollPercent: number,
  proportions: readonly number[],
  index: number
): number {
  const prop = proportions[index] ?? 0
  if (prop <= 0) return 0

  const prevSum = proportions
    .slice(0, index)
    .reduce((sum, value) => sum + value, 0)

  const rawFill = ((scrollPercent - prevSum) / prop) * 100
  return Math.min(100, Math.max(0, rawFill))
}
```

- [ ] **Step 4: Use extracted function**

In `ScrollIndicator.tsx`, replace inline fill calculation with:

```tsx
const fill = segmentFillPercent(scrollPercent, proportions, i)
```

and import:

```tsx
import { segmentFillPercent } from '../lib/scrollMath'
```

- [ ] **Step 5: Test registry derivation**

Create `src/chapters/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { chapters, navChapters, progressChapters } from './registry'

describe('chapter registry', () => {
  it('keeps nav and progress chapters in document order', () => {
    expect(navChapters.map((chapter) => chapter.id)).toEqual([
      'hero',
      'about',
      'skills',
      'projects',
      'contact',
    ])

    expect(progressChapters.map((chapter) => chapter.id)).toEqual([
      'hero',
      'about',
      'skills',
      'projects',
      'contact',
    ])
  })

  it('keeps life as an interstitial outside nav and progress rail', () => {
    expect(chapters.map((chapter) => chapter.id)).toContain('life')
    expect(navChapters.map((chapter) => chapter.id)).not.toContain('life')
    expect(progressChapters.map((chapter) => chapter.id)).not.toContain('life')
  })
})
```

- [ ] **Step 6: Test scroll fill math**

Create `src/lib/scrollMath.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { segmentFillPercent } from './scrollMath'

describe('segmentFillPercent', () => {
  it('clamps before a segment starts', () => {
    expect(segmentFillPercent(0.1, [0.2, 0.3, 0.5], 1)).toBe(0)
  })

  it('calculates fill inside the active segment', () => {
    expect(segmentFillPercent(0.35, [0.2, 0.3, 0.5], 1)).toBeCloseTo(50)
  })

  it('clamps after a segment ends', () => {
    expect(segmentFillPercent(0.8, [0.2, 0.3, 0.5], 1)).toBe(100)
  })

  it('returns zero for invalid or zero-width segments', () => {
    expect(segmentFillPercent(0.5, [1], 3)).toBe(0)
    expect(segmentFillPercent(0.5, [0], 0)).toBe(0)
  })
})
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all exit `0`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src
git commit -m "Add portfolio registry and scroll math tests"
```

---

### Task 6: Unify Active Chapter State and Add Hash Deep Links

**Files:**
- Create: `src/hooks/useActiveChapter.ts`
- Create: `src/hooks/useChapterScroll.ts`
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/ScrollIndicator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create shared chapter scroll helper**

Create `src/hooks/useChapterScroll.ts`:

```ts
import { getLenis } from '../lib/lenis'

export function scrollToChapter(id: string, options: { updateHash?: boolean } = {}) {
  const el = document.getElementById(id)
  if (!el) return

  if (options.updateHash) {
    window.history.replaceState(null, '', `#${id}`)
  }

  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(el, { offset: -40, duration: 1.4 })
  } else {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
```

- [ ] **Step 2: Create shared active chapter hook**

Create `src/hooks/useActiveChapter.ts`:

```ts
import { useEffect, useState } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { navChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'

const firstId = navChapters[0]?.id ?? 'hero'

export function useActiveChapter() {
  const [active, setActive] = useState(firstId)

  useEffect(() => {
    const triggers: ScrollTrigger[] = []

    const cancel = onChaptersReady(() => {
      navChapters.forEach((chapter) => {
        triggers.push(
          ScrollTrigger.create({
            trigger: `#${chapter.id}`,
            start: 'top 50%',
            end: 'bottom 50%',
            onToggle: (self) => {
              if (self.isActive) {
                setActive(chapter.id)
                window.history.replaceState(null, '', `#${chapter.id}`)
              }
            },
          })
        )
      })
    })

    return () => {
      cancel()
      triggers.forEach((trigger) => trigger.kill())
    }
  }, [])

  return active
}
```

- [ ] **Step 3: Replace Nav IntersectionObserver**

In `Nav.tsx`, remove the local `IntersectionObserver` effect and use:

```tsx
const active = useActiveChapter()
```

For clicks:

```tsx
onClick={() => scrollToChapter(l.id, { updateHash: true })}
```

- [ ] **Step 4: Replace ScrollIndicator active section triggers**

In `ScrollIndicator.tsx`, remove the per-section `ScrollTrigger.create` block and derive:

```tsx
const activeId = useActiveChapter()
const activeSection = sections.find((section) => section.id === activeId) ?? firstSection
```

Keep the overall progress trigger.

- [ ] **Step 5: Support initial hash**

In `App.tsx`, after chapters are ready:

```tsx
useEffect(() => {
  const hash = window.location.hash.replace('#', '')
  if (!hash) return
  const t = window.setTimeout(() => scrollToChapter(hash), 250)
  return () => clearTimeout(t)
}, [])
```

- [ ] **Step 6: Run checks**

Run:

```bash
npm run test
npm run lint
npm run build
```

Browser checks:
- Open `/#projects`; page scrolls to Work after lazy chapters mount.
- Click nav sections; URL hash updates.
- Nav and scroll indicator agree on the active section.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Unify chapter active state and hash navigation"
```

---

### Task 7: Centralize Intro Timing

**Files:**
- Create: `src/lib/intro.ts`
- Modify: `src/components/Loader.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/ParticlePortrait.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add intro timing module**

Create `src/lib/intro.ts`:

```ts
export const INTRO_EXIT_EVENT = 'loader:exit'
export const INTRO_FALLBACK_MS = 2200

export function dispatchIntroExit() {
  window.dispatchEvent(new CustomEvent(INTRO_EXIT_EVENT))
}

export function onIntroExit(callback: () => void) {
  window.addEventListener(INTRO_EXIT_EVENT, callback, { once: true })
  const timer = window.setTimeout(callback, INTRO_FALLBACK_MS)

  return () => {
    window.removeEventListener(INTRO_EXIT_EVENT, callback)
    window.clearTimeout(timer)
  }
}
```

- [ ] **Step 2: Use module in Loader**

Replace:

```ts
window.dispatchEvent(new CustomEvent('loader:exit'))
```

with:

```ts
dispatchIntroExit()
```

- [ ] **Step 3: Use module in Hero and ParticlePortrait**

Replace duplicated event listeners and `2200` timers with:

```ts
return onIntroExit(() => {
  if (tl.paused()) tl.play()
})
```

For `ParticlePortrait`, set started in the callback.

- [ ] **Step 4: Use constant in App refresh**

Replace raw `'loader:exit'` string with `INTRO_EXIT_EVENT`.

- [ ] **Step 5: Run checks**

Run:

```bash
rg -n "loader:exit|2200" src
npm run lint
npm run build
```

Expected: event string only appears in `src/lib/intro.ts`; `2200` only appears as `INTRO_FALLBACK_MS`.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Centralize intro handoff timing"
```

---

### Task 8: SEO, Share, and Accessibility Pass

**Files:**
- Modify: `index.html`
- Modify: `src/components/ScrollIndicator.tsx`
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/About.tsx`
- Modify: `src/styles/global.css`
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Add: `public/og-image.jpg`

- [ ] **Step 1: Add SEO and share metadata**

Update `index.html` head:

```html
<title>Tim Cai | AI + Full-stack Developer Portfolio</title>
<meta name="description" content="Tim Cai is a Shanghai-based freshman developer building AI, full-stack, WebGL, and modeling projects." />
<meta name="keywords" content="Tim Cai, portfolio, AI developer, full-stack developer, WebGL, GSAP, modeling" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Tim Cai | Portfolio" />
<meta property="og:description" content="AI, full-stack, WebGL, and modeling projects by Tim Cai." />
<meta property="og:image" content="/og-image.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Tim Cai | Portfolio" />
<meta name="twitter:description" content="AI, full-stack, WebGL, and modeling projects by Tim Cai." />
<meta name="twitter:image" content="/og-image.jpg" />
```

- [ ] **Step 2: Add image preload**

Add:

```html
<link rel="preload" as="image" href="/portrait/tim.jpg" fetchpriority="high" />
```

- [ ] **Step 3: Add structured data**

Add a JSON-LD script:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Tim Cai",
  "url": "https://example.com",
  "sameAs": ["https://github.com/Timcai06"],
  "knowsAbout": ["AI", "Full-stack development", "WebGL", "Mathematical modeling"]
}
</script>
```

Replace `https://example.com` with the real deployment domain before release.

- [ ] **Step 4: Add focus-visible styles**

In `src/styles/global.css`:

```css
:where(a, button):focus-visible {
  outline: 2px solid var(--accent-warm);
  outline-offset: 4px;
}
```

- [ ] **Step 5: Fix scroll indicator semantics**

Choose one mode:

Interactive mode:
- Remove `aria-hidden="true"` from `.scroll-indicator`.
- Remove `tabIndex={-1}` from segment buttons.
- Add `aria-current={isActive ? 'true' : undefined}`.

Decorative mode:
- Keep `aria-hidden="true"`.
- Replace segment `button` elements with `span` elements.
- Remove click handlers.

Recommended: interactive mode on desktop, hidden entirely under `900px`.

- [ ] **Step 6: Improve portrait alt**

In `About.tsx`, replace:

```tsx
alt="Tim's Portrait"
```

with:

```tsx
alt="Portrait of Tim Cai"
```

- [ ] **Step 7: Add crawl files**

Create `public/robots.txt`:

```txt
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml
```

Create `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <priority>1.0</priority>
  </url>
</urlset>
```

Replace the domain before release.

- [ ] **Step 8: Run checks**

Run:

```bash
npm run lint
npm run build
```

Browser checks:
- Tab through nav, project links, thumbnails, and contact links.
- Check share preview after deployment.

- [ ] **Step 9: Commit**

```bash
git add index.html public src
git commit -m "Improve portfolio SEO and accessibility"
```

---

### Task 9: Rewrite README and Sync Drifted Docs

**Files:**
- Modify: `README.md`
- Modify: `docs/01-architecture/overview.md`
- Modify: `docs/01-architecture/tech-stack.md`
- Modify: `docs/05-projects/project-data.md`

- [ ] **Step 1: Replace template README**

Use this structure:

```md
# Tim Cai Portfolio

High-motion personal portfolio for Tim Cai, built as a React/Vite static site with GSAP, Lenis, and a WebGL particle portrait.

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

## Content Editing

- Projects: `src/data/projects.ts`
- Skills: `src/data/skills.ts`
- Life gallery: `src/data/life.ts`
- Chapter order: `src/chapters/registry.ts`

## Architecture Notes

- `src/chapters/registry.ts` is the source of truth for page order, nav entries, and scroll progress entries.
- Below-the-fold sections are lazy-loaded.
- GSAP and Lenis are integrated through `src/lib/gsap.ts` and `src/lib/lenis.ts`.
- WebGL portrait work lives in `src/components/ParticlePortrait.tsx`.

## Verification

```bash
npm run lint
npm run test
npm run build
```
```

- [ ] **Step 2: Fix dependency drift**

In `docs/01-architecture/tech-stack.md`, remove `@react-three/drei` unless it is actually reintroduced in `package.json`.

- [ ] **Step 3: Fix project-order drift**

Update `docs/05-projects/project-data.md` so its order and accent colors match `src/data/projects.ts`:

```txt
01 bdi
02 doc-for-agent
03 earnlytics
04 formula-lab
05 a-modeling
06 spm
```

- [ ] **Step 4: Update public asset docs**

In `docs/01-architecture/overview.md`, remove references to deleted `img1~9.jpg`, `profile.jpg`, and `server.glb` if Task 2 moved them out of `public`.

- [ ] **Step 5: Run checks**

Run:

```bash
npm run lint
npm run test
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add README.md docs
git commit -m "Document portfolio architecture and content workflow"
```

---

### Task 10: Mobile and Visual QA Pass

**Files:**
- Modify: `src/styles/components/nav.css`
- Modify: `src/styles/components/hero.css`
- Modify: `src/styles/components/projects.css`
- Modify: `src/styles/components/skills.css`
- Modify: `src/styles/components/life-gallery.css`
- Possibly modify: `src/components/Hero.tsx`

- [ ] **Step 1: Fix mobile hero height**

In `hero.css`, under `max-width: 768px`, add:

```css
.hero {
  min-height: 100svh;
  padding-bottom: 32px;
}
```

Verify that the hero no longer forces awkward extra height on small phones.

- [ ] **Step 2: Simplify mobile nav**

Option A, minimal:

```css
@media (max-width: 768px) {
  .nav__links {
    display: none;
  }

  .nav__counter {
    display: none;
  }
}
```

Option B, fuller:
- Add a compact menu button.
- Reveal a vertical panel with the same `links`.
- Keep hash navigation behavior.

Recommended for v1: Option A. The scroll indicator is already hidden under `900px`.

- [ ] **Step 3: Tighten mobile project cards**

In `projects.css`, under `max-width: 900px`, add:

```css
.projects__list {
  margin-top: 48px;
}

.project-card {
  padding: 48px 0;
}

.project-card__links {
  flex-wrap: wrap;
}

.media-frame__thumbs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] **Step 4: Reduce heavy life-gallery motion on mobile**

Under `max-width: 768px`, shorten the pinned section by changing the timeline end in `LifeGallery.tsx`:

```ts
end: () => '+=' + window.innerHeight * (window.innerWidth < 768 ? 6 : 10),
```

- [ ] **Step 5: Browser QA matrix**

Check these sizes:

```txt
1440 x 900
1280 x 720
390 x 844
375 x 667
```

For each:
- Hero renders without overlap.
- Nav does not wrap awkwardly.
- No horizontal scroll.
- Project card text and media fit.
- Contact buttons fit.
- Reduced motion mode does not show blank content.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components
git commit -m "Polish mobile portfolio layout"
```

---

### Task 11: Add CI for Release Confidence

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Verify locally**

Run:

```bash
npm run lint
npm run test
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add portfolio CI checks"
```

---

## Version Roadmap

### v1: Fast Stabilization

Deliverables:
- Page no longer black-screens.
- Public release payload is clean.
- README is real.
- Basic SEO/share tags exist.
- Mobile hero/nav are acceptable.

Exit criteria:
- `npm run lint`, `npm run build` pass.
- Browser console has no runtime errors.
- Manual desktop/mobile screenshots look coherent.

### v2: Professional Portfolio

Deliverables:
- Strict TypeScript and type-aware lint.
- Vitest coverage for registry and scroll math.
- Unified active-section state.
- Hash deep links.
- CI checks.
- More structured project content: role, stack, impact, live/readme links.

Exit criteria:
- `npm run lint`, `npm run test`, `npm run build` pass locally and in CI.
- `/#projects` and `/#contact` deep links work.
- Recruiter can understand role and impact of each project within 30 seconds.

### v3: Personal Brand Site

Deliverables:
- Optional multi-page or content-driven architecture.
- Writing/blog section.
- Bilingual content.
- Generated OG images.
- Resume PDF and project case-study pages.
- Performance budget and Lighthouse tracking.

Exit criteria:
- SEO/share previews are polished.
- Each major project has a case-study path.
- The site communicates both creative identity and professional capability.

## Self-Review

Spec coverage:
- Runtime crash: Task 1.
- Resource size: Task 2.
- Type and lint safety: Tasks 3 and 4.
- Tests and CI: Tasks 5 and 11.
- URL/deep link behavior: Task 6.
- Loader timing coupling: Task 7.
- SEO/accessibility: Task 8.
- README/docs drift: Task 9.
- Visual/mobile polish: Task 10.

Placeholder scan:
- No TBD/TODO placeholders remain.
- Domain placeholders are explicit `https://example.com` values to replace at release time.

Type consistency:
- `scrollToChapter`, `useActiveChapter`, and `segmentFillPercent` names are consistent across tasks.
- File paths match the current project layout.
