# Core Architecture & Page Flow

## Chapter Routing System
This portfolio does not use a traditional router (like `react-router`). Instead, it relies on a bespoke "Chapter" mechanism for section mounting, lazy rendering, and sequential transitions.
- Chapters are lazily loaded to prioritize the initial Hero paint.
- `src/lib/chaptersReady.ts` coordinates when a chapter is fully mounted and ready for GSAP ScrollTrigger calculation.

## Module Responsibilities
- **Loader**: The entry point of the site. Blocks the initial render until critical assets (fonts, hero images, essential 3D textures) are preloaded to prevent FOUC (Flash of Unstyled Content).
- **Hero & About**: High-performance areas carrying heavy Text / Particle interactions. These need tight lifecycle management.
- **Frame**: Hijacks vertical scrolling via `Lenis` and maps it to a horizontal scroll or Z-axis camera push for photography display.
- **Work**: Spatial 3D project archive or engineering-style grid.
- **Navigation Transition**: Handles the physical "shutter" or "glass break" effect when jumping between chapters.

## Animation Infrastructure
- **GSAP + ScrollTrigger + Lenis**: `Lenis` handles the smooth scrolling math and proxies the scroll events to `ScrollTrigger` via `requestAnimationFrame`.
- Always remember to call `ScrollTrigger.refresh()` when lazy chapters mount or DOM height changes to recalculate start/end points.

## Three.js / React Three Fiber (R3F) Lifecycle
- Three.js scenes must manage their own disposal to prevent memory leaks over time.
- Use `useFrame` cautiously. Pause or unmount R3F canvases when they are not in the viewport to save GPU cycles.

## Pretext Interaction
- Used for interactive typography (magnetic forces, spacing tension).
- Ensure Pretext does not conflict with `SplitText`'s DOM wrapping by maintaining clear container boundaries.
