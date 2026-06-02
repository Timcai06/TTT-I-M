# Frame Horizontal Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Frame chapter as a desktop Lando Norris inspired pinned horizontal gallery using all 18 beautified building images, with mobile and reduced-motion vertical fallbacks.

**Architecture:** Keep the feature isolated to Frame. Extend the existing asset setup script to encode source PNGs into public WebP files, replace placeholder frame data with 18 building entries, then update `Frame.tsx` and `frame.css` to render a pinned horizontal track on desktop and a normal vertical editorial list elsewhere.

**Tech Stack:** React 19, TypeScript, Vite, GSAP ScrollTrigger, Lenis, Sharp, CSS Grid/Flexbox, WebP assets.

---

## File Structure

- Modify `scripts/setup-assets.mjs`: add `sources/beautified/buildings/*.png -> public/frame/buildings/*.webp` encoding with cache.
- Modify `src/data/frames.ts`: replace 6 placeholder `/life/*.webp` entries with 18 building frame entries and layout metadata.
- Modify `src/components/Frame.tsx`: render intro/callout/outro panels, image panels, desktop GSAP horizontal ScrollTrigger, and active index state.
- Modify `src/styles/components/frame.css`: implement desktop pinned horizontal viewport and mobile/reduced-motion vertical fallback.
- Verify existing `src/chapters/registry.ts`: no change expected; Frame is already registered in nav/progress.

---

### Task 1: Encode Building Frame Assets

**Files:**
- Modify: `scripts/setup-assets.mjs`
- Create by script output: `public/frame/buildings/01.webp` through `public/frame/buildings/18.webp`

- [ ] **Step 1: Add frame asset constants below the existing life-gallery constants**

In `scripts/setup-assets.mjs`, after:

```js
const cacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-life.json')
```

add:

```js
/* ── Frame gallery: beautified building PNGs → optimized WebP ── */
const frameBuildingsSrcDir = resolve(repoRoot, 'sources/beautified/buildings')
const frameBuildingsOutDir = resolve(projectRoot, 'public/frame/buildings')
const FRAME_BUILDING_MAX_EDGE = 1600
const FRAME_BUILDING_QUALITY = 82
const FRAME_BUILDING_SIG = `edge${FRAME_BUILDING_MAX_EDGE}-q${FRAME_BUILDING_QUALITY}`
const frameBuildingsCacheFile = resolve(projectRoot, 'node_modules/.cache/setup-assets-frame-buildings.json')
```

- [ ] **Step 2: Add a generic cache reader**

Replace the current `readCache()` function with:

```js
function readCache(file, sig) {
  try {
    const c = JSON.parse(readFileSync(file, 'utf8'))
    return c && c.sig === sig && c.files ? c : { sig, files: {} }
  } catch {
    return { sig, files: {} }
  }
}
```

Then change the life-gallery cache read from:

```js
const cache = readCache()
```

to:

```js
const cache = readCache(cacheFile, LIFE_SIG)
```

- [ ] **Step 3: Add frame building encoding block**

Append this block after the existing life-gallery block:

```js
if (existsSync(frameBuildingsSrcDir)) {
  const { default: sharp } = await import('sharp')
  mkdirSync(frameBuildingsOutDir, { recursive: true })

  const cache = readCache(frameBuildingsCacheFile, FRAME_BUILDING_SIG)
  const pngs = readdirSync(frameBuildingsSrcDir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  for (const file of pngs) {
    const src = resolve(frameBuildingsSrcDir, file)
    const out = resolve(frameBuildingsOutDir, `${basename(file, extname(file))}.webp`)
    const srcMtime = statSync(src).mtimeMs

    const fresh = existsSync(out) && cache.files[file] === srcMtime
    if (fresh) continue

    await sharp(src)
      .resize({ width: FRAME_BUILDING_MAX_EDGE, height: FRAME_BUILDING_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: FRAME_BUILDING_QUALITY, effort: 5 })
      .toFile(out)
    cache.files[file] = srcMtime
    console.log(`[setup-assets] sources/beautified/buildings/${file} → public/frame/buildings/${basename(out)} (${FRAME_BUILDING_SIG})`)
  }

  mkdirSync(dirname(frameBuildingsCacheFile), { recursive: true })
  writeFileSync(frameBuildingsCacheFile, JSON.stringify(cache, null, 2))
} else {
  console.warn('[setup-assets] No sources/beautified/buildings dir. Frame building WebP not generated.')
}
```

- [ ] **Step 4: Run setup and verify outputs**

Run:

```bash
npm run setup
find public/frame/buildings -maxdepth 1 -type f -name '*.webp' | sort
```

Expected:

```txt
public/frame/buildings/01.webp
public/frame/buildings/02.webp
...
public/frame/buildings/18.webp
```

- [ ] **Step 5: Commit asset pipeline**

```bash
git add scripts/setup-assets.mjs public/frame/buildings
git commit -m "Add frame building asset pipeline"
```

---

### Task 2: Replace Frame Placeholder Data With 18 Building Entries

**Files:**
- Modify: `src/data/frames.ts`

- [ ] **Step 1: Replace the Frame interface and data**

Replace all contents of `src/data/frames.ts` with:

```ts
export type FrameOrientation = 'portrait' | 'landscape' | 'tall'
export type FrameLayout = 'intro' | 'image' | 'callout' | 'outro'

export interface Frame {
  src: string
  title: string
  location: string
  meta: string
  orientation: FrameOrientation
  tone: string
}

export interface FramePanel {
  layout: FrameLayout
  eyebrow?: string
  title?: string
  body?: string
  frame?: Frame
}

export const buildingFrames: Frame[] = [
  { src: '/frame/buildings/01.webp', title: 'Shadow Wall', location: 'Shanghai · Old Facade', meta: 'Warm side light · tree silhouette', orientation: 'portrait', tone: 'old-wall' },
  { src: '/frame/buildings/02.webp', title: 'Night Blocks', location: 'Shanghai · Residential Skyline', meta: 'Blue hour · rail light', orientation: 'landscape', tone: 'night-city' },
  { src: '/frame/buildings/03.webp', title: 'Green Doorway', location: 'Shanghai · Historic Entrance', meta: 'Wood facade · afternoon green', orientation: 'portrait', tone: 'heritage' },
  { src: '/frame/buildings/04.webp', title: 'Raking Stone', location: 'Shanghai · Wall Detail', meta: 'Texture study · warm shadow', orientation: 'portrait', tone: 'detail' },
  { src: '/frame/buildings/05.webp', title: 'Brick Stair', location: 'Shanghai · Interior Passage', meta: 'Museum light · brick and steel', orientation: 'landscape', tone: 'interior' },
  { src: '/frame/buildings/06.webp', title: 'Narrow Alley', location: 'Shanghai · Stair Corridor', meta: 'Lamp glow · compressed depth', orientation: 'landscape', tone: 'alley' },
  { src: '/frame/buildings/07.webp', title: 'Gold Riverfront', location: 'Shanghai · Bund', meta: 'Night skyline · controlled glow', orientation: 'landscape', tone: 'skyline' },
  { src: '/frame/buildings/08.webp', title: 'Lantern Facade', location: 'Shanghai · Old Wall', meta: 'Vertical detail · warm lantern', orientation: 'tall', tone: 'detail' },
  { src: '/frame/buildings/09.webp', title: 'Framed Skyline', location: 'Shanghai · Window View', meta: 'Dusk storm light · city grid', orientation: 'landscape', tone: 'skyline' },
  { src: '/frame/buildings/10.webp', title: 'Afterglow Blocks', location: 'Shanghai · Sunset', meta: 'Orange horizon · high-rise silhouettes', orientation: 'landscape', tone: 'sunset' },
  { src: '/frame/buildings/11.webp', title: 'Weathered Geometry', location: 'Shanghai · Wall Study', meta: 'Aged plaster · pipe lines', orientation: 'landscape', tone: 'detail' },
  { src: '/frame/buildings/12.webp', title: 'Lit Descent', location: 'Shanghai · Stairwell', meta: 'Gallery light · beige concrete', orientation: 'landscape', tone: 'stair' },
  { src: '/frame/buildings/13.webp', title: 'Arches At Night', location: 'Shanghai · Courtyard', meta: 'Warm facade · evening crowd', orientation: 'landscape', tone: 'night-city' },
  { src: '/frame/buildings/14.webp', title: 'Rooftop Neon', location: 'Shanghai · Night Roof', meta: 'Skyline color · plant foreground', orientation: 'landscape', tone: 'night-city' },
  { src: '/frame/buildings/15.webp', title: 'Table Light', location: 'Shanghai · Interior', meta: 'Soft glass · lifestyle detail', orientation: 'portrait', tone: 'interior' },
  { src: '/frame/buildings/16.webp', title: 'Concrete Quiet', location: 'Shanghai · Minimal Interior', meta: 'Neutral tone · open floor', orientation: 'landscape', tone: 'minimal' },
  { src: '/frame/buildings/17.webp', title: 'Urban Machinery', location: 'Shanghai · Rooftop Structure', meta: 'Late-day light · industrial edge', orientation: 'landscape', tone: 'industrial' },
  { src: '/frame/buildings/18.webp', title: 'Night Crossing', location: 'Shanghai · Street Canopy', meta: 'Traffic glow · tree shadow', orientation: 'portrait', tone: 'street' },
]

export const framePanels: FramePanel[] = [
  {
    layout: 'intro',
    eyebrow: 'Frame · Architecture',
    title: 'Frames of structure.',
    body: 'Light, stairs, facades, and the quiet geometry of the city.',
  },
  ...buildingFrames.slice(0, 6).map((frame) => ({ layout: 'image' as const, frame })),
  {
    layout: 'callout',
    eyebrow: 'Light Study',
    title: 'The city becomes readable when light touches an edge.',
    body: 'I photograph buildings as systems: rhythm, contrast, texture, and the traces people leave behind.',
  },
  ...buildingFrames.slice(6, 12).map((frame) => ({ layout: 'image' as const, frame })),
  {
    layout: 'callout',
    eyebrow: 'Urban Archive',
    title: 'Not landmarks. Coordinates of attention.',
    body: 'A wall, a stair, a night crossing: each frame is a small proof that design lives outside the screen too.',
  },
  ...buildingFrames.slice(12).map((frame) => ({ layout: 'image' as const, frame })),
  {
    layout: 'outro',
    eyebrow: 'Next',
    title: 'Back to building systems.',
    body: 'After the visual archive, the page returns to stack, tools, and shipped projects.',
  },
]
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: `tsc` exits 0.

- [ ] **Step 3: Commit frame data**

```bash
git add src/data/frames.ts
git commit -m "Add building frame gallery data"
```

---

### Task 3: Render Horizontal Frame Panels

**Files:**
- Modify: `src/components/Frame.tsx`

- [ ] **Step 1: Replace Frame component imports**

Change imports to:

```ts
import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { framePanels } from '../data/frames'
```

- [ ] **Step 2: Replace the component body**

Replace the `Frame` component with:

```tsx
export default function Frame() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const imageCount = useMemo(
    () => framePanels.filter((panel) => panel.layout === 'image').length,
    []
  )

  useEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    if (!rootEl || !trackEl) return

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.frame-horizontal__title .split-line__inner',
        { yPercent: 110, skewY: 6 },
        {
          yPercent: 0,
          skewY: 0,
          duration: 1.4,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: rootEl, start: 'top 78%' },
        }
      )

      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const tween = gsap.to(trackEl, {
          x: () => -(trackEl.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: rootEl,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${Math.max(1, trackEl.scrollWidth - window.innerWidth)}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: () => {
              const panels = Array.from(trackEl.querySelectorAll<HTMLElement>('.frame-panel--image'))
              const center = window.innerWidth / 2
              let next = 0
              let closest = Number.POSITIVE_INFINITY
              panels.forEach((panel, index) => {
                const rect = panel.getBoundingClientRect()
                const distance = Math.abs(rect.left + rect.width / 2 - center)
                if (distance < closest) {
                  closest = distance
                  next = index
                }
              })
              setActive((prev) => (prev === next ? prev : next))
            },
          },
        })

        return () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
      })

      gsap.utils.toArray<HTMLImageElement>('.frame-panel img').forEach((img) => {
        if (img.complete) return
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
      })
    }, rootEl)

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [])

  const current = framePanels.filter((panel) => panel.layout === 'image')[active]?.frame

  return (
    <section className="frame-horizontal" id="frame" ref={root} data-horizontal-section>
      <div className="frame-horizontal__pin">
        <aside className="frame-horizontal__rail" aria-label="Frame gallery progress">
          <span className="frame-horizontal__rail-kicker">Frame</span>
          <span className="frame-horizontal__rail-title">Architecture</span>
          <span className="frame-horizontal__rail-count">
            {String(active + 1).padStart(2, '0')} / {String(imageCount).padStart(2, '0')}
          </span>
          {current && <span className="frame-horizontal__rail-current">{current.title}</span>}
        </aside>

        <div className="frame-horizontal__track" ref={track} data-horizontal-track>
          {framePanels.map((panel, index) => {
            if (panel.layout === 'intro' || panel.layout === 'callout' || panel.layout === 'outro') {
              return (
                <article className={`frame-panel frame-panel--${panel.layout}`} key={`${panel.layout}-${index}`}>
                  {panel.eyebrow && <p className="frame-panel__eyebrow">{panel.eyebrow}</p>}
                  {panel.title && (
                    <h2 className="section__title frame-horizontal__title">
                      <span className="split-line"><span className="split-line__inner">{panel.title}</span></span>
                    </h2>
                  )}
                  {panel.body && <p className="frame-panel__body">{panel.body}</p>}
                </article>
              )
            }

            const frame = panel.frame
            if (!frame) return null

            return (
              <figure
                className={`frame-panel frame-panel--image frame-panel--${frame.orientation}`}
                key={frame.src}
                data-tone={frame.tone}
                data-cursor="hover"
              >
                <div className="frame-panel__media">
                  <img src={frame.src} alt={frame.title} loading="lazy" decoding="async" />
                </div>
                <figcaption className="frame-panel__caption">
                  <span className="frame-panel__caption-title">{frame.title}</span>
                  <span>{frame.location}</span>
                  <span>{frame.meta}</span>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run typecheck and lint**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both exit 0.

- [ ] **Step 4: Commit component markup and motion**

```bash
git add src/components/Frame.tsx
git commit -m "Build frame horizontal gallery component"
```

---

### Task 4: Add Horizontal Gallery Styles

**Files:**
- Modify: `src/styles/components/frame.css`

- [ ] **Step 1: Replace frame stylesheet**

Replace all contents of `src/styles/components/frame.css` with:

```css
/* ── Frame — pinned architecture gallery ── */
.frame-horizontal {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  border-top: 1px solid var(--line);
  overflow: hidden;
}

.frame-horizontal__pin {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.frame-horizontal__rail {
  position: absolute;
  z-index: 4;
  left: clamp(20px, 3vw, 48px);
  top: clamp(84px, 10vh, 120px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(220px, 32vw);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--fg-mute);
  pointer-events: none;
  mix-blend-mode: difference;
}

.frame-horizontal__rail-title,
.frame-horizontal__rail-count {
  color: var(--fg);
}

.frame-horizontal__rail-current {
  margin-top: 12px;
  color: var(--fg-soft);
  line-height: 1.5;
}

.frame-horizontal__track {
  height: 100vh;
  display: flex;
  align-items: center;
  gap: clamp(24px, 4vw, 72px);
  padding-left: clamp(280px, 34vw, 520px);
  padding-right: clamp(80px, 12vw, 180px);
  will-change: transform;
}

.frame-panel {
  position: relative;
  flex: 0 0 auto;
}

.frame-panel--intro,
.frame-panel--callout,
.frame-panel--outro {
  width: min(620px, 72vw);
}

.frame-panel--callout {
  padding-inline: clamp(24px, 4vw, 56px);
}

.frame-panel__eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fg-mute);
  margin: 0 0 28px;
}

.frame-panel__body {
  max-width: 520px;
  margin: clamp(28px, 4vw, 44px) 0 0;
  font-family: var(--font-serif);
  font-size: clamp(18px, 2.3vw, 28px);
  line-height: 1.65;
  color: var(--fg-soft);
}

.frame-panel--image {
  width: clamp(320px, 42vw, 760px);
}

.frame-panel--portrait {
  width: clamp(280px, 30vw, 460px);
}

.frame-panel--tall {
  width: clamp(240px, 24vw, 360px);
}

.frame-panel__media {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: #0c0c0e;
  box-shadow: 0 32px 80px -56px rgba(0, 0, 0, 0.85);
}

.frame-panel--landscape .frame-panel__media {
  aspect-ratio: 4 / 3;
}

.frame-panel--portrait .frame-panel__media {
  aspect-ratio: 3 / 4;
}

.frame-panel--tall .frame-panel__media {
  aspect-ratio: 9 / 16;
}

.frame-panel__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.03);
  filter: saturate(0.9) contrast(1.04);
  transition: transform 1.2s var(--ease-out), filter 0.8s var(--ease-out);
}

.frame-panel:hover .frame-panel__media img {
  transform: scale(1);
  filter: saturate(1) contrast(1.02);
}

.frame-panel__caption {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--fg-dim);
  text-transform: uppercase;
}

.frame-panel__caption-title {
  font-family: var(--font-serif);
  font-size: clamp(16px, 1.5vw, 22px);
  letter-spacing: 0;
  text-transform: none;
  color: var(--fg);
}

@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  .frame-horizontal {
    overflow: visible;
    padding-block: clamp(100px, 16vw, 180px);
  }

  .frame-horizontal__pin {
    min-height: auto;
    overflow: visible;
  }

  .frame-horizontal__rail {
    position: relative;
    left: auto;
    top: auto;
    width: calc(100% - 32px);
    margin: 0 auto clamp(32px, 8vw, 56px);
    mix-blend-mode: normal;
  }

  .frame-horizontal__track {
    height: auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(32px, 8vw, 56px);
    padding-inline: 16px;
    width: min(680px, 100%);
    margin-inline: auto;
    transform: none !important;
  }

  .frame-panel,
  .frame-panel--intro,
  .frame-panel--callout,
  .frame-panel--outro,
  .frame-panel--image,
  .frame-panel--portrait,
  .frame-panel--tall {
    width: 100%;
  }

  .frame-panel--callout {
    padding-inline: 0;
  }
}
```

- [ ] **Step 2: Run style sanity checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both exit 0. Build may keep the known `three-vendor` size warning.

- [ ] **Step 3: Commit styles**

```bash
git add src/styles/components/frame.css
git commit -m "Style frame horizontal gallery"
```

---

### Task 5: Browser Verification And Bug Fix Pass

**Files:**
- Modify as needed only if verification finds issues:
  - `src/components/Frame.tsx`
  - `src/styles/components/frame.css`
  - `src/data/frames.ts`
  - `scripts/setup-assets.mjs`

- [ ] **Step 1: Run full local checks**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected:

- `typecheck`: exit 0
- `lint`: exit 0
- `build`: exit 0
- Build may warn that `three-vendor` is larger than 500 kB.

- [ ] **Step 2: Start dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5187
```

Expected:

```txt
Local: http://127.0.0.1:5187/
```

- [ ] **Step 3: Verify desktop Frame**

Open:

```txt
http://127.0.0.1:5187/#frame
```

Check:

- `#frame` renders.
- The section pins on desktop.
- Scrolling vertically moves the track horizontally.
- All 18 images are reachable.
- No native horizontal scrollbar appears.
- The section releases into `#skills`.
- Nav and side scroll indicator remain usable.

- [ ] **Step 4: Verify mobile fallback**

Set viewport to roughly `390x844`.

Check:

- `#frame` is a vertical list.
- No sideways drag gap.
- No pinned horizontal track.
- Captions remain readable.
- Images do not overlap.

- [ ] **Step 5: Verify reduced-motion fallback**

Emulate `prefers-reduced-motion: reduce` if available.

Check:

- No pinned horizontal movement.
- Content remains visible as normal document flow.
- Text and images remain readable.

- [ ] **Step 6: Fix observed issues and re-run checks**

For a blank pinned section:

```ts
ScrollTrigger.refresh()
```

must run after image load and after lazy sections mount.

For horizontal overflow on mobile:

```css
.frame-horizontal__track {
  transform: none !important;
  width: min(680px, 100%);
}
```

must be active under the mobile media query.

For jittery desktop pinning:

```ts
anticipatePin: 1,
invalidateOnRefresh: true,
```

must remain in the desktop ScrollTrigger.

After any fix, run:

```bash
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 7: Commit verification fixes**

If changes were required:

```bash
git add src/components/Frame.tsx src/styles/components/frame.css src/data/frames.ts scripts/setup-assets.mjs
git commit -m "Harden frame gallery responsive behavior"
```

If no changes were required, do not create an empty commit.

---

### Task 6: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/01-architecture/overview.md`

- [ ] **Step 1: Update README asset note**

In `README.md`, add this bullet under the assets/content editing section:

```md
- Frame architecture photos are sourced from `../sources/beautified/buildings` and generated into `public/frame/buildings` by `npm run setup`.
```

- [ ] **Step 2: Update architecture overview public assets tree**

In `docs/01-architecture/overview.md`, add:

```md
│   └── frame/
│       └── buildings/       # Optimized Frame gallery WebP images
```

under the `public/` tree.

- [ ] **Step 3: Run final checks**

Run:

```bash
npm run typecheck
npm run lint
npm run build
git status --short
```

Expected:

- typecheck/lint/build exit 0
- only intended documentation files remain modified before commit

- [ ] **Step 4: Commit docs**

```bash
git add README.md docs/01-architecture/overview.md
git commit -m "Document frame gallery asset workflow"
```

---

## Plan Self-Review

- Spec coverage: tasks cover all 18 images, asset encoding, desktop pinned horizontal gallery, mobile fallback, reduced-motion fallback, verification, and docs.
- Placeholder scan: no TBD/TODO/fill-later instructions are present.
- Type consistency: `Frame`, `FramePanel`, `FrameOrientation`, `FrameLayout`, `buildingFrames`, and `framePanels` are defined before use.
- Risk note: the existing worktree has unrelated uncommitted user changes; implementation must stage only files touched by each task.
