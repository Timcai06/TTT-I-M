# Frame Independent Theme Rails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Frame into three independent Building, Cuisine, and Scenery horizontal parts while restoring Building's four user-defined groups and keeping every image inside the viewport.

**Architecture:** Keep the existing `Frame.tsx`, `frames.ts`, and `frame.css` boundaries, but change the data and render model from one global archive track to one pinned track per theme. Each theme section owns its progress rail, active cluster tracking, scroll distance, and optional direction tween.

**Tech Stack:** React 19, TypeScript, Vite, GSAP ScrollTrigger, Lenis, CSS Grid, WebP images.

---

## File Structure

- Modify `src/data/frames.ts`: remove global `archivePanels`, restore Building to four grouped clusters, and keep theme-first archive data.
- Modify `src/components/Frame.tsx`: replace the single track with `ArchiveThemeSection` instances, each with its own track ref and ScrollTrigger.
- Modify `src/styles/components/frame.css`: style independent sections, constrained mosaics, mobile fallback, and viewport-safe image sizing.
- Modify `README.md` and `docs/01-architecture/overview.md`: update Frame notes from one archive rail to independent theme rails.

---

### Task 1: Commit Design And Plan Documents

**Files:**
- Create: `docs/superpowers/specs/2026-06-02-frame-independent-theme-rails-design.md`
- Create: `docs/superpowers/plans/2026-06-02-frame-independent-theme-rails.md`

- [ ] **Step 1: Review staged document diff**

Run:

```bash
git diff -- docs/superpowers/specs/2026-06-02-frame-independent-theme-rails-design.md docs/superpowers/plans/2026-06-02-frame-independent-theme-rails.md
```

Expected: The spec and plan describe independent theme rails, Building's four groups, viewport-safe images, and first-scroll performance.

- [ ] **Step 2: Commit the documents**

Run:

```bash
git add docs/superpowers/specs/2026-06-02-frame-independent-theme-rails-design.md docs/superpowers/plans/2026-06-02-frame-independent-theme-rails.md
git commit -m "Plan independent frame theme rails"
```

---

### Task 2: Restore Theme-First Frame Data

**Files:**
- Modify: `src/data/frames.ts`

- [ ] **Step 1: Replace global panel data with theme-first data**

Update `src/data/frames.ts` so it exports:

```ts
export type ArchiveThemeId = 'building' | 'cuisine' | 'scenery'
export type ArchiveDirection = 'left-to-right' | 'right-to-left'
export type ArchiveClusterLayout = 'feature-left' | 'feature-right' | 'stack-left' | 'stack-right' | 'panorama' | 'mosaic-left' | 'mosaic-right'
export type ArchiveSlotRole = 'primary' | 'secondary' | 'detail' | 'support'
export type ArchiveOrientation = 'portrait' | 'landscape' | 'square' | 'wide' | 'tall'

export interface ArchiveImage {
  id: number
  src: string
  title: string
  location: string
  meta: string
  orientation: ArchiveOrientation
  tone: string
}

export interface ArchiveClusterSlot {
  role: ArchiveSlotRole
  image: ArchiveImage
}

export interface ArchiveCluster {
  id: string
  title: string
  layout: ArchiveClusterLayout
  slots: ArchiveClusterSlot[]
}

export interface ArchiveTheme {
  id: ArchiveThemeId
  eyebrow: string
  title: string
  body: string
  direction: ArchiveDirection
  clusters: ArchiveCluster[]
}
```

- [ ] **Step 2: Use Building's four required groups**

Set Building clusters exactly as:

```ts
[
  { id: 'building-surface-memory', title: 'Surface Memory', imageIds: [1, 3, 4, 8, 11] },
  { id: 'building-skyline-weather', title: 'Skyline Weather', imageIds: [2, 9, 10] },
  { id: 'building-interior-routes', title: 'Interior Routes', imageIds: [5, 6, 12, 13, 16] },
  { id: 'building-night-current', title: 'Night Current', imageIds: [7, 14, 15, 17, 18] },
]
```

Expected: no Building image is missing or duplicated.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: It may fail until `Frame.tsx` is updated in Task 3.

---

### Task 3: Render Three Independent Theme Sections

**Files:**
- Modify: `src/components/Frame.tsx`

- [ ] **Step 1: Replace single global track with theme sections**

Implement these components in `Frame.tsx`:

```ts
function ArchiveThemeSection({ theme, themeIndex }: { theme: ArchiveTheme; themeIndex: number }) {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [activeCluster, setActiveCluster] = useState(0)
  // Own GSAP matchMedia, own ScrollTrigger, own updateActiveCluster.
}
```

Expected DOM shape:

```html
<section id="frame" class="frame-horizontal">
  <article class="archive-frame-intro">...</article>
  <section class="archive-theme-section archive-theme-section--building">...</section>
  <section class="archive-theme-section archive-theme-section--cuisine">...</section>
  <section class="archive-theme-section archive-theme-section--scenery">...</section>
  <article class="archive-frame-outro">...</article>
</section>
```

- [ ] **Step 2: Scope ScrollTrigger to each theme section**

Each theme section uses:

```ts
const scrollDistance = () => Math.max(1, trackEl.scrollWidth - window.innerWidth)
gsap.to(trackEl, {
  x: () => theme.direction === 'left-to-right' ? scrollDistance() : -scrollDistance(),
  ease: 'none',
  scrollTrigger: {
    trigger: sectionEl,
    pin: true,
    scrub: 1,
    start: 'top top',
    end: () => `+=${scrollDistance()}`,
    invalidateOnRefresh: true,
    anticipatePin: 1,
    onUpdate: updateActiveCluster,
    onRefresh: updateActiveCluster,
  },
})
```

Expected: Building, Cuisine, and Scenery are no longer on one shared horizontal x-axis.

- [ ] **Step 3: Debounce image-triggered refresh**

Use one shared helper inside the effect:

```ts
let refreshFrame = 0
const scheduleRefresh = () => {
  window.cancelAnimationFrame(refreshFrame)
  refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
}
```

Expected: image loads no longer cause many immediate refresh calls during first scroll.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit data and component changes**

Run:

```bash
git add src/data/frames.ts src/components/Frame.tsx
git commit -m "Split frame archive into independent theme rails"
```

---

### Task 4: Add Viewport-Safe Cluster Layout CSS

**Files:**
- Modify: `src/styles/components/frame.css`

- [ ] **Step 1: Style independent theme sections**

Add CSS for:

```css
.archive-theme-section {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.archive-theme-section__pin {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.archive-theme-section__track {
  height: 100vh;
  display: flex;
  align-items: center;
  gap: clamp(32px, 5vw, 88px);
  padding-left: clamp(260px, 31vw, 480px);
  padding-right: clamp(120px, 16vw, 240px);
  will-change: transform;
}
```

- [ ] **Step 2: Cap every cluster within viewport**

Use bounded dimensions:

```css
.archive-cluster {
  width: clamp(620px, 66vw, 1080px);
  height: min(72vh, 660px);
  max-height: calc(100vh - 150px);
  display: grid;
}

.archive-slot {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}

.archive-slot__media {
  min-height: 0;
  max-height: 100%;
}
```

Expected: media plus caption stays inside the cluster and cluster stays inside viewport.

- [ ] **Step 3: Add mosaic classes for five-image Building groups**

Implement `.archive-cluster--mosaic-left` and `.archive-cluster--mosaic-right` as one large slot plus four smaller slots, with all rows bounded by the cluster height.

- [ ] **Step 4: Keep mobile fallback vertical**

At `max-width: 768px` and `prefers-reduced-motion: reduce`, set theme sections, tracks, and clusters to normal vertical grid with `height: auto` and `transform: none !important`.

- [ ] **Step 5: Run verification**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit CSS**

Run:

```bash
git add src/styles/components/frame.css
git commit -m "Constrain independent frame theme layouts"
```

---

### Task 5: Verify Runtime Layout And Document Workflow

**Files:**
- Modify: `README.md`
- Modify: `docs/01-architecture/overview.md`

- [ ] **Step 1: Run Playwright layout check**

Run a browser check against `http://127.0.0.1:5187/#frame` that asserts:

```txt
themeSectionCount = 3
buildingClusterCount = 4
cuisineClusterCount = 7
sceneryClusterCount = 4
desktopHorizontalOverflow = 0
mobileHorizontalOverflow = 0
visibleMediaOutOfViewportCount = 0
```

- [ ] **Step 2: Update docs**

Update docs to say Frame uses independent Building, Cuisine, and Scenery theme rails, and Building uses the four user-defined groups.

- [ ] **Step 3: Final verification**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add README.md docs/01-architecture/overview.md
git commit -m "Document independent frame theme rails"
```
