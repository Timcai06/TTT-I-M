# Visual Archive Cluster Design

## Goal

Redesign the current Frame area into one unified visual archive chapter that contains three visual themes: Building, Cuisine, and Scenery. All three themes should use composed image clusters instead of a flat single-row gallery.

The section should feel like a curated image archive with different visual voices inside one experience:

- Building: structure, city, architecture, spatial observation.
- Cuisine: food, table, restaurant, intimate daily detail.
- Scenery: landscape, travel, atmosphere, open-air breathing room.

## Corrected Direction

Cuisine should not move right-to-left. Cuisine should visually enter from the left and move toward the right as the user scrolls.

Building, Cuisine, and Scenery should live inside the same major chapter. They are subthemes of one visual archive, not three unrelated top-level sections.

The staggered layout requirement applies to all three themes. Building should also move beyond the current one-image-after-another rail.

## Information Architecture

The major section should keep one identity, such as `Frame`, `Visual Archive`, or `Life Frames`. Inside it, the track is divided into three subtheme sequences:

1. Building
2. Cuisine
3. Scenery

Each subtheme begins with a compact text marker, then moves through several image clusters. The fixed rail should report the active theme and progress through the archive.

Recommended high-level flow:

```txt
Archive Intro
Building Marker
Building Clusters
Cuisine Marker
Cuisine Clusters
Scenery Marker
Scenery Clusters
Archive Outro
```

## Cluster Layout Principle

The basic visual unit is no longer a single image panel. The basic unit is a cluster of 2-4 images.

Each cluster should have one dominant image and one to three supporting images. Supporting images can stack vertically, sit above or below the main image, or create a small offset group.

Example cluster patterns:

```txt
[ large image ] [ small image ]
                [ small image ]
```

```txt
[ small image ] [ large image ]
[ small image ]
```

```txt
        [ small image ]
[ wide large image       ]
        [ small image ]
```

The goal is composed rhythm, not random collage. Clusters should still have clear structure, stable spacing, and readable captions.

## Theme-Specific Visual Language

### Building

Building should keep the architectural seriousness of the current Frame section, but it should become more composed.

Recommended cluster types:

- Facade cluster: one large facade/wall image plus two detail images.
- Skyline cluster: one wide city image plus one or two smaller skyline/window images.
- Interior route cluster: stair/corridor images arranged vertically to imply movement.
- Night city cluster: one large night anchor plus smaller rooftop/street details.

Building should feel measured, structural, and observant. It can use stronger geometry and more angular spacing than Cuisine.

### Cuisine

Cuisine should feel like a table spread, food diary, menu page, or magazine clipping.

Recommended cluster types:

- Table spread: large food/table image with two small detail images stacked beside it.
- Detail stack: two or three small images in a vertical column next to a larger anchor.
- Menu page: compact text marker plus small images arranged like a tasting sequence.

Cuisine movement direction should visually read as entering from the left and sliding toward the right. The cluster composition should feel warmer and more intimate than Building.

### Scenery

Scenery should be more open and breathable than the other two themes.

Recommended cluster types:

- Panorama cluster: one wide image with one small environmental detail.
- Travel memory cluster: two medium images with a small offset image.
- Quiet close: a large landscape image with generous blank space.

Scenery should slow the rhythm down, create more negative space, and act as the visual archive's open-air release.

## Motion Direction

The section can use one pinned scroll system, but theme subsections may have different horizontal movement directions.

Required direction:

- Cuisine: content enters from the left and moves toward the right.

Recommended direction logic:

- Building can keep the current horizontal movement direction if it feels consistent with the existing Frame work.
- Cuisine uses the opposite visual direction to create a clear theme shift.
- Scenery returns to the Building direction to close the archive with a calmer visual resolution.

The direction change should not break scroll release, hash navigation, or mobile fallback.

## Data Architecture

The data should describe themes, clusters, and image slots.

Recommended shape:

```ts
export type ArchiveThemeId = 'building' | 'cuisine' | 'scenery'
export type ArchiveDirection = 'left-to-right' | 'right-to-left'
export type ArchiveClusterLayout = 'feature-left' | 'feature-right' | 'stack-left' | 'stack-right' | 'panorama'
export type ArchiveSlotRole = 'primary' | 'secondary' | 'detail'

export interface ArchiveImage {
  id: number
  src: string
  title: string
  location: string
  meta: string
  orientation: 'portrait' | 'landscape' | 'square' | 'wide' | 'tall'
  tone: string
}

export interface ArchiveClusterSlot {
  role: ArchiveSlotRole
  image: ArchiveImage
}

export interface ArchiveCluster {
  id: string
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

This keeps future image changes data-driven. It also lets Building, Cuisine, and Scenery share a component system while retaining different layout patterns.

## Component Architecture

The current `Frame` section should evolve into a unified archive section rather than creating three unrelated sections.

Recommended components:

- `VisualArchive`: top-level pinned section and scroll orchestration.
- `ArchiveRail`: fixed progress/theme label.
- `ArchiveThemeMarker`: text divider for Building, Cuisine, Scenery.
- `ArchiveCluster`: renders one composed image cluster.
- `ArchiveImageSlot`: renders a primary/detail image inside a cluster.

If the implementation keeps the filename `Frame.tsx`, it should still internally move toward this architecture. The user-facing result matters more than the component name, but the code should be clear enough to support all three themes.

## CSS Layout System

The CSS should define cluster layout classes rather than only image size classes.

Required classes:

- `.archive-cluster`
- `.archive-cluster--feature-left`
- `.archive-cluster--feature-right`
- `.archive-cluster--stack-left`
- `.archive-cluster--stack-right`
- `.archive-cluster--panorama`
- `.archive-slot`
- `.archive-slot--primary`
- `.archive-slot--secondary`
- `.archive-slot--detail`
- `.archive-theme-marker`

The desktop layout can use CSS grid inside each cluster. The horizontal track moves clusters as units.

Mobile fallback should render each theme vertically:

- theme marker
- cluster as stacked responsive grid
- captions preserved
- no horizontal overflow

## Asset Handling

Current local resources include:

- `sources/cuisine/cuisine-01.jpg` through `sources/cuisine/cuisine-21.jpg`
- `sources/scenery/scenery-01.jpg` through at least `sources/scenery/scenery-11.jpg`
- `sources/beautified/buildings/01.png` through `18.png`

There is also a `sources/beautified/cusine` directory whose name is misspelled and currently has no image files discovered in the latest inspection. The implementation should normalize the beautified cuisine source path to `sources/beautified/cuisine` before relying on beautified cuisine assets.

The asset pipeline should generate WebP files into theme-specific public paths:

- `public/frame/buildings`
- `public/frame/cuisine`
- `public/frame/scenery`

## Acceptance Criteria

- Building, Cuisine, and Scenery are presented as subthemes inside one major visual archive section.
- All three themes use cluster layouts; none are a plain one-image horizontal row.
- Cuisine visually enters from the left and moves toward the right.
- Building also gains cluster-based layout, not only size variation.
- Scenery has a more open, breathable cluster rhythm.
- Desktop keeps a pinned horizontal archive experience.
- Mobile and `prefers-reduced-motion: reduce` use readable vertical fallback.
- No native horizontal overflow is introduced.
- Asset generation is documented and repeatable.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass after implementation.
