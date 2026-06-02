# Frame Chapter Rhythm Design

## Goal

Upgrade the Frame chapter from a uniform 18-image horizontal gallery into a pinned editorial image sequence with four smaller chapters. The section should keep the current desktop horizontal scroll and mobile vertical fallback, but the visual rhythm should become closer to a curated exhibition: grouped, paced, and varied in scale.

## Current Problem

The current implementation is structurally correct but visually too even. Images are mostly arranged as a single-width rail with only orientation-based size differences, so the sequence reads as a list instead of a composed story.

The callout text also inherits large section-title behavior. In a pinned horizontal viewport, long lines such as "The city becomes readable when light touches an edge" can exceed the comfortable desktop reading area. Frame chapter text needs its own smaller editorial text system.

## Chapter Groups

The 18 building images are grouped into four visual chapters:

1. Surface Memory: images 1, 3, 4, 8, 11
2. Skyline Weather: images 2, 9, 10
3. Interior Routes: images 5, 6, 12, 13, 16
4. Night Current: images 7, 14, 15, 17, 18

Use these group names for the next implementation pass. Future wording changes should be data-only edits in `src/data/frames.ts`.

## Narrative Direction

The sequence should move from close observation to city scale, then into spatial movement, and finally into night-city energy:

- Surface Memory: old facades, doors, walls, lanterns, textures.
- Skyline Weather: distant city, windows, dusk, skyline atmosphere.
- Interior Routes: stairs, corridors, arches, rooms, movement through buildings.
- Night Current: Bund skyline, rooftops, table light, machinery, traffic canopy.

The user should feel a change of distance and mood between chapters, not just a change of image number.

## Text Panel Design

Text panels remain the chapter dividers, but they should no longer behave like normal page sections.

Each chapter text panel should use a dedicated compact editorial style:

- eyebrow: small mono label, such as `01 / Surface Memory`
- title: medium editorial heading, not the global `.section__title` scale
- body: one short paragraph, ideally 1-2 lines on desktop
- max width: constrained enough to prevent viewport overflow
- line height: tighter than normal body copy

The text panels should feel like exhibition wall labels inside the horizontal rail. They should introduce mood and reset pace, but not compete with the image panels.

## Image Rhythm System

Each image should carry layout metadata beyond orientation:

- `scale`: `hero`, `large`, `medium`, or `small`
- `align`: `top`, `center`, or `bottom`
- `pace`: `tight`, `normal`, or `wide`

The layout should use these values to create rhythm:

- `hero`: one major chapter anchor, large and memorable.
- `large`: strong image, but less dominant than hero.
- `medium`: normal storytelling image.
- `small`: breathing point, transition, or detail.
- `top` / `bottom`: vertical offsets that prevent a flat centerline.
- `wide`: larger gap after a visual beat or before a chapter transition.

The goal is controlled variation. The rail should not become random or collage-like.

## Proposed Chapter Composition

Surface Memory:

- image 1: large portrait, bottom-aligned chapter opener
- image 3: medium portrait, slightly top-aligned
- image 4: small portrait/detail, tighter gap
- image 8: tall medium, strong vertical interruption
- image 11: large landscape/detail, chapter close

Skyline Weather:

- image 2: hero landscape, open the chapter with scale
- image 9: medium landscape, window/city view
- image 10: large landscape, wide gap after it to let the skyline section breathe

Interior Routes:

- image 5: medium landscape, entry into interior movement
- image 6: large landscape, corridor compression
- image 12: medium landscape, lower alignment for descent
- image 13: hero landscape, strongest interior/night architectural moment
- image 16: small landscape, quiet reset

Night Current:

- image 7: hero landscape, city-night anchor
- image 14: medium landscape, rooftop color
- image 15: small portrait, intimate pause
- image 17: large landscape, industrial edge
- image 18: large portrait, final street-night tail

## Desktop Interaction

Desktop behavior remains pinned horizontal scroll:

- The section pins at viewport top.
- The track moves horizontally with scrubbed scroll.
- Chapter text panels and image panels are part of the same rail.
- The left rail reports both active chapter and active image progress.
- The rail must release cleanly into the next section.

The implementation must keep `prefers-reduced-motion` support and must avoid native horizontal page overflow.

## Mobile Behavior

Mobile should not use pinned horizontal scroll. It should render as vertical chapters:

- chapter text
- grouped image stack or simple one-column gallery
- preserved image captions
- no horizontal overflow

Image scale metadata can still affect mobile lightly, but mobile should prioritize readability and stable image display.

## Data Architecture

`src/data/frames.ts` should become configuration-driven around chapters instead of one flat `framePanels` list.

Recommended shape:

```ts
export interface FrameImage {
  id: number
  src: string
  title: string
  location: string
  meta: string
  orientation: FrameOrientation
  tone: string
  scale: 'hero' | 'large' | 'medium' | 'small'
  align: 'top' | 'center' | 'bottom'
  pace: 'tight' | 'normal' | 'wide'
}

export interface FrameChapter {
  id: string
  eyebrow: string
  title: string
  body: string
  images: FrameImage[]
}
```

The component can derive render panels from `frameChapters`. This keeps future scenery/cuisine/building expansions easier to manage.

## Component Design

`Frame.tsx` can stay as the top-level section, but should split rendering into small private helpers or components:

- `FrameRail`: progress and current chapter/image state
- `FrameChapterPanel`: compact text divider
- `FrameImagePanel`: image rendering with scale, align, and pace classes

This is enough separation without over-abstracting the section.

## CSS Design

`frame.css` should add a dedicated visual grammar:

- `.frame-chapter-panel`
- `.frame-chapter-panel__title`
- `.frame-panel--scale-hero`
- `.frame-panel--scale-large`
- `.frame-panel--scale-medium`
- `.frame-panel--scale-small`
- `.frame-panel--align-top`
- `.frame-panel--align-center`
- `.frame-panel--align-bottom`
- `.frame-panel--pace-tight`
- `.frame-panel--pace-normal`
- `.frame-panel--pace-wide`

The chapter text title must not reuse the global `.section__title` sizing.

## Acceptance Criteria

- Desktop Frame text never exceeds viewport width or height at common laptop sizes.
- The 18 images are grouped into four chapters using the user-provided grouping.
- Image panels show visible rhythm through size, vertical alignment, and spacing.
- The gallery remains pinned horizontal on desktop.
- Mobile remains a vertical, readable chapter gallery.
- `prefers-reduced-motion: reduce` uses the non-pinned fallback.
- No native horizontal overflow is introduced.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
