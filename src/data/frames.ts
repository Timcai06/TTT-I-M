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
