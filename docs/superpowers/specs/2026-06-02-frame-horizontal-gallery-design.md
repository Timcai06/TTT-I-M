# Frame Horizontal Gallery Design

Date: 2026-06-02

## Objective

Turn the current `Frame` chapter into a Lando Norris inspired fixed-viewport horizontal architecture gallery, while keeping the rest of the portfolio vertically readable and stable.

This is a local section effect, not a full-site horizontal scroll. The goal is to make the 18 beautified building images feel like a cinematic strip of city light, placed between the existing personal-life narrative and the technical/project sections.

## Current Page Context

The portfolio is a React/Vite single-page site with a central chapter registry:

`Hero -> About -> Life -> Frame -> Skills -> Projects -> Contact`

Important constraints:

- `Hero` already carries the first-viewport identity and must not be redesigned for this task.
- `LifeGallery` already has a heavy pinned bento/Flip section, so `Frame` should not become another long, overloaded pinned narrative.
- `Frame` currently renders a simple editorial grid from `src/data/frames.ts` and uses `/life/*.webp` placeholders.
- Current `Frame` placeholders should remain until the image pipeline and layout are ready.

## Source Case Study

Local case notes used:

- `优秀案例拆解/landonorris/03-image-parallax.md`
- `优秀案例拆解/landonorris/index.md`
- `优秀案例拆解/landonorris/07-footer-misc.md`
- `优秀案例拆解/lukebaffait/03-scroll-effects.md`

Relevant Lando Norris pattern:

- A section marks itself as a horizontal gallery with `data-horizontal-section`.
- A pinned viewport contains a wide inner `horizontal-track`.
- Vertical page scrolling drives `x` translation of the track through GSAP ScrollTrigger.
- The effect uses static images, not image sequences.
- Scroll distance is measured from actual track width.
- The section may include mixed image panels, text panels, and visual callouts.

Relevant Luke Baffait pattern:

- Use sticky/fixed preview logic carefully and locally.
- Keep interaction tied to scroll position and center-of-viewport state.
- Avoid making every section equally heavy.

## Assets

Current beautified building images:

`../sources/beautified/buildings/01.png` through `../sources/beautified/buildings/18.png`

These are source candidates only. They should not be shipped as raw PNGs.

Planned production output:

`public/frame/buildings/01.webp` through `public/frame/buildings/18.webp`

Optional future output:

`public/frame/buildings/01.avif` through `public/frame/buildings/18.avif`

`scripts/setup-assets.mjs` should be extended to encode the source PNGs into optimized WebP, similar to the existing `sources/life -> public/life` pipeline.

## Information Architecture

The Frame chapter should read as:

1. Intro panel: `Frame / Architecture / Chasing light`
2. Horizontal image sequence: 18 building images arranged as a cinematic strip
3. Interleaved text callouts: short lines that explain the visual identity
4. Outro panel: transitions back to skills/work

Recommended copy direction:

- English title: `Frames of structure.`
- Supporting line: `Light, stairs, facades, and the quiet geometry of the city.`
- Chinese line: `我拍下建筑，不是为了记录地点，而是为了记录光如何经过结构。`

## Component Architecture

Keep the feature bounded to Frame:

- `src/components/Frame.tsx`
  - Owns the section markup and GSAP lifecycle.
  - Creates the desktop horizontal ScrollTrigger.
  - Uses a simple vertical fallback under mobile/reduced-motion.

- `src/data/frames.ts`
  - Holds ordered frame entries.
  - Adds `orientation`, `tone`, and optional `featured` metadata.

- `src/styles/components/frame.css`
  - Defines pinned viewport, horizontal track, panels, captions, mobile fallback.

- `scripts/setup-assets.mjs`
  - Encodes source PNGs into public WebP outputs.
  - Caches by source mtime and encoding signature.

No new animation library is required. No Rive is required. No WebGL is required.

## Proposed Markup Shape

```tsx
<section className="frame frame-horizontal" id="frame" data-horizontal-section>
  <div className="frame-horizontal__pin">
    <aside className="frame-horizontal__rail">
      <span>Frame</span>
      <span>Architecture</span>
      <span>{activeIndex} / 18</span>
    </aside>

    <div className="frame-horizontal__track" data-horizontal-track>
      <article className="frame-panel frame-panel--intro">...</article>
      {frames.map((frame) => (
        <figure className={`frame-panel frame-panel--${frame.orientation}`}>
          <img src={frame.src} alt={frame.title} loading="lazy" decoding="async" />
          <figcaption>...</figcaption>
        </figure>
      ))}
      <article className="frame-panel frame-panel--outro">...</article>
    </div>
  </div>
</section>
```

## Desktop Motion Design

Desktop behavior:

- The Frame section pins when its top reaches the viewport top.
- The horizontal track translates from left to right based on vertical scroll.
- The rail remains fixed inside the pinned viewport.
- Captions can update based on the currently centered panel.
- Images enter with subtle opacity/y/scale, not large perspective tricks.

GSAP logic:

```ts
const mm = gsap.matchMedia()

mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
  const distance = track.scrollWidth - window.innerWidth

  const tween = gsap.to(track, {
    x: () => -distance,
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: () => `+=${distance}`,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  })

  return () => tween.scrollTrigger?.kill()
})
```

The actual implementation should use `gsap.context()` so all tweens and triggers are reverted on unmount.

## Mobile And Reduced Motion

Mobile behavior:

- No horizontal pinning.
- No forced landscape prompt.
- Render as a vertical editorial list.
- Keep captions readable and tap targets natural.

Reduced-motion behavior:

- Disable scrubbed horizontal translation.
- Keep the section as a static vertical or grid layout.
- Preserve all images and text in normal document flow.

This avoids the Lando mobile pattern of forcing a rotation prompt, because this portfolio must stay readable for recruiters and casual visitors on phones.

## Visual Design

The visual tone should be architectural and editorial:

- Dark page background remains consistent with the portfolio.
- Building photos supply warmth and glow.
- Use the existing serif/mono type system.
- Avoid card-heavy UI.
- Keep captions small, EXIF/archive-like, and quiet.
- Use image proportions intentionally:
  - vertical images can be tall panels.
  - horizontal images can be wide panels.
  - one or two images may be oversized hero panels.

Suggested panel rhythm:

1. Intro text panel
2. Tall old-wall panel
3. Wide night skyline
4. Tall traditional doorway
5. Wide stair/interior pair
6. Text callout
7. Wide river skyline
8. Narrow facade detail
9. Wide sunset skyline
10. Wide staircase
11. Hotel/city night
12. Lifestyle interior detail
13. Minimal concrete interior
14. Industrial rooftop
15. Night street
16. Outro panel

The 18 images do not all need identical treatment. Uniform cropping would damage the architecture lines.

## Compatibility Requirements

Hard requirements:

- Keep `overflow-x: hidden` on `html, body`.
- Do not create native page-level horizontal scroll.
- Use `transform: translate3d(...)`, `opacity`, and light `clip-path` only.
- Avoid CSS ScrollTimeline, CSS masonry, and unsupported layout experiments.
- Do not animate width, height, top, or left during scroll.
- Do not rely on `mix-blend-mode` for essential text contrast.
- Re-run `ScrollTrigger.refresh()` after images load.
- Use `invalidateOnRefresh: true` and dynamic width measurements.
- Kill/revert triggers on component unmount.
- Keep mobile as non-pinned vertical layout.

Browser/performance checks:

- Desktop: no blank pinned section, no horizontal overflow, no pin-spacer collapse.
- Mobile: no sideways drag gap, no forced landscape, no content overlap.
- Reduced motion: content remains visible without animation.
- Build: image outputs are WebP and not raw PNG.

## Implementation Phases

### Phase 1: Asset Pipeline

- Extend `scripts/setup-assets.mjs` for `sources/beautified/buildings`.
- Encode 18 PNGs into `public/frame/buildings/*.webp`.
- Add cache signature for frame/building assets.
- Keep `src/data/frames.ts` placeholders until outputs exist.

### Phase 2: Frame Data

- Replace placeholder entries with 18 building frames.
- Add metadata:
  - `title`
  - `location`
  - `meta`
  - `orientation`
  - `tone`
  - `layout`

### Phase 3: Horizontal Layout

- Update Frame markup into pinned viewport + horizontal track.
- Implement desktop-only GSAP horizontal ScrollTrigger.
- Add fixed internal rail and active count.
- Preserve vertical fallback.

### Phase 4: QA

- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Verify in browser:
  - `#frame`
  - `#skills` after Frame
  - desktop viewport
  - mobile viewport
  - reduced-motion emulation if practical

## Non-Goals

- Do not redesign Hero.
- Do not replace LifeGallery.
- Do not add Rive.
- Do not add WebGL.
- Do not make the whole site horizontal.
- Do not force phone landscape orientation.
- Do not ship raw PNG files.

## Final Scope Decision

The first implementation should include all 18 beautified building images in one pass.

The gallery must still pace the 18 images with intro/outro panels and text callouts so the section feels composed instead of a raw image dump.
