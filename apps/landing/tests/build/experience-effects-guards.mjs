import { existsSync, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const read = (path) => readFileSync(path, 'utf8')
const required = [
  'src/components/BorderGlow.tsx',
  'src/components/ASCIIText.tsx',
  'src/components/DriftWall.tsx',
  'src/components/WorkTransition.tsx',
  'src/components/frame/FrameParticleHandoff.tsx',
  'src/components/MaskedHeading.tsx',
  'src/components/ScrollExpand.tsx',
  'src/components/SciScopeFilm.tsx',
  'src/lib/sound/SoundProvider.tsx',
  'src/lib/canvas-ui/particleScroll.ts',
  'src/lib/canvas-ui/particleScrollConfig.ts',
  'src/lib/canvas-ui/vendor/ParticleScroll/ParticleScrollVanilla.ts',
  'src/shaders/liquid-metal-button/LiquidMetalButton.tsx',
  'src/shaders/liquid-metal-button/liquid-metal-button.html',
  'src/shaders/spark-badge/SparkBadge.tsx',
  'src/shaders/spark-badge/spark-badge.html',
  'src/shaders/spark-badge/spark-badge-portfolio.html',
  'public/projects/sciscope/sciscope-concept-film.mp4',
  'public/projects/sciscope/sciscope-film-poster.jpg',
  'public/projects/sciscope/sciscope-soundtrack.mp3',
]

for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing source-backed experience component: ${path}`)
}

const app = read('src/App.tsx')
const life = read('src/components/LifeGallery.tsx')
const driftWall = read('src/components/DriftWall.tsx')
const frame = read('src/components/Frame.tsx')
const frameParticles = read('src/components/frame/FrameParticleHandoff.tsx')
const frameParticleRuntime = [
  'src/lib/canvas-ui/particleScroll.ts',
  'src/lib/canvas-ui/particleScrollConfig.ts',
].map(read).join('\n')
const frameParticleVendor = read('src/lib/canvas-ui/vendor/ParticleScroll/ParticleScrollVanilla.ts')
const frameStyle = read('src/styles/components/frame.css')
const projects = [
  'src/chapters/projects/Projects.tsx',
  'src/chapters/projects/ProjectsIntro.tsx',
  'src/chapters/projects/ProjectsBento.tsx',
  'src/chapters/projects/useProjectsNarrative.ts',
].map(read).join('\n')
const projectLaser = read('src/components/ProjectLaser.tsx')
const laserRuntime = read('src/lib/canvas-ui/laser.ts')
const laserConfig = read('src/lib/canvas-ui/laserConfig.ts')
const laserVendor = read('src/lib/canvas-ui/vendor/Laser/LaserVanilla.ts')
const maskedHeading = read('src/components/MaskedHeading.tsx')
const scrollExpand = read('src/components/ScrollExpand.tsx')
const scrollExpandStyle = read('src/styles/components/scroll-expand.css')
const footer = [
  'src/chapters/contact/Footer.tsx',
  'src/chapters/contact/useFooterReveal.ts',
].map(read).join('\n')
const footerLiquid = read('src/components/FooterLiquidCursor.tsx')
const liquidRuntime = read('src/lib/canvas-ui/liquidField.ts')
const liquidVendor = read('src/lib/canvas-ui/vendor/Liquid/LiquidVanilla.ts')
const workTransition = read('src/components/WorkTransition.tsx')
const workTransitionStyle = read('src/styles/components/work-transition.css')
const liquidMetalButton = read('src/shaders/liquid-metal-button/LiquidMetalButton.tsx')
const sciScopeFilm = read('src/components/SciScopeFilm.tsx')
const sciScopeFilmStyle = read('src/styles/components/sciscope-film.css')
const soundProvider = read('src/lib/sound/SoundProvider.tsx')
const globalStyle = read('src/styles/global.css')
const nav = read('src/components/Nav.tsx')
const loader = read('src/components/Loader.tsx')
const registry = read('src/chapters/registry.ts')
const landingProjects = read('src/data/projects.ts')
const studioContent = read('../studio/content/index.ts')

if (/ParticleContinuum|lib\/continuum/.test(app) || existsSync('src/lib/continuum/ParticleContinuum.tsx')) {
  throw new Error('The retired global Particle Continuum must not remain in the Landing runtime.')
}

if (!workTransition.includes('variant="browser"') || !workTransition.includes('LiquidMetalButton')) {
  throw new Error('The Stack → Work bridge must use the Spark browser variant and one Liquid Metal CTA.')
}
if (!workTransition.includes('useReducedMotion') || !workTransition.includes('controlsForProgress') || !workTransition.includes('ctaMounted')) {
  throw new Error('The Stack → Work bridge must retain reduced-motion and scroll-driven particle controls.')
}
if (!workTransition.includes('spark-badge-portfolio.html?url')) {
  throw new Error('The portfolio must use its budgeted Spark scene while preserving the canonical source beside it.')
}
if (!workTransitionStyle.includes('height: var(--work-transition-height-desktop)') || !workTransitionStyle.includes('height: var(--work-transition-height-mobile)')) {
  throw new Error('The Stack → Work bridge must retain its measured desktop/mobile narrative space.')
}
if (!/\.work-transition__sticky\s*\{[^}]*position:\s*sticky/s.test(workTransitionStyle)) {
  throw new Error('WorkTransition must keep its visual stage section-bound with native sticky positioning.')
}
if (!/\.work-transition\s*\{[^}]*overflow:\s*clip/s.test(workTransitionStyle)) {
  throw new Error('WorkTransition must clip its renderer to the chapter boundary.')
}
if (!/overflow-x:\s*clip/.test(globalStyle)) {
  throw new Error('The document must crop horizontally without creating a sticky-breaking scroll container.')
}
for (const earlyPinToken of ["pin: '.work-transition__sticky'", 'pinSpacing:', 'anticipatePin:']) {
  if (workTransition.includes(earlyPinToken)) {
    throw new Error(`WorkTransition must not let ScrollTrigger detach its stage from the chapter: ${earlyPinToken}`)
  }
}
for (const needle of ['addTrackedPhase', 'work-transition__phase-content', '{ y: 72, autoAlpha: 0 }', 'scrub: mobile ? 0.25 : 0.32', 'rendering="colored"']) {
  if (!workTransition.includes(needle)) throw new Error(`WorkTransition must preserve its scroll-tracked narrative treatment: ${needle}`)
}
for (const retiredToken of ['snap:', 'yPercent:', 'work-transition__reveal']) {
  if (workTransition.includes(retiredToken) || workTransitionStyle.includes(retiredToken)) {
    throw new Error(`WorkTransition must not restore fragmented snap/reveal choreography: ${retiredToken}`)
  }
}
if (!workTransitionStyle.includes('.work-transition__cta-shell') || !workTransition.includes('work-transition__cta-shell')) {
  throw new Error('The Liquid Metal CTA must keep layout positioning separate from its GSAP animation layer.')
}
for (const retiredToken of ['work-transition__product', '/projects/educanvas/home.webp', 'educanvas.local', 'EduCanvas /']) {
  if (workTransition.includes(retiredToken) || workTransitionStyle.includes(retiredToken)) {
    throw new Error(`WorkTransition must not restore its retired product screenshot treatment: ${retiredToken}`)
  }
}
if (!/\.work-transition__spark\s*\{[^}]*pointer-events:\s*none/s.test(workTransitionStyle)) {
  throw new Error('The decorative Spark iframe must not intercept wheel input.')
}
if (workTransitionStyle.includes('mask-image: radial-gradient(ellipse 72% 76%')) {
  throw new Error('The Liquid Metal CTA bloom must not be clipped by the retired radial mask.')
}
for (const token of ['media="print"', 'bridge-ready', 'pointer-bridge', 'portfolio:iframe-pointer', 'syncPendingFrame', 'escapeHtml(safeText)']) {
  if (!liquidMetalButton.includes(token)) throw new Error(`Liquid Metal runtime must avoid a blank font-blocked entrance: ${token}`)
}
if (workTransition.includes('cursorLabel=')) {
  throw new Error('The Liquid Metal CTA animation must carry focus without a competing cursor label.')
}
for (const copy of ['A stack is still', 'Connect the parts.', 'Six projects.', '我在哪些地方停住']) {
  if (!workTransition.includes(copy)) throw new Error(`WorkTransition must keep its concrete humanized narrative: ${copy}`)
}
if (/work-transition__edge/.test(workTransition) || /work-transition__edge/.test(workTransitionStyle)) {
  throw new Error('The retired Stack → Work edge gradients must not return.')
}
for (const needle of ['WORK_GATE_PROGRESS', "data-gate={gateLocked ? 'locked' : 'open'}", 'Click to continue', 'dispatchWorkHandoff', 'enterWork']) {
  if (!workTransition.includes(needle)) throw new Error(`WorkTransition must preserve its deliberate Liquid Metal handoff: ${needle}`)
}
for (const gateToken of ['preventForwardScroll', 'preventForwardKey', 'gateLockedRef', 'event.deltaY <= 0']) {
  if (!workTransition.includes(gateToken)) throw new Error(`WorkTransition must clamp forward input while preserving reverse travel: ${gateToken}`)
}
if (workTransition.includes('lenis.stop()')) {
  throw new Error('WorkTransition must not freeze reverse scrolling at its one-way project gate.')
}
if (/\.disable-hover\s*\{[^}]*pointer-events\s*:\s*none/s.test(globalStyle)) {
  throw new Error('Scroll performance markers must not disable Archive pointer hit-testing globally.')
}

if (!projects.includes("project.id === 'sciscope'") || !projects.includes('<SciScopeFilm />')) {
  throw new Error('SciScopeFilm must remain directly after the normal SciScope project card.')
}
for (const token of ['projects__intro', 'ProjectLaser', 'setScrollActivity', 'WORK_HANDOFF_EVENT', 'consumePendingWorkHandoff', 'laserActive']) {
  if (!projects.includes(token)) throw new Error(`Projects laser intro is missing ${token}.`)
}
if (projects.includes('--laser-progress')) {
  throw new Error('Project Laser must respond to the CTA handoff rather than becoming a persistent scroll overlay.')
}
for (const token of ['speed: 0.3', 'offset: 140', 'thickness: 6', 'width: 0.68', 'reveal: 400', 'shimmer: 12', 'reactivity: 1', 'html-canvas', 'beam-fallback']) {
  if (!laserRuntime.includes(token) && !laserConfig.includes(token) && !projectLaser.includes(token)) {
    throw new Error(`Project Laser must retain ${token}.`)
  }
}
for (const token of ['projects__intro-content', 'captureRef', 'lastPreview', 'endTrigger: lastPreview', 'bottom bottom-=', 'syncPortal', 'clipPath', 'progress >= 0.995', 'onLeave: finishPortal', 'onLeaveBack: finishPortal']) {
  if (!projects.includes(token) && !projectLaser.includes(token)) {
    throw new Error(`Project Laser redline handoff must retain ${token}.`)
  }
}
for (const token of ['drawElementImage', 'uRevealH', 'uShimmer', 'uSparkle', 'setScrollActivity']) {
  if (!laserVendor.includes(token)) throw new Error(`Vendored Canvas UI Laser must retain ${token}.`)
}
for (const forbidden of ['WheelEvent', 'lenis.stop()', 'overflow: scroll']) {
  if (projectLaser.includes(forbidden) || laserRuntime.includes(forbidden)) {
    throw new Error(`Project Laser must not create a scroll gate: ${forbidden}`)
  }
}

for (const token of ['FrameParticleHandoff', 'lazy(loadFrameParticleHandoff)', 'frame-particle-handoff--loading']) {
  if (!frame.includes(token)) throw new Error(`Frame → Stack particle handoff is missing ${token}.`)
}
for (const token of ['setScrollState', 'data-frame-particles', 'data-frame-particle-capture', 'markDrawableSubtree', 'canAcquireOptionalSurface', 'releaseContext', "start: 'top top'", "end: 'bottom bottom'"]) {
  if (!frameParticles.includes(token)) throw new Error(`Frame Particle Scroll lifecycle must retain ${token}.`)
}
for (const token of ['point: 0.68', 'band: 420', 'density: 2', 'size: 1.25', 'spread: 220', 'gravity: 0.35', 'drift: 0.7', 'swirl: 60', 'settle: 1.2', 'smoothing: 0.6', 'canRenderFrameParticles']) {
  if (!frameParticleRuntime.includes(token)) throw new Error(`Frame Particle Scroll adapter must retain ${token}.`)
}
for (const token of ['POINT_VERT', 'BASE_FRAG', 'setScrollState', 'content.scrollTop =', 'drawElementImage', 'deleteVertexArray']) {
  if (!frameParticleVendor.includes(token)) throw new Error(`Vendored Canvas UI Particle Scroll must retain ${token}.`)
}
for (const token of ['height: 210svh', 'position: sticky', '.frame-particle-document__contact', '.frame-particle-document__bridge', 'scrollbar-width: none', '(prefers-reduced-motion: reduce)']) {
  if (!frameStyle.includes(token)) throw new Error(`Frame Particle Scroll fallback must retain ${token}.`)
}
for (const forbidden of ['externalProgress', '--particle-front', 'mask-image:', 'frame-particle-handoff__dust', 'frame-particle-handoff__signal']) {
  if (frameParticleVendor.includes(forbidden) || frameParticles.includes(forbidden) || frameStyle.includes(forbidden)) {
    throw new Error(`Frame Particle Scroll must not retain the rejected hybrid renderer: ${forbidden}`)
  }
}
for (const forbidden of ['WheelEvent', 'KeyboardEvent', 'lenis.stop()', 'overflow: scroll']) {
  if (frameParticles.includes(forbidden) || frameParticleRuntime.includes(forbidden)) {
    throw new Error(`Frame Particle Scroll must remain native-scroll driven: ${forbidden}`)
  }
}

for (const token of ['FooterLiquidCursor', 'progress > 0.88', 'is-over-footer']) {
  if (!footer.includes(token)) throw new Error(`Footer liquid cursor is missing ${token}.`)
}
for (const token of ['position: fixed', 'height: 100svh', 'pointer-events: none', 'mix-blend-mode: multiply']) {
  if (!read('src/styles/components/footer.css').includes(token)) {
    throw new Error(`Footer liquid layer must keep ${token}.`)
  }
}
for (const token of ['force: 0.62', 'pressureIterations: 3', 'simResolution: 96', 'dyeResolution: 256', 'rainbow: false']) {
  if (!liquidRuntime.includes(token)) throw new Error(`Footer liquid field must retain ${token}.`)
}
for (const token of ['FRAG_DIVERGENCE', 'FRAG_CURL', 'FRAG_VORTICITY', 'FRAG_PRESSURE', 'FRAG_GRADIENT', 'captureContent']) {
  if (!liquidVendor.includes(token)) throw new Error(`Vendored Canvas UI Liquid must retain ${token}.`)
}
for (const token of ['canAcquireOptionalSurface', 'releaseContext', 'visibilitychange']) {
  if (!footerLiquid.includes(token)) throw new Error(`Footer liquid lifecycle must retain ${token}.`)
}
for (const token of ['<ScrollExpand', 'useWindowScroll={!mobile}', 'enabled={!mobile && !reducedMotion}', 'sciscope-film-poster.jpg', 'preload="metadata"', 'controls', 'enterFilmMode', 'setEnabled(true)']) {
  if (!sciScopeFilm.includes(token)) throw new Error(`SciScopeFilm entrance is missing ${token}.`)
}
for (const retiredToken of ['ScrollTrigger', 'useGSAP', 'resolveSciScopePlayback', 'sciscope-film__evidence', 'sciscope-film__story', 'currentTime = target']) {
  if (sciScopeFilm.includes(retiredToken)) throw new Error(`SciScopeFilm must not retain scroll-scrub storytelling: ${retiredToken}`)
}
for (const token of ['getBoundingClientRect().top', 'gsap.quickTo', 'ScrollTrigger.create', 'paused: true', 'readProgress']) {
  if (!scrollExpand.includes(token)) throw new Error(`ScrollExpand is missing its live-position GSAP driver: ${token}`)
}
if (scrollExpand.includes('trigger: trackNode') || scrollExpand.includes("start: 'top top'")) {
  throw new Error('ScrollExpand must not bind progress to stale one-time track coordinates.')
}
if (!/\.scroll-expand__stage\s*\{[^}]*position:\s*sticky/s.test(scrollExpandStyle)) {
  throw new Error('ScrollExpand must keep its stage section-bound with native sticky positioning.')
}
if (!sciScopeFilmStyle.includes('aspect-ratio: 16 / 9') || sciScopeFilmStyle.includes('height: 760svh')) {
  throw new Error('SciScopeFilm must keep the original film unscripted inside its sound-enabled dialog.')
}
if (!sciScopeFilmStyle.includes('100dvh - 86px') || !sciScopeFilmStyle.includes('100dvh - 32px')) {
  throw new Error('SciScopeFilm must reserve viewport height for both its title bar and safe-area margins.')
}
if (!app.includes('SoundProvider') || !nav.includes('aria-pressed={soundEnabled}')) {
  throw new Error('The global opt-in sound provider and accessible nav toggle must remain wired.')
}
for (const requiredSoundToken of ['MASTER_GAIN = 0.28', 'FADE_SECONDS = 0.18', 'visibilitychange', 'AudioBufferSourceNode']) {
  if (!soundProvider.includes(requiredSoundToken)) throw new Error(`SoundProvider is missing ${requiredSoundToken}.`)
}
if (/sciscope-concept-film|sciscope-soundtrack/.test(loader)) {
  throw new Error('SciScope film/audio must not enter the critical Loader manifest.')
}

const filmBytes = statSync('public/projects/sciscope/sciscope-concept-film.mp4').size
const soundtrackBytes = statSync('public/projects/sciscope/sciscope-soundtrack.mp3').size
if (filmBytes > 5_500_000) throw new Error(`SciScope film exceeds 5.5 MB: ${filmBytes}`)
if (soundtrackBytes > 700_000) throw new Error(`SciScope soundtrack exceeds 700 KB: ${soundtrackBytes}`)
const sparkPortfolio = read('src/shaders/spark-badge/spark-badge-portfolio.html')
if (!sparkPortfolio.includes("set('particleAmount', 0.08, 1.4)")) {
  throw new Error('The portfolio Spark adapter must retain its controllable chapter-density range.')
}
const skillsIndex = registry.indexOf("id: 'skills'")
const transitionIndex = registry.indexOf("id: 'work-transition'")
const projectsIndex = registry.indexOf("id: 'projects'")
if (!(skillsIndex < transitionIndex && transitionIndex < projectsIndex)) {
  throw new Error('The navless work transition must remain between Stack and Work.')
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const canonicalScenes = {
  'src/shaders/liquid-metal-button/liquid-metal-button.html': '76624e881a3aecbd79b473d9c51f53c7157d47052abd0f9dc28fefd223b0a819',
  'src/shaders/spark-badge/spark-badge.html': 'a8eefdee0d87deefae9b8b8dac4d79c0ee41447578a78090cad9c956e33ccf90',
}
for (const [path, expected] of Object.entries(canonicalScenes)) {
  const actual = sha256(path)
  if (actual !== expected) throw new Error(`${path} drifted from the approved ThreeUI source: ${actual}`)
}

for (const [source, component, owner] of [
  [life, 'DriftWall', 'Life'],
  [projects, 'BorderGlow', 'Projects'],
  [footer, 'ASCIIText', 'Contact'],
]) {
  if (!source.includes(component)) throw new Error(`${owner} must mount ${component}.`)
}

for (const token of ['MaskedHeading', 'sources={headingSources}', 'emphasis="I made"', 'parallax={18}', 'reveal="wipe"']) {
  if (!projects.includes(token)) throw new Error(`Work heading must preserve its project-media mask treatment: ${token}`)
}
for (const token of ['useGSAP', 'useReducedMotion', '<mask', '<foreignObject', "mediaType === 'video'", 'once: true']) {
  if (!maskedHeading.includes(token)) throw new Error(`MaskedHeading is missing its accessible live-media implementation: ${token}`)
}

if (
  !life.includes('columns={mobile ? 3 : 7}') ||
  !life.includes('tileWidth={mobile ? 154 : 188}') ||
  !life.includes('tilt={mobile ? 8 : 11}') ||
  !life.includes('turn={mobile ? -8 : -7}') ||
  !life.includes('dim={0.66}') ||
  !life.includes('overlayColor="#000000"')
) {
  throw new Error('Life archive must keep its seven-column equal-width desktop composition.')
}
for (const token of ['Math.min(safeItems.length, 5)', 'column * 5 + slot * 3', 'TONE_SEQUENCE', 'toneBuckets', "'data-tone'", "'--dw-card-position'"]) {
  if (!driftWall.includes(token)) throw new Error(`DriftWall must preserve varied equal-width image distribution: ${token}`)
}
if (driftWall.includes("'--dw-card-w'")) {
  throw new Error('DriftWall must not reintroduce per-card width variance.')
}

if (!landingProjects.includes('landingPortfolioProjects')) {
  throw new Error('Landing must consume its EduCanvas-specific curated project list.')
}
if (!studioContent.includes('portfolioProjects') || studioContent.includes('landingPortfolioProjects')) {
  throw new Error('Studio must remain on its existing portfolioProjects catalogue this round.')
}

console.log('[experience-effects-guards] source-backed effects are chapter-scoped; canonical ThreeUI scenes are verified; Continuum and project PixelTransition are retired; Studio is isolated.')
