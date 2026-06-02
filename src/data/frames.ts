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
