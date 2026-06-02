# Frame Independent Theme Rails Design

## Goal

Restructure the Frame visual archive so Building, Cuisine, and Scenery are three independent parts inside one Frame chapter, not three themes placed on one shared horizontal x-axis.

## Requirements

- Building must use the previous four user-defined groups:
  - 1, 3, 4, 8, 11
  - 2, 9, 10
  - 5, 6, 12, 13, 16
  - 7, 14, 15, 17, 18
- Cuisine remains an independent left-entering, right-moving part.
- Scenery is an independent part after Cuisine, with a slower and more open rhythm.
- No image or caption may exceed the visible desktop viewport during a pinned section.
- Mobile and reduced-motion layouts remain normal vertical grids.
- The first scroll into Frame should feel lighter by avoiding one very long pinned track and by reducing repeated ScrollTrigger refresh work.

## Architecture

`src/data/frames.ts` remains the source of truth for Frame content, but the model is theme-first instead of global-panel-first. Each `ArchiveTheme` owns its clusters and each theme renders as one independent pinned horizontal section.

`src/components/Frame.tsx` renders a Frame intro, then one `ArchiveThemeSection` per theme, then a Frame outro. Each theme section creates its own GSAP horizontal tween using only its own track. Active cluster state is local to that theme section and does not scan the full Frame archive.

`src/styles/components/frame.css` constrains each cluster to the viewport using bounded heights, grid rows, and caption sizing. Large clusters use a composed mosaic grid, but every media container is capped so image content stays on screen.

## Performance Design

- Split the previous single 22k-pixel track into three smaller tracks.
- Remove global direction tween over every cuisine cluster; the cuisine tween is scoped to the cuisine section.
- Replace per-image immediate `ScrollTrigger.refresh()` calls with one debounced refresh.
- Eager-load only the first image in each theme section; all later images remain lazy.
- Add layout containment to media-heavy panels where it does not interfere with pinning.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Playwright DOM/layout check on `http://127.0.0.1:5187/#frame`:
  - 3 independent `.archive-theme-section` nodes
  - Building has 4 clusters
  - Cuisine has 7 clusters
  - Scenery has 4 clusters
  - No desktop or mobile horizontal page overflow
  - Each visible image media rect fits within viewport height
