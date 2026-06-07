import { readFileSync } from 'node:fs'

const frameSource = readFileSync('src/components/Frame.tsx', 'utf8')
const sectionSource = readFileSync('src/components/frame/ArchiveThemeSection.tsx', 'utf8')
const hookSource = readFileSync('src/components/frame/useArchiveThemeScroll.ts', 'utf8')
const slotSource = readFileSync('src/components/frame/ArchiveImageSlot.tsx', 'utf8')
const frameStyleSource = readFileSync('src/styles/components/frame.css', 'utf8')

const forbiddenInFrame = ['gsap', 'useEffect', 'useRef', 'useState', 'ArchiveImageSlot', 'ArchiveClusterPanel']
  .filter((needle) => frameSource.includes(needle))

if (forbiddenInFrame.length > 0) {
  throw new Error(`Frame.tsx must remain a composition shell, but still contains: ${forbiddenInFrame.join(', ')}`)
}

if (!frameSource.includes('ArchiveThemeSection') || !frameSource.includes('ArchiveTextPanel')) {
  throw new Error('Frame.tsx must compose extracted archive section and text panel components.')
}

if (!sectionSource.includes('useArchiveThemeScroll')) {
  throw new Error('ArchiveThemeSection must delegate scroll runtime to useArchiveThemeScroll.')
}

if (!hookSource.includes('warmClusterImages') || !hookSource.includes('scrollTrigger')) {
  throw new Error('useArchiveThemeScroll must own image warmup and ScrollTrigger orchestration.')
}

if (!slotSource.includes('className=') || !slotSource.includes('archive-slot__media')) {
  throw new Error('ArchiveImageSlot must retain the archive slot DOM contract.')
}

if (!slotSource.includes('loading="eager"') || !slotSource.includes("fetchPriority={eager ? 'high' : 'auto'}")) {
  throw new Error('Frame archive images must not rely on lazy loading after the full landing preload gate.')
}

if (!slotSource.includes('--image-aspect') || !frameStyleSource.includes('aspect-ratio: var(--image-aspect')) {
  throw new Error('Archive slots must bind media boxes to the real image aspect ratio so captions stay attached to the visible photo.')
}

if (!frameStyleSource.includes('.archive-cluster--theme-building.archive-cluster--mosaic-left') || !frameStyleSource.includes('width: clamp(2240px, 182vw, 3120px)')) {
  throw new Error('Building mosaic clusters must keep the enlarged but not over-wide track-level composition.')
}

const requiredBuildingLayeredClusters = [
  "[data-cluster='building-surface-memory']",
  "[data-cluster='building-skyline-weather']",
  "[data-cluster='building-interior-routes']",
  "[data-cluster='building-night-current']",
  'grid-template-rows: repeat(10, minmax(0, 1fr))',
]
const missingBuildingLayers = requiredBuildingLayeredClusters.filter((needle) => !frameStyleSource.includes(needle))
if (missingBuildingLayers.length > 0) {
  throw new Error(`Building archive must keep bespoke layered cluster layouts: ${missingBuildingLayers.join(', ')}`)
}

if (frameStyleSource.includes('scale(var(--slot-scale') || frameStyleSource.includes('scale(calc(var(--slot-scale')) {
  throw new Error('Archive slot captions must not drift under scaled slot/media transforms; enlarge slots through layout.')
}

if (frameStyleSource.includes('object-fit: cover')) {
  throw new Error('Frame archive images must preserve their source proportions; do not use object-fit: cover.')
}

if (!frameStyleSource.includes('.archive-cluster--theme-cuisine.archive-cluster--feature-left') || !frameStyleSource.includes('width: clamp(1220px, 108vw, 1840px)')) {
  throw new Error('Cuisine archive must keep proportional, staggered table layouts.')
}

console.log('[frame-architecture-guards] Frame composition, runtime hook, and slot DOM boundaries are separated.')
