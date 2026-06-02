export type ArchiveThemeId = 'building' | 'cuisine' | 'scenery'
export type ArchiveDirection = 'left-to-right' | 'right-to-left'
export type ArchiveClusterLayout = 'feature-left' | 'feature-right' | 'stack-left' | 'stack-right' | 'panorama'
export type ArchiveSlotRole = 'primary' | 'secondary' | 'detail'
export type ArchiveOrientation = 'portrait' | 'landscape' | 'square' | 'wide' | 'tall'
export type ArchivePanelLayout = 'intro' | 'theme' | 'cluster' | 'outro'

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

export interface ArchivePanel {
  layout: ArchivePanelLayout
  theme?: ArchiveTheme
  cluster?: ArchiveCluster
  eyebrow?: string
  title?: string
  body?: string
}

const b = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => ({
  id,
  src: `/frame/buildings/${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Shanghai / Architecture',
  meta: 'Light, structure, and urban texture',
  orientation,
  tone,
})

const c = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => ({
  id,
  src: `/frame/cuisine/cuisine-${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Table / Cuisine',
  meta: 'Food, table light, and daily detail',
  orientation,
  tone,
})

const s = (id: number, title: string, orientation: ArchiveOrientation, tone: string): ArchiveImage => ({
  id,
  src: `/frame/scenery/scenery-${String(id).padStart(2, '0')}.webp`,
  title,
  location: 'Travel / Scenery',
  meta: 'Open air, distance, and atmosphere',
  orientation,
  tone,
})

export const archiveIntro: ArchivePanel = {
  layout: 'intro',
  eyebrow: 'Frame / Visual Archive',
  title: 'Frames of living systems.',
  body: 'Architecture, table scenes, and open landscapes collected as one visual archive.',
}

export const archiveThemes: ArchiveTheme[] = [
  {
    id: 'building',
    eyebrow: '01 / Building',
    title: 'Structure holds the first rhythm.',
    body: 'Facades, stairs, skylines, and night edges become composed observations of the city.',
    direction: 'right-to-left',
    clusters: [
      { id: 'building-facade', layout: 'feature-left', slots: [
        { role: 'primary', image: b(1, 'Shadow Wall', 'portrait', 'old-wall') },
        { role: 'secondary', image: b(3, 'Green Doorway', 'portrait', 'heritage') },
        { role: 'detail', image: b(4, 'Raking Stone', 'portrait', 'detail') },
      ] },
      { id: 'building-skyline', layout: 'panorama', slots: [
        { role: 'primary', image: b(2, 'Night Blocks', 'wide', 'night-city') },
        { role: 'secondary', image: b(9, 'Framed Skyline', 'landscape', 'skyline') },
        { role: 'detail', image: b(10, 'Afterglow Blocks', 'landscape', 'sunset') },
      ] },
      { id: 'building-route', layout: 'stack-right', slots: [
        { role: 'primary', image: b(13, 'Arches At Night', 'landscape', 'night-city') },
        { role: 'secondary', image: b(5, 'Brick Stair', 'landscape', 'interior') },
        { role: 'detail', image: b(12, 'Lit Descent', 'landscape', 'stair') },
      ] },
      { id: 'building-night', layout: 'feature-right', slots: [
        { role: 'primary', image: b(7, 'Gold Riverfront', 'wide', 'skyline') },
        { role: 'secondary', image: b(14, 'Rooftop Neon', 'landscape', 'night-city') },
        { role: 'detail', image: b(18, 'Night Crossing', 'portrait', 'street') },
      ] },
      { id: 'building-detail', layout: 'stack-left', slots: [
        { role: 'primary', image: b(8, 'Lantern Facade', 'tall', 'detail') },
        { role: 'secondary', image: b(11, 'Weathered Geometry', 'landscape', 'detail') },
        { role: 'detail', image: b(6, 'Narrow Alley', 'landscape', 'alley') },
      ] },
      { id: 'building-quiet', layout: 'feature-left', slots: [
        { role: 'primary', image: b(16, 'Concrete Quiet', 'landscape', 'minimal') },
        { role: 'secondary', image: b(15, 'Table Light', 'portrait', 'interior') },
        { role: 'detail', image: b(17, 'Urban Machinery', 'landscape', 'industrial') },
      ] },
    ],
  },
  {
    id: 'cuisine',
    eyebrow: '02 / Cuisine',
    title: 'The table enters from the left.',
    body: 'Food, plates, cups, and warm fragments form a closer daily register.',
    direction: 'left-to-right',
    clusters: [
      { id: 'cuisine-table', layout: 'feature-left', slots: [
        { role: 'primary', image: c(1, 'Table Opening', 'landscape', 'table') },
        { role: 'secondary', image: c(2, 'Small Plate', 'square', 'plate') },
        { role: 'detail', image: c(3, 'Glass Detail', 'portrait', 'glass') },
      ] },
      { id: 'cuisine-stack', layout: 'stack-left', slots: [
        { role: 'primary', image: c(6, 'Warm Dish', 'portrait', 'dish') },
        { role: 'secondary', image: c(4, 'Shared Bite', 'square', 'detail') },
        { role: 'detail', image: c(5, 'Table Corner', 'landscape', 'table') },
      ] },
      { id: 'cuisine-menu', layout: 'feature-right', slots: [
        { role: 'primary', image: c(9, 'Dinner Light', 'landscape', 'dinner') },
        { role: 'secondary', image: c(7, 'Plate Study', 'square', 'plate') },
        { role: 'detail', image: c(8, 'Cup Shadow', 'portrait', 'glass') },
      ] },
      { id: 'cuisine-close', layout: 'stack-right', slots: [
        { role: 'primary', image: c(12, 'Aftertaste', 'landscape', 'table') },
        { role: 'secondary', image: c(10, 'Dish Detail', 'square', 'dish') },
        { role: 'detail', image: c(11, 'Soft Table Light', 'portrait', 'detail') },
      ] },
      { id: 'cuisine-service', layout: 'feature-left', slots: [
        { role: 'primary', image: c(13, 'Shared Service', 'landscape', 'table') },
        { role: 'secondary', image: c(14, 'Sauce Detail', 'square', 'detail') },
        { role: 'detail', image: c(15, 'Quiet Cup', 'portrait', 'glass') },
      ] },
      { id: 'cuisine-night', layout: 'feature-right', slots: [
        { role: 'primary', image: c(18, 'Late Table', 'landscape', 'dinner') },
        { role: 'secondary', image: c(16, 'Small Dish', 'square', 'dish') },
        { role: 'detail', image: c(17, 'Table Texture', 'portrait', 'detail') },
      ] },
      { id: 'cuisine-tail', layout: 'stack-left', slots: [
        { role: 'primary', image: c(21, 'Last Bite', 'landscape', 'table') },
        { role: 'secondary', image: c(19, 'Plate Ending', 'square', 'plate') },
        { role: 'detail', image: c(20, 'Warm Fragment', 'portrait', 'detail') },
      ] },
    ],
  },
  {
    id: 'scenery',
    eyebrow: '03 / Scenery',
    title: 'Open air slows the archive down.',
    body: 'Landscapes and travel fragments give the section its final breath.',
    direction: 'right-to-left',
    clusters: [
      { id: 'scenery-panorama', layout: 'panorama', slots: [
        { role: 'primary', image: s(1, 'Open Distance', 'wide', 'open-air') },
        { role: 'secondary', image: s(2, 'Edge Detail', 'landscape', 'detail') },
      ] },
      { id: 'scenery-memory', layout: 'feature-left', slots: [
        { role: 'primary', image: s(3, 'Travel Light', 'landscape', 'travel') },
        { role: 'secondary', image: s(4, 'Quiet Field', 'portrait', 'field') },
        { role: 'detail', image: s(5, 'Small Horizon', 'landscape', 'horizon') },
      ] },
      { id: 'scenery-release', layout: 'feature-right', slots: [
        { role: 'primary', image: s(8, 'Wide Release', 'wide', 'release') },
        { role: 'secondary', image: s(6, 'Path Memory', 'landscape', 'path') },
        { role: 'detail', image: s(7, 'Air Detail', 'portrait', 'air') },
      ] },
      { id: 'scenery-close', layout: 'panorama', slots: [
        { role: 'primary', image: s(11, 'Final Horizon', 'wide', 'horizon') },
        { role: 'secondary', image: s(9, 'Soft Distance', 'landscape', 'distance') },
        { role: 'detail', image: s(10, 'Quiet Detail', 'portrait', 'detail') },
      ] },
    ],
  },
]

export const archiveOutro: ArchivePanel = {
  layout: 'outro',
  eyebrow: 'Next',
  title: 'Back to building systems.',
  body: 'After the archive, the page returns to stack, tools, and shipped projects.',
}

export const archiveClusters = archiveThemes.flatMap((theme) => theme.clusters)
export const archiveImages = archiveThemes.flatMap((theme) => theme.clusters.flatMap((cluster) => cluster.slots.map((slot) => slot.image)))

export const archivePanels: ArchivePanel[] = [
  archiveIntro,
  ...archiveThemes.flatMap((theme) => [
    { layout: 'theme' as const, theme },
    ...theme.clusters.map((cluster) => ({ layout: 'cluster' as const, theme, cluster })),
  ]),
  archiveOutro,
]
