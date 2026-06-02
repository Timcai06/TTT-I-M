# Frame Chapter Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Frame section into a four-chapter pinned horizontal editorial gallery with compact chapter text and varied image rhythm.

**Architecture:** Keep the existing `Frame` section, GSAP ScrollTrigger pinning, generated WebP assets, and mobile fallback. Convert the flat `framePanels` data into chapter-driven configuration, derive render panels from that data, and use CSS classes for scale, vertical alignment, and pacing.

**Tech Stack:** React 19, TypeScript, Vite, GSAP ScrollTrigger, Lenis, CSS Flex/Grid, WebP assets.

---

## File Structure

- Modify `src/data/frames.ts`: replace flat panel data with `frameChapters`, image rhythm metadata, and derived `framePanels`.
- Modify `src/components/Frame.tsx`: render intro, chapter panels, image panels, and outro from the new data; update active chapter/image state.
- Modify `src/styles/components/frame.css`: add compact chapter text, image scale classes, vertical alignment, and spacing rhythm.
- Modify `README.md`: document that Frame data is chapter-driven.
- Modify `docs/01-architecture/overview.md`: document Frame data and chapter gallery responsibility.

No asset pipeline changes are required in this pass.

---

### Task 1: Convert Frame Data To Four Chapters

**Files:**
- Modify: `src/data/frames.ts`

- [ ] **Step 1: Replace `src/data/frames.ts` with chapter-driven data**

Replace the whole file with:

```ts
export type FrameOrientation = 'portrait' | 'landscape' | 'tall'
export type FrameScale = 'hero' | 'large' | 'medium' | 'small'
export type FrameAlign = 'top' | 'center' | 'bottom'
export type FramePace = 'tight' | 'normal' | 'wide'
export type FramePanelLayout = 'intro' | 'chapter' | 'image' | 'outro'

export interface FrameImage {
  id: number
  src: string
  title: string
  location: string
  meta: string
  orientation: FrameOrientation
  tone: string
  scale: FrameScale
  align: FrameAlign
  pace: FramePace
}

export interface FrameChapter {
  id: string
  eyebrow: string
  title: string
  body: string
  images: FrameImage[]
}

export interface FramePanel {
  layout: FramePanelLayout
  chapter?: FrameChapter
  image?: FrameImage
  eyebrow?: string
  title?: string
  body?: string
}

export const frameIntro: FramePanel = {
  layout: 'intro',
  eyebrow: 'Frame / Architecture',
  title: 'Frames of structure.',
  body: 'Light, stairs, facades, and the quiet geometry of the city.',
}

export const frameChapters: FrameChapter[] = [
  {
    id: 'surface-memory',
    eyebrow: '01 / Surface Memory',
    title: 'Walls remember where the light has been.',
    body: 'Old facades, doors, lanterns, and worn surfaces become the first scale of the city.',
    images: [
      { id: 1, src: '/frame/buildings/01.webp', title: 'Shadow Wall', location: 'Shanghai / Old Facade', meta: 'Warm side light / tree silhouette', orientation: 'portrait', tone: 'old-wall', scale: 'large', align: 'bottom', pace: 'normal' },
      { id: 3, src: '/frame/buildings/03.webp', title: 'Green Doorway', location: 'Shanghai / Historic Entrance', meta: 'Wood facade / afternoon green', orientation: 'portrait', tone: 'heritage', scale: 'medium', align: 'top', pace: 'tight' },
      { id: 4, src: '/frame/buildings/04.webp', title: 'Raking Stone', location: 'Shanghai / Wall Detail', meta: 'Texture study / warm shadow', orientation: 'portrait', tone: 'detail', scale: 'small', align: 'center', pace: 'tight' },
      { id: 8, src: '/frame/buildings/08.webp', title: 'Lantern Facade', location: 'Shanghai / Old Wall', meta: 'Vertical detail / warm lantern', orientation: 'tall', tone: 'detail', scale: 'medium', align: 'bottom', pace: 'normal' },
      { id: 11, src: '/frame/buildings/11.webp', title: 'Weathered Geometry', location: 'Shanghai / Wall Study', meta: 'Aged plaster / pipe lines', orientation: 'landscape', tone: 'detail', scale: 'large', align: 'center', pace: 'wide' },
    ],
  },
  {
    id: 'skyline-weather',
    eyebrow: '02 / Skyline Weather',
    title: 'The city opens when distance enters the frame.',
    body: 'Windows, dusk, and skyline weather pull the sequence from wall scale into urban scale.',
    images: [
      { id: 2, src: '/frame/buildings/02.webp', title: 'Night Blocks', location: 'Shanghai / Residential Skyline', meta: 'Blue hour / rail light', orientation: 'landscape', tone: 'night-city', scale: 'hero', align: 'center', pace: 'wide' },
      { id: 9, src: '/frame/buildings/09.webp', title: 'Framed Skyline', location: 'Shanghai / Window View', meta: 'Dusk storm light / city grid', orientation: 'landscape', tone: 'skyline', scale: 'medium', align: 'top', pace: 'normal' },
      { id: 10, src: '/frame/buildings/10.webp', title: 'Afterglow Blocks', location: 'Shanghai / Sunset', meta: 'Orange horizon / high-rise silhouettes', orientation: 'landscape', tone: 'sunset', scale: 'large', align: 'bottom', pace: 'wide' },
    ],
  },
  {
    id: 'interior-routes',
    eyebrow: '03 / Interior Routes',
    title: 'Architecture becomes movement inside the building.',
    body: 'Stairs, corridors, arches, and quiet rooms turn the gallery into a walk through space.',
    images: [
      { id: 5, src: '/frame/buildings/05.webp', title: 'Brick Stair', location: 'Shanghai / Interior Passage', meta: 'Museum light / brick and steel', orientation: 'landscape', tone: 'interior', scale: 'medium', align: 'center', pace: 'normal' },
      { id: 6, src: '/frame/buildings/06.webp', title: 'Narrow Alley', location: 'Shanghai / Stair Corridor', meta: 'Lamp glow / compressed depth', orientation: 'landscape', tone: 'alley', scale: 'large', align: 'top', pace: 'tight' },
      { id: 12, src: '/frame/buildings/12.webp', title: 'Lit Descent', location: 'Shanghai / Stairwell', meta: 'Gallery light / beige concrete', orientation: 'landscape', tone: 'stair', scale: 'medium', align: 'bottom', pace: 'normal' },
      { id: 13, src: '/frame/buildings/13.webp', title: 'Arches At Night', location: 'Shanghai / Courtyard', meta: 'Warm facade / evening crowd', orientation: 'landscape', tone: 'night-city', scale: 'hero', align: 'center', pace: 'wide' },
      { id: 16, src: '/frame/buildings/16.webp', title: 'Concrete Quiet', location: 'Shanghai / Minimal Interior', meta: 'Neutral tone / open floor', orientation: 'landscape', tone: 'minimal', scale: 'small', align: 'bottom', pace: 'wide' },
    ],
  },
  {
    id: 'night-current',
    eyebrow: '04 / Night Current',
    title: 'Night turns structure into current.',
    body: 'Rooftops, table light, machinery, traffic, and riverfront glow close the archive with motion.',
    images: [
      { id: 7, src: '/frame/buildings/07.webp', title: 'Gold Riverfront', location: 'Shanghai / Bund', meta: 'Night skyline / controlled glow', orientation: 'landscape', tone: 'skyline', scale: 'hero', align: 'center', pace: 'wide' },
      { id: 14, src: '/frame/buildings/14.webp', title: 'Rooftop Neon', location: 'Shanghai / Night Roof', meta: 'Skyline color / plant foreground', orientation: 'landscape', tone: 'night-city', scale: 'medium', align: 'top', pace: 'normal' },
      { id: 15, src: '/frame/buildings/15.webp', title: 'Table Light', location: 'Shanghai / Interior', meta: 'Soft glass / lifestyle detail', orientation: 'portrait', tone: 'interior', scale: 'small', align: 'bottom', pace: 'tight' },
      { id: 17, src: '/frame/buildings/17.webp', title: 'Urban Machinery', location: 'Shanghai / Rooftop Structure', meta: 'Late-day light / industrial edge', orientation: 'landscape', tone: 'industrial', scale: 'large', align: 'center', pace: 'normal' },
      { id: 18, src: '/frame/buildings/18.webp', title: 'Night Crossing', location: 'Shanghai / Street Canopy', meta: 'Traffic glow / tree shadow', orientation: 'portrait', tone: 'street', scale: 'large', align: 'bottom', pace: 'wide' },
    ],
  },
]

export const frameOutro: FramePanel = {
  layout: 'outro',
  eyebrow: 'Next',
  title: 'Back to building systems.',
  body: 'After the visual archive, the page returns to stack, tools, and shipped projects.',
}

export const frameImages: FrameImage[] = frameChapters.flatMap((chapter) => chapter.images)

export const framePanels: FramePanel[] = [
  frameIntro,
  ...frameChapters.flatMap((chapter) => [
    { layout: 'chapter' as const, chapter },
    ...chapter.images.map((image) => ({ layout: 'image' as const, chapter, image })),
  ]),
  frameOutro,
]
```

- [ ] **Step 2: Run typecheck and expect the old component to fail**

Run:

```bash
npm run typecheck
```

Expected: TypeScript may fail because `Frame.tsx` still reads `panel.frame`. This is acceptable for this task because the next task updates the component to the new data contract.

- [ ] **Step 3: Do not commit yet**

Do not commit after Task 1. Commit the data and component together after Task 2 so the repository is not left with a known type error.

---

### Task 2: Render Chapter-Aware Frame Panels

**Files:**
- Modify: `src/components/Frame.tsx`

- [ ] **Step 1: Replace `src/components/Frame.tsx` with chapter-aware rendering**

Replace the whole file with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { frameChapters, frameImages, framePanels, type FrameChapter, type FrameImage } from '../data/frames'

interface ActiveFrameState {
  imageIndex: number
  chapterIndex: number
}

function FrameRail({
  active,
  currentImage,
  currentChapter,
}: {
  active: ActiveFrameState
  currentImage?: FrameImage
  currentChapter?: FrameChapter
}) {
  return (
    <aside className="frame-horizontal__rail" aria-label="Frame gallery progress">
      <span className="frame-horizontal__rail-kicker">Frame</span>
      <span className="frame-horizontal__rail-title">{currentChapter?.title ?? 'Architecture'}</span>
      <span className="frame-horizontal__rail-count">
        {String(active.chapterIndex + 1).padStart(2, '0')} / {String(frameChapters.length).padStart(2, '0')}
      </span>
      <span className="frame-horizontal__rail-subcount">
        Image {String(active.imageIndex + 1).padStart(2, '0')} / {String(frameImages.length).padStart(2, '0')}
      </span>
      {currentImage && <span className="frame-horizontal__rail-current">{currentImage.title}</span>}
    </aside>
  )
}

function FrameChapterPanel({ chapter }: { chapter: FrameChapter }) {
  return (
    <article className="frame-panel frame-panel--chapter frame-chapter-panel" data-chapter={chapter.id}>
      <p className="frame-panel__eyebrow">{chapter.eyebrow}</p>
      <h2 className="frame-chapter-panel__title">{chapter.title}</h2>
      <p className="frame-panel__body frame-chapter-panel__body">{chapter.body}</p>
    </article>
  )
}

function FrameTextPanel({ layout, eyebrow, title, body }: { layout: 'intro' | 'outro'; eyebrow?: string; title?: string; body?: string }) {
  return (
    <article className={`frame-panel frame-panel--${layout} frame-chapter-panel`}>
      {eyebrow && <p className="frame-panel__eyebrow">{eyebrow}</p>}
      {title && <h2 className="frame-chapter-panel__title">{title}</h2>}
      {body && <p className="frame-panel__body frame-chapter-panel__body">{body}</p>}
    </article>
  )
}

function FrameImagePanel({ image, chapter }: { image: FrameImage; chapter: FrameChapter }) {
  return (
    <figure
      className={[
        'frame-panel',
        'frame-panel--image',
        `frame-panel--${image.orientation}`,
        `frame-panel--scale-${image.scale}`,
        `frame-panel--align-${image.align}`,
        `frame-panel--pace-${image.pace}`,
      ].join(' ')}
      key={image.src}
      data-tone={image.tone}
      data-frame-id={image.id}
      data-chapter={chapter.id}
      data-cursor="hover"
    >
      <div className="frame-panel__media">
        <img src={image.src} alt={image.title} loading="lazy" decoding="async" />
      </div>
      <figcaption className="frame-panel__caption">
        <span className="frame-panel__caption-title">{image.title}</span>
        <span>{image.location}</span>
        <span>{image.meta}</span>
      </figcaption>
    </figure>
  )
}

export default function Frame() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ActiveFrameState>({ imageIndex: 0, chapterIndex: 0 })

  const currentImage = frameImages[active.imageIndex]
  const currentChapter = frameChapters[active.chapterIndex]

  const chapterByImageId = useMemo(() => {
    const map = new Map<number, number>()
    frameChapters.forEach((chapter, chapterIndex) => {
      chapter.images.forEach((image) => map.set(image.id, chapterIndex))
    })
    return map
  }, [])

  useEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    if (!rootEl || !trackEl) return

    const updateActivePanel = () => {
      const panels = Array.from(trackEl.querySelectorAll<HTMLElement>('.frame-panel--image'))
      const center = window.innerWidth / 2
      let imageIndex = 0
      let closest = Number.POSITIVE_INFINITY

      panels.forEach((panel, index) => {
        const rect = panel.getBoundingClientRect()
        const distance = Math.abs(rect.left + rect.width / 2 - center)
        if (distance < closest) {
          closest = distance
          imageIndex = index
        }
      })

      const imageId = Number(panels[imageIndex]?.dataset.frameId)
      const chapterIndex = chapterByImageId.get(imageId) ?? 0
      setActive((prev) => (
        prev.imageIndex === imageIndex && prev.chapterIndex === chapterIndex
          ? prev
          : { imageIndex, chapterIndex }
      ))
    }

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.frame-chapter-panel__title',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.08,
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
            onUpdate: updateActivePanel,
            onRefresh: updateActivePanel,
          },
        })

        updateActivePanel()

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
  }, [chapterByImageId])

  return (
    <section className="frame-horizontal" id="frame" ref={root} data-horizontal-section>
      <div className="frame-horizontal__pin">
        <FrameRail active={active} currentImage={currentImage} currentChapter={currentChapter} />

        <div className="frame-horizontal__track" ref={track} data-horizontal-track>
          {framePanels.map((panel, index) => {
            if (panel.layout === 'intro' || panel.layout === 'outro') {
              return (
                <FrameTextPanel
                  key={`${panel.layout}-${index}`}
                  layout={panel.layout}
                  eyebrow={panel.eyebrow}
                  title={panel.title}
                  body={panel.body}
                />
              )
            }

            if (panel.layout === 'chapter' && panel.chapter) {
              return <FrameChapterPanel chapter={panel.chapter} key={panel.chapter.id} />
            }

            if (panel.layout === 'image' && panel.image && panel.chapter) {
              return <FrameImagePanel image={panel.image} chapter={panel.chapter} key={panel.image.src} />
            }

            return null
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: `tsc` exits 0.

- [ ] **Step 3: Commit data and component**

Run:

```bash
git add src/data/frames.ts src/components/Frame.tsx
git commit -m "Structure frame gallery into chapters"
```

---

### Task 3: Add Editorial Rhythm CSS

**Files:**
- Modify: `src/styles/components/frame.css`

- [ ] **Step 1: Replace `src/styles/components/frame.css` with the rhythm layout**

Replace the whole file with:

```css
/* Frame - pinned editorial architecture gallery */
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
  top: clamp(76px, 9vh, 112px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(240px, 32vw);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-mute);
  pointer-events: none;
  mix-blend-mode: difference;
}

.frame-horizontal__rail-title,
.frame-horizontal__rail-count {
  color: var(--fg);
}

.frame-horizontal__rail-subcount {
  color: var(--fg-dim);
}

.frame-horizontal__rail-current {
  margin-top: 12px;
  color: var(--fg-soft);
  line-height: 1.5;
  letter-spacing: 0.1em;
}

.frame-horizontal__track {
  height: 100vh;
  display: flex;
  align-items: center;
  gap: clamp(28px, 4vw, 76px);
  padding-left: clamp(280px, 34vw, 520px);
  padding-right: clamp(120px, 16vw, 240px);
  will-change: transform;
}

.frame-panel {
  position: relative;
  flex: 0 0 auto;
}

.frame-chapter-panel {
  width: min(520px, 58vw);
  max-height: min(76vh, 640px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.frame-panel--intro,
.frame-panel--outro {
  width: min(560px, 62vw);
}

.frame-panel--chapter {
  padding-inline: clamp(12px, 2vw, 32px);
}

.frame-panel__eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fg-mute);
  margin: 0 0 clamp(18px, 3vh, 28px);
}

.frame-chapter-panel__title {
  max-width: 11ch;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(34px, 4.8vw, 76px);
  line-height: 0.96;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--fg);
}

.frame-chapter-panel__body {
  max-width: 420px;
}

.frame-panel__body {
  margin: clamp(22px, 3.4vh, 34px) 0 0;
  font-family: var(--font-serif);
  font-size: clamp(16px, 1.45vw, 22px);
  line-height: 1.45;
  color: var(--fg-soft);
}

.frame-panel--image {
  width: clamp(320px, 34vw, 620px);
}

.frame-panel--portrait {
  width: clamp(250px, 25vw, 430px);
}

.frame-panel--tall {
  width: clamp(220px, 21vw, 360px);
}

.frame-panel--scale-hero.frame-panel--landscape {
  width: clamp(620px, 68vw, 1120px);
}

.frame-panel--scale-hero.frame-panel--portrait {
  width: clamp(380px, 38vw, 620px);
}

.frame-panel--scale-large.frame-panel--landscape {
  width: clamp(460px, 48vw, 820px);
}

.frame-panel--scale-large.frame-panel--portrait {
  width: clamp(310px, 31vw, 500px);
}

.frame-panel--scale-large.frame-panel--tall {
  width: clamp(260px, 26vw, 420px);
}

.frame-panel--scale-medium.frame-panel--landscape {
  width: clamp(360px, 38vw, 660px);
}

.frame-panel--scale-medium.frame-panel--portrait {
  width: clamp(260px, 26vw, 420px);
}

.frame-panel--scale-medium.frame-panel--tall {
  width: clamp(230px, 23vw, 360px);
}

.frame-panel--scale-small.frame-panel--landscape {
  width: clamp(260px, 27vw, 430px);
}

.frame-panel--scale-small.frame-panel--portrait {
  width: clamp(210px, 20vw, 320px);
}

.frame-panel--scale-small.frame-panel--tall {
  width: clamp(190px, 18vw, 280px);
}

.frame-panel--align-top {
  align-self: flex-start;
  margin-top: clamp(96px, 12vh, 140px);
}

.frame-panel--align-center {
  align-self: center;
}

.frame-panel--align-bottom {
  align-self: flex-end;
  margin-bottom: clamp(78px, 10vh, 126px);
}

.frame-panel--pace-tight {
  margin-right: clamp(-16px, -1vw, -8px);
}

.frame-panel--pace-wide {
  margin-right: clamp(48px, 8vw, 140px);
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
  transform: scale(1.035);
  filter: saturate(0.92) contrast(1.04);
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
  max-width: 100%;
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--fg-dim);
  text-transform: uppercase;
}

.frame-panel__caption-title {
  font-family: var(--font-serif);
  font-size: clamp(16px, 1.35vw, 21px);
  letter-spacing: 0;
  text-transform: none;
  color: var(--fg);
}

@media (max-height: 760px) and (min-width: 769px) {
  .frame-chapter-panel__title {
    font-size: clamp(30px, 4vw, 58px);
  }

  .frame-panel__body {
    font-size: clamp(15px, 1.25vw, 19px);
    line-height: 1.38;
  }

  .frame-panel--align-top {
    margin-top: 82px;
  }

  .frame-panel--align-bottom {
    margin-bottom: 72px;
  }
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
    gap: clamp(28px, 7vw, 52px);
    padding-inline: 16px;
    width: min(680px, 100%);
    margin-inline: auto;
    transform: none !important;
  }

  .frame-panel,
  .frame-chapter-panel,
  .frame-panel--intro,
  .frame-panel--chapter,
  .frame-panel--outro,
  .frame-panel--image,
  .frame-panel--portrait,
  .frame-panel--tall,
  .frame-panel--scale-hero,
  .frame-panel--scale-large,
  .frame-panel--scale-medium,
  .frame-panel--scale-small {
    width: 100%;
    max-height: none;
    margin: 0;
    padding-inline: 0;
    align-self: auto;
  }

  .frame-chapter-panel {
    padding-top: clamp(18px, 5vw, 36px);
  }

  .frame-chapter-panel__title {
    max-width: 12ch;
    font-size: clamp(34px, 11vw, 58px);
  }

  .frame-chapter-panel__body {
    max-width: 100%;
  }
}
```

- [ ] **Step 2: Run lint and typecheck**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit CSS**

Run:

```bash
git add src/styles/components/frame.css
git commit -m "Add frame gallery rhythm styling"
```

---

### Task 4: Verify Layout Behavior

**Files:**
- No source file changes expected.

- [ ] **Step 1: Run production build**

Run:

```bash
npm run build
```

Expected: build exits 0. The existing large `three-vendor` chunk warning can remain.

- [ ] **Step 2: Confirm dev server**

Run:

```bash
lsof -nP -iTCP:5187 -sTCP:LISTEN
```

Expected: a node process is listening on `127.0.0.1:5187`.

If no process is listening, run:

```bash
npm run dev -- --host 127.0.0.1 --port 5187
```

- [ ] **Step 3: Run a read-only layout metric check**

Run:

```bash
node -e '
import("playwright").then(async ({ chromium }) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:5187/#frame", { waitUntil: "networkidle" });
  await page.waitForSelector("#frame .frame-panel--image", { timeout: 10000 });
  await page.waitForTimeout(500);
  const desktop = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll(".frame-chapter-panel__title"));
    const titleOversize = titles.map((title) => {
      const rect = title.getBoundingClientRect();
      return rect.width > innerWidth * 0.62 || rect.height > innerHeight * 0.72;
    });
    const track = document.querySelector(".frame-horizontal__track");
    return {
      imageCount: document.querySelectorAll(".frame-panel--image").length,
      chapterCount: document.querySelectorAll(".frame-panel--chapter").length,
      heroCount: document.querySelectorAll(".frame-panel--scale-hero").length,
      smallCount: document.querySelectorAll(".frame-panel--scale-small").length,
      topCount: document.querySelectorAll(".frame-panel--align-top").length,
      bottomCount: document.querySelectorAll(".frame-panel--align-bottom").length,
      trackScrollWidth: Math.round(track.scrollWidth),
      viewportWidth: innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      titleOversize: titleOversize.some(Boolean),
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5187/#frame", { waitUntil: "networkidle" });
  await page.waitForSelector("#frame .frame-panel--image", { timeout: 10000 });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => ({
    imageCount: document.querySelectorAll(".frame-panel--image").length,
    chapterCount: document.querySelectorAll(".frame-panel--chapter").length,
    trackDisplay: getComputedStyle(document.querySelector(".frame-horizontal__track")).display,
    trackTransform: getComputedStyle(document.querySelector(".frame-horizontal__track")).transform,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  }));
  await browser.close();
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
}).catch((error) => { console.error(error); process.exit(1); });
'
```

Expected output values:

```txt
desktop.imageCount: 18
desktop.chapterCount: 4
desktop.heroCount: 3
desktop.smallCount: 3
desktop.horizontalOverflow: 0
desktop.titleOversize: false
mobile.imageCount: 18
mobile.chapterCount: 4
mobile.trackDisplay: grid
mobile.trackTransform: none
mobile.horizontalOverflow: 0
```

If Chromium launch is blocked by sandbox permissions, rerun the same command with sandbox escalation. It is a read-only browser layout check.

- [ ] **Step 4: Commit only if verification required fixes**

If Task 4 required a source change, commit it:

```bash
git add src/data/frames.ts src/components/Frame.tsx src/styles/components/frame.css
git commit -m "Harden frame rhythm layout"
```

If no source change was needed, do not create a commit.

---

### Task 5: Document Chapter-Driven Frame Data

**Files:**
- Modify: `README.md`
- Modify: `docs/01-architecture/overview.md`

- [ ] **Step 1: Update README content editing notes**

In `README.md`, replace:

```md
- Frame architecture gallery: `src/data/frames.ts`
```

with:

```md
- Frame architecture gallery chapters, captions, and rhythm metadata: `src/data/frames.ts`
```

- [ ] **Step 2: Update architecture overview data notes**

In `docs/01-architecture/overview.md`, add this bullet under the data flow notes:

```md
- `src/data/frames.ts` groups Frame imagery into chapters and stores image scale, alignment, and pacing metadata for the horizontal gallery.
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0. The existing large `three-vendor` chunk warning can remain.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add README.md docs/01-architecture/overview.md
git commit -m "Document chapter-driven frame gallery"
```

---

### Task 6: Final Status Check

**Files:**
- No source file changes expected.

- [ ] **Step 1: Check recent commits**

Run:

```bash
git log --oneline -8
```

Expected: recent commits include:

```txt
Document chapter-driven frame gallery
Add frame gallery rhythm styling
Structure frame gallery into chapters
```

- [ ] **Step 2: Check working tree**

Run:

```bash
git status --short
```

Expected: only pre-existing unrelated user changes remain. Do not stage or revert those unrelated files.

- [ ] **Step 3: Report completion**

Report:

```txt
Frame rhythm implementation is complete.
Verification passed: typecheck, lint, build, and layout metric check.
Preview URL: http://127.0.0.1:5187/#frame
```
