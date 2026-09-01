import { readdirSync, readFileSync } from 'node:fs'

const frameSource = readFileSync('src/components/Frame.tsx', 'utf8')
const sectionSource = readFileSync('src/components/frame/ArchiveThemeSection.tsx', 'utf8')
const hookSource = readFileSync('src/components/frame/useArchiveThemeScroll.ts', 'utf8')
const slotSource = readFileSync('src/components/frame/ArchiveImageSlot.tsx', 'utf8')
const bendSource = readFileSync('src/lib/canvas-ui/horizontalBend.ts', 'utf8')
const bendMathSource = readFileSync('src/lib/canvas-ui/horizontalBendMath.ts', 'utf8')
// frame.css was split into frame/*.css (archive-theme/cluster/slot/responsive);
// concatenate the entry + all partials so these contract checks find the rules
// regardless of which split file they landed in.
const frameStyleDir = 'src/styles/components/frame'
const frameStyleSource = [
  readFileSync('src/styles/components/frame.css', 'utf8'),
  ...readdirSync(frameStyleDir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(`${frameStyleDir}/${file}`, 'utf8')),
].join('\n')

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

for (const token of ['HorizontalBendSurface', 'bendHandle', 'ArchiveEditorialCopy', 'is-bend-enhanced']) {
  if (!sectionSource.includes(token) && !hookSource.includes(token)) {
    throw new Error(`Frame horizontal bend is missing ${token}.`)
  }
}
for (const token of ['zone: 180', 'angle: 46', 'rounding: 130', 'perspective: 1250', 'ease: 180', 'smoothing: 0.14', 'index <= 40', 'supportsHtmlInCanvas', 'drawElementImage', 'requestPaint', 'onFirstFrame']) {
  if (!bendSource.includes(token)) throw new Error(`Horizontal Bend must keep ${token}.`)
}
if (!bendSource.includes('outColor = vec4(base.rgb * coverage, coverage)') || bendSource.includes('edgeMask')) {
  throw new Error('Horizontal Bend must own one complete captured rail instead of double-painting edge fragments over DOM.')
}
for (const token of ['onEnhancedChange', 'is-bend-enhanced', '> .archive-theme-section__track', 'focus-within']) {
  if (!sectionSource.includes(token) && !frameStyleSource.includes(token)) {
    throw new Error(`Frame Bend single-owner fallback contract is missing ${token}.`)
  }
}
for (const token of ['right-to-left', 'left-to-right', 'ease / distance', 'smoothstep(0, edgeSpan', 'smoothstep(1 - edgeSpan, 1']) {
  if (!bendMathSource.includes(token)) throw new Error(`Horizontal Bend math must keep ${token}.`)
}

if (!slotSource.includes('className=') || !slotSource.includes('archive-slot__media')) {
  throw new Error('ArchiveImageSlot must retain the archive slot DOM contract.')
}

for (const token of ['openImageLightbox', 'galleryIndex', 'aria-label={`全屏查看：${image.title}`}', 'openSafeAsset(image.src)']) {
  if (!slotSource.includes(token)) throw new Error(`Frame evidence lightbox is missing ${token}.`)
}

if (!slotSource.includes('loading="eager"') || !slotSource.includes("fetchPriority={eager ? 'high' : 'auto'}")) {
  throw new Error('Frame archive images must not rely on lazy loading after the full landing preload gate.')
}

if (!slotSource.includes('--image-aspect') || !frameStyleSource.includes('aspect-ratio: var(--image-aspect')) {
  throw new Error('Archive slots must bind media boxes to the real image aspect ratio so captions stay attached to the visible photo.')
}

const requiredIntrinsicEditorialLayout = [
  'width: max-content',
  'translate: none',
  '--archive-slot-optical-y:',
  'calc(var(--slot-y, 0px) + var(--archive-slot-optical-y, 0px))',
  'border-left: 1px solid rgb(216 189 134 / 34%)',
  'radial-gradient(ellipse 82% 72% at 28% 50%',
  '--primary-width:',
  '--secondary-width:',
  '--detail-width:',
  '--support-width:',
  '.archive-slot--portrait .archive-slot__media',
  '.archive-slot--wide .archive-slot__media',
  '.archive-cluster--theme-building',
  '.archive-cluster--theme-cuisine',
  '.archive-cluster--theme-scenery',
  "[data-cluster='building-surface-memory']",
  "[data-cluster='building-skyline-weather']",
  "[data-cluster='building-night-current']",
]
const missingEditorialTokens = requiredIntrinsicEditorialLayout.filter((needle) => !frameStyleSource.includes(needle))
if (missingEditorialTokens.length > 0) {
  throw new Error(`Frame archive must keep intrinsic-ratio editorial strips: ${missingEditorialTokens.join(', ')}`)
}

if (frameStyleSource.includes('scale(var(--slot-scale') || frameStyleSource.includes('scale(calc(var(--slot-scale')) {
  throw new Error('Archive slot captions must not drift under scaled slot/media transforms; enlarge slots through layout.')
}

if (/\.archive-theme-section__track\s*\{[^}]*translate:\s*0\s+(?!0)/s.test(frameStyleSource)) {
  throw new Error('Frame capture tracks must stay vertically locked; move only bounded archive slots.')
}

if (frameStyleSource.includes('object-fit: cover')) {
  throw new Error('Frame archive images must preserve their source proportions; do not use object-fit: cover.')
}

if (frameStyleSource.includes('aspect-ratio: 16 / 10')) {
  throw new Error('Frame responsive layouts must never force portrait or scenery images into a 16 / 10 card shell.')
}

if (frameStyleSource.includes('inset: -92px -126px -128px -64px')) {
  throw new Error('Frame copy must remain rail-attached and must not restore the detached full-height black shield.')
}

console.log('[frame-architecture-guards] Frame composition, runtime hook, and slot DOM boundaries are separated.')
