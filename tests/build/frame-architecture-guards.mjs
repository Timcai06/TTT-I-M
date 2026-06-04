import { readFileSync } from 'node:fs'

const frameSource = readFileSync('src/components/Frame.tsx', 'utf8')
const sectionSource = readFileSync('src/components/frame/ArchiveThemeSection.tsx', 'utf8')
const hookSource = readFileSync('src/components/frame/useArchiveThemeScroll.ts', 'utf8')
const slotSource = readFileSync('src/components/frame/ArchiveImageSlot.tsx', 'utf8')

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

console.log('[frame-architecture-guards] Frame composition, runtime hook, and slot DOM boundaries are separated.')
