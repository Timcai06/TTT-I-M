import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf8')
const heroSource = readFileSync('src/components/Hero.tsx', 'utf8')
const providerSource = readFileSync('src/components/ChapterStateProvider.tsx', 'utf8')
const navSource = readFileSync('src/components/Nav.tsx', 'utf8')
const navStyleSource = readFileSync('src/styles/components/nav.css', 'utf8')
const scrollIndicatorSource = readFileSync('src/components/ScrollIndicator.tsx', 'utf8')
const transitionSource = readFileSync('src/components/ChapterTransition.tsx', 'utf8')
const transitionApiSource = readFileSync('src/lib/chapterTransition.ts', 'utf8')
const scrollSource = readFileSync('src/lib/chapterScroll.ts', 'utf8')
const activeChapterSource = readFileSync('src/lib/useActiveChapter.ts', 'utf8')
const chapterScrollMetricsSource = readFileSync('src/lib/chapterScrollMetrics.ts', 'utf8')

const consumers = [
  ['src/components/Nav.tsx', navSource],
  ['src/components/ScrollIndicator.tsx', scrollIndicatorSource],
]

if (!appSource.includes('<ChapterStateProvider>')) {
  throw new Error('App must wrap navigation UI in ChapterStateProvider.')
}

if (!providerSource.includes('useActiveChapter')) {
  throw new Error('ChapterStateProvider must own the active chapter subscription.')
}

if (!activeChapterSource.includes('useChapterScrollMetrics') || !scrollIndicatorSource.includes('useChapterScrollMetrics')) {
  throw new Error('Active chapter and scroll indicator must share the same chapter scroll metrics source.')
}

if (activeChapterSource.includes('getBoundingClientRect') || scrollIndicatorSource.includes('getBoundingClientRect')) {
  throw new Error('Active chapter consumers must not each read layout independently.')
}

if (!chapterScrollMetricsSource.includes('useSyncExternalStore') || !chapterScrollMetricsSource.includes('ScrollTrigger.create')) {
  throw new Error('Chapter scroll metrics must be a shared external store backed by one ScrollTrigger.')
}

if (!appSource.includes('<ChapterTransition />')) {
  throw new Error('App must mount the full-screen chapter transition layer.')
}

if (!transitionSource.includes('onChapterTransitionRequest') || !transitionSource.includes('immediate: true')) {
  throw new Error('ChapterTransition must listen for nav requests and jump directly while the cover is active.')
}

const transitionLayerInputs = [
  'TransitionField',
  "import('three')",
  'chapter-transition__target-glyph',
  'chapter-transition__item-char',
  'usePretextTextInteraction',
]

const missingTransitionLayerInputs = transitionLayerInputs.filter((needle) => !transitionSource.includes(needle))
if (missingTransitionLayerInputs.length > 0) {
  throw new Error(`ChapterTransition is missing layered transition affordances: ${missingTransitionLayerInputs.join(', ')}`)
}

if (transitionSource.includes('chapter-transition__svg') || navStyleSource.includes('chapter-transition__svg')) {
  throw new Error('ChapterTransition must not reintroduce extra SVG line segments.')
}

if (!navStyleSource.includes('border-bottom: 1px solid transparent')) {
  throw new Error('Chapter transition chapter rows must not draw non-target divider lines.')
}

if (!transitionApiSource.includes('portfolio:chapter-transition') || !transitionApiSource.includes('portfolio:chapter-arrived')) {
  throw new Error('Chapter transition requests must use the shared chapter transition event.')
}

if (!scrollSource.includes('immediate?: boolean')) {
  throw new Error('chapterScroll must support immediate section jumps for transition-covered navigation.')
}

if (!heroSource.includes('onChapterArrived') || !heroSource.includes('pretextRefreshKey') || !heroSource.includes('heroTitleReady') || !heroSource.includes('heroPretextEnabled')) {
  throw new Error('Hero must recalibrate its title and Pretext interaction after returning to the index chapter.')
}

const directActiveReaders = consumers
  .filter(([, source]) => source.includes('useActiveChapter'))
  .map(([file]) => file)

if (directActiveReaders.length > 0) {
  throw new Error(`Navigation consumers must not read active chapter directly: ${directActiveReaders.join(', ')}`)
}

const missingContextConsumers = consumers
  .filter(([, source]) => !source.includes('useChapterState'))
  .map(([file]) => file)

if (missingContextConsumers.length > 0) {
  throw new Error(`Navigation consumers must use shared chapter state: ${missingContextConsumers.join(', ')}`)
}

console.log('[chapter-state-guards] navigation uses one shared chapter state provider.')
