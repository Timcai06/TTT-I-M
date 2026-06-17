import { existsSync, readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf8')
const heroSource = readFileSync('src/components/Hero.tsx', 'utf8')
const providerSource = readFileSync('src/components/ChapterStateProvider.tsx', 'utf8')
const navSource = readFileSync('src/components/Nav.tsx', 'utf8')
const navStyleSource = readFileSync('src/styles/components/nav.css', 'utf8')
const glitchTextStyleSource = readFileSync('src/styles/components/glitch-text.css', 'utf8')
const scrollIndicatorStyleSource = readFileSync('src/styles/components/scroll-indicator.css', 'utf8')
const scrollIndicatorSource = readFileSync('src/components/ScrollIndicator.tsx', 'utf8')
const themeDriverSource = readFileSync('src/components/ChapterThemeDriver.tsx', 'utf8')
const skillsSource = readFileSync('src/components/Skills.tsx', 'utf8')
const projectsSource = readFileSync('src/components/Projects.tsx', 'utf8')
const globalStyleSource = readFileSync('src/styles/global.css', 'utf8')
const footerStyleSource = readFileSync('src/styles/components/footer.css', 'utf8')
const footerSource = readFileSync('src/components/Footer.tsx', 'utf8')
const transitionSource = readFileSync('src/components/ChapterTransition.tsx', 'utf8')
const transitionTimelineSource = readFileSync('src/lib/timelines/transitionTimeline.ts', 'utf8')
const transitionApiSource = readFileSync('src/lib/chapterTransition.ts', 'utf8')
const scrollSource = readFileSync('src/lib/chapterScroll.ts', 'utf8')
const chapterScrollMetricsSource = readFileSync('src/lib/chapterScrollMetrics.ts', 'utf8')
const landingNarrativeSource = readFileSync('src/lib/landingScrollNarrative.ts', 'utf8')
const scrollFrameSchedulerSource = readFileSync('src/lib/scrollFrameScheduler.ts', 'utf8')

const consumers = [
  ['src/components/Nav.tsx', navSource],
]

if (!appSource.includes('<ChapterStateProvider>')) {
  throw new Error('App must wrap navigation UI in ChapterStateProvider.')
}

if (!providerSource.includes('useLandingScrollNarrative')) {
  throw new Error('ChapterStateProvider must derive activeId from the landing narrative subscription.')
}

if (existsSync('src/lib/useActiveChapter.ts')) {
  throw new Error('Legacy useActiveChapter hook must be removed; activeId now comes from landing narrative.')
}

if (existsSync('src/lib/chapterTheme.ts')) {
  throw new Error('Legacy chapterTheme facade must be removed; use pure chapterThemeTokens directly.')
}

if (!scrollIndicatorSource.includes('useLandingScrollNarrative')) {
  throw new Error('ScrollIndicator must consume the landing narrative state, not recompute scroll progress independently.')
}

if (scrollIndicatorSource.includes('useChapterState') || scrollIndicatorSource.includes('computeChapterProgressFills')) {
  throw new Error('ScrollIndicator must derive activeId and progress fills from landing narrative state.')
}

if (!scrollIndicatorSource.includes('activeId') || !scrollIndicatorSource.includes('section.id === activeId')) {
  throw new Error('ScrollIndicator must choose the active segment from narrative activeId so it stays aligned with Nav.')
}

if (!scrollIndicatorStyleSource.includes('transition: none;') || scrollIndicatorStyleSource.includes('transition: transform 0.1s')) {
  throw new Error('ScrollIndicator fill transform must not be CSS-transitioned; it should track scroll pixels directly.')
}

if (scrollIndicatorSource.includes('getBoundingClientRect')) {
  throw new Error('Active chapter consumers must not each read layout independently.')
}

if (
  !navSource.includes('StaggeredSectionMenu') ||
  !navSource.includes('nav__links') ||
  !navSource.includes("transitionToChapter(id, { updateHash: true })")
) {
  throw new Error('Nav must keep the existing top chapter links and use StaggeredSectionMenu only as an enhanced section-map overlay.')
}

if (!chapterScrollMetricsSource.includes('useSyncExternalStore') || !chapterScrollMetricsSource.includes('ScrollTrigger.create')) {
  throw new Error('Chapter scroll metrics must be a shared external store backed by one ScrollTrigger.')
}

if (!chapterScrollMetricsSource.includes('createScrollFrameScheduler') || !scrollFrameSchedulerSource.includes('if (frame !== 0) return')) {
  throw new Error('Chapter scroll metrics must keep one pending rAF during scroll instead of cancel/requeueing until scroll stops.')
}

if (!chapterScrollMetricsSource.includes('registeredIdSets') || !chapterScrollMetricsSource.includes('syncRegisteredIds')) {
  throw new Error('Chapter scroll metrics must union all subscriber chapter ids instead of letting consumers overwrite each other.')
}

if (!landingNarrativeSource.includes('pickActiveChapterId') || !landingNarrativeSource.includes('computeChapterProgressFills') || !landingNarrativeSource.includes('getChapterTheme')) {
  throw new Error('Landing narrative must derive active chapter, rail progress, and theme mix from the same rect snapshot.')
}

if (!themeDriverSource.includes('useLandingScrollNarrative') || themeDriverSource.includes('useChapterState') || themeDriverSource.includes('applyChapterTheme')) {
  throw new Error('ChapterThemeDriver must scrub --bg from landing narrative state instead of tweening after activeId changes.')
}

if (!appSource.includes('<ChapterTransition />')) {
  throw new Error('App must mount the full-screen chapter transition layer.')
}

if (!appSource.includes("getStage() === 'live'") || !appSource.includes('scrollToChapter(hash, { immediate: true })') || !appSource.includes('for (const delay of [120, 520, 1100])')) {
  throw new Error('Initial hash deep links must wait for the live stage and reassert the immediate chapter landing after late layout shifts.')
}

if (!transitionSource.includes('onChapterTransitionRequest') || !transitionSource.includes('immediate: true')) {
  throw new Error('ChapterTransition must listen for nav requests and jump directly while the cover is active.')
}

const transitionLayerInputs = [
  'chapter-transition__wave-lead',
  'chapter-transition__wave-main',
  'chapter-transition__grain',
  'GlitchText',
  'chapter-transition__target-glitch',
  'chapter-transition__target-glyph',
  'usePretextTextInteraction',
  'waveBandPath',
]

const transitionContractSource = `${transitionSource}\n${transitionTimelineSource}`
const missingTransitionLayerInputs = transitionLayerInputs.filter((needle) => !transitionContractSource.includes(needle))
if (missingTransitionLayerInputs.length > 0) {
  throw new Error(`ChapterTransition is missing layered transition affordances: ${missingTransitionLayerInputs.join(', ')}`)
}

if (transitionSource.includes('chapter-transition__nav') || navStyleSource.includes('chapter-transition__item-char')) {
  throw new Error('ChapterTransition must stay cover-only and not reintroduce the chapter menu overlay.')
}

// The old shutter skin carried a full-screen blur aura — the single most
// expensive layer in the transition. The wave skin removed it; keep it out.
if (transitionContractSource.includes('__aura') || transitionContractSource.includes('__shutter')) {
  throw new Error('ChapterTransition must not reintroduce the shutter/aura layers (replaced by the wave cover, 2026-06-12).')
}

if (transitionTimelineSource.includes("document.querySelector('main')") || transitionTimelineSource.includes('document.querySelector(\"main\")')) {
  throw new Error('Chapter transition timeline must not animate the global main layout.')
}

if (!glitchTextStyleSource.includes('@keyframes chapter-glitch') || !glitchTextStyleSource.includes('.glitch-text:not(.enable-on-hover)::after')) {
  throw new Error('Chapter transition target name must keep the React Bits glitch-text CSS skin.')
}

if (!transitionContractSource.includes('CHAPTER_TRANSITION_TARGET_GLITCH_SECONDS') || !glitchTextStyleSource.includes('--glitch-iteration-count, infinite')) {
  throw new Error('Chapter transition glitch text must stay duration-synced to the target reveal window.')
}

// All chapter jumps flow through the one typed bus (transitionToChapter →
// onChapterTransitionRequest, dispatchChapterArrived → onChapterArrived).
// The transport is module-internal listener sets (same pattern as lib/stage.ts);
// reintroducing window CustomEvents would bring back the stringly-typed global
// channel this replaced (2026-06-12).
for (const member of ['transitionToChapter', 'onChapterTransitionRequest', 'dispatchChapterArrived', 'onChapterArrived']) {
  if (!transitionApiSource.includes(member)) {
    throw new Error(`Chapter transition bus must keep its ${member} surface.`)
  }
}
if (transitionApiSource.includes('CustomEvent') || transitionApiSource.includes('dispatchEvent')) {
  throw new Error('Chapter transition bus must stay a typed in-module emitter, not window CustomEvents.')
}

if (!scrollSource.includes('immediate?: boolean')) {
  throw new Error('chapterScroll must support immediate section jumps for transition-covered navigation.')
}

if (!heroSource.includes('onChapterArrived') || !heroSource.includes('pretextRefreshKey') || !heroSource.includes('heroTitleReady') || !heroSource.includes('heroPretextEnabled')) {
  throw new Error('Hero must recalibrate its title and Pretext interaction after returning to the index chapter.')
}

if (
  !footerStyleSource.includes('visibility: hidden') ||
  !footerStyleSource.includes('opacity: 0') ||
  !footerSource.includes('updateBlobVisibility') ||
  !footerSource.includes('getBoundingClientRect') ||
  !footerSource.includes('progress > 0.001')
) {
  throw new Error('Footer liquid blob must keep a real-position visibility gate.')
}

if (footerSource.includes('isDirectContactEntry') || footerSource.includes('directContactEntry')) {
  throw new Error('Footer must not bypass the liquid iris reveal based on the URL hash; direct deep-link stability belongs to App scroll restoration.')
}

if (globalStyleSource.includes('transform: translateZ(0); /* Force GPU composite layer */')) {
  throw new Error('Global composite helpers must not overwrite component transform baselines; use will-change/backface only.')
}

if (
  !skillsSource.includes('const revealTimers: number[] = []') ||
  !skillsSource.includes('window.clearTimeout(timer)')
) {
  throw new Error('Skills reveal timers must be tracked and cleared on cleanup to avoid delayed class writes after unmount/HMR.')
}

if (
  projectsSource.includes("document.querySelectorAll<HTMLElement>('.project-card')") ||
  !projectsSource.includes("root.current?.querySelectorAll<HTMLElement>('.project-card')")
) {
  throw new Error('Projects must scope project-card DOM writes to its root section, not document-wide queries.')
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
