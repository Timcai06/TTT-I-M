import { existsSync, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const read = (path) => readFileSync(path, 'utf8')
const required = [
  'src/components/BorderGlow.tsx',
  'src/components/ASCIIText.tsx',
  'src/components/DriftWall.tsx',
  'src/components/WorkTransition.tsx',
  'src/components/frame/FrameParticleHandoff.tsx',
  'src/components/ParticlePortal.tsx',
  'src/components/MaskedHeading.tsx',
  'src/components/ScrollExpand.tsx',
  'src/components/SciScopeFilm.tsx',
  'src/lib/sound/SoundProvider.tsx',
  'src/lib/sound/SoundContext.ts',
  'src/lib/canvas-ui/particleScroll.ts',
  'src/lib/canvas-ui/particleScrollConfig.ts',
  'src/lib/canvas-ui/particlePortal.ts',
  'src/lib/canvas-ui/particlePortalMath.ts',
  'src/lib/canvas-ui/vendor/ParticleScroll/ParticleScrollVanilla.ts',
  'src/lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla.ts',
  'src/lib/canvas-ui/vendor/Glass/GlassVanilla.ts',
  'src/components/effects/CanvasUiHtmlSurface.tsx',
  'src/components/effects/AboutDecryptReveal.tsx',
  'src/components/effects/ProjectGlassSurface.tsx',
  'src/lib/canvas-ui/canvasSurfaceSlots.ts',
  'src/lib/canvas-ui/workGlassCoordinator.ts',
  'src/lib/canvas-ui/vendor/Glass/viewportGeometry.ts',
  'src/lib/pointerCoordinator.ts',
  'src/shaders/liquid-metal-button/LiquidMetalButton.tsx',
  'src/shaders/liquid-metal-button/liquidMetalAdapter.ts',
  'src/shaders/liquid-metal-button/liquid-metal-button.html',
  'src/shaders/spark-badge/SparkBadge.tsx',
  'src/shaders/spark-badge/sparkBadgeSource.ts',
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
const cursor = read('src/components/Cursor.tsx')
const pointerCoordinator = read('src/lib/pointerCoordinator.ts')
const life = read('src/components/LifeGallery.tsx')
const driftWall = read('src/components/DriftWall.tsx')
const frame = read('src/components/Frame.tsx')
const archiveThemeScroll = read('src/components/frame/useArchiveThemeScroll.ts')
const frameParticles = read('src/components/frame/FrameParticleHandoff.tsx')
const frameParticleRuntime = [
  'src/lib/canvas-ui/particleScroll.ts',
  'src/lib/canvas-ui/particleScrollConfig.ts',
].map(read).join('\n')
const frameParticleVendor = read('src/lib/canvas-ui/vendor/ParticleScroll/ParticleScrollVanilla.ts')
const particlePortal = read('src/components/ParticlePortal.tsx')
const particlePortalRuntime = read('src/lib/canvas-ui/particlePortal.ts')
const frameStyle = read('src/styles/components/frame.css')
const projects = [
  'src/chapters/projects/Projects.tsx',
  'src/chapters/projects/ProjectsIntro.tsx',
  'src/chapters/projects/ProjectsBento.tsx',
  'src/chapters/projects/useProjectsNarrative.ts',
].map(read).join('\n')
const projectsIntroStyle = read('src/chapters/projects/styles/intro-bento.css')
const projectsCardStyle = read('src/chapters/projects/styles/card-media.css')
const projectLaser = read('src/components/ProjectLaser.tsx')
const laserRuntime = read('src/lib/canvas-ui/laser.ts')
const laserConfig = read('src/lib/canvas-ui/laserConfig.ts')
const laserVendor = read('src/lib/canvas-ui/vendor/Laser/LaserVanilla.ts')
const about = read('src/components/About.tsx')
const aboutStyle = read('src/styles/components/about.css')
const canvasHtmlSurface = read('src/components/effects/CanvasUiHtmlSurface.tsx')
const canvasHtmlStyle = read('src/styles/components/canvas-ui-surfaces.css')
const decryptSurface = read('src/components/effects/AboutDecryptReveal.tsx')
const decryptConfig = read('src/lib/canvas-ui/decryptRevealConfig.ts')
const decryptVendor = read('src/lib/canvas-ui/vendor/DecryptReveal/DecryptRevealVanilla.ts')
const glassSurface = read('src/components/effects/ProjectGlassSurface.tsx')
const glassConfig = read('src/lib/canvas-ui/glassConfig.ts')
const glassVendor = read('src/lib/canvas-ui/vendor/Glass/GlassVanilla.ts')
const workGlassCoordinator = read('src/lib/canvas-ui/workGlassCoordinator.ts')
const canvasSurfaceSlots = read('src/lib/canvas-ui/canvasSurfaceSlots.ts')
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
const liquidMetalButton = [
  'src/shaders/liquid-metal-button/LiquidMetalButton.tsx',
  'src/shaders/liquid-metal-button/liquidMetalAdapter.ts',
].map(read).join('\n')
const sparkBadgeSource = read('src/shaders/spark-badge/sparkBadgeSource.ts')
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

for (const token of ['onParticlePortalRequest', "tryAcquireOptionalContext('particle-portal')", 'contextLease.release()', 'visibilitychange', 'waitForTarget', 'commitPromise ??=']) {
  if (!particlePortal.includes(token)) throw new Error(`Particle Portal lifecycle is missing ${token}.`)
}
for (const token of ["document.createElement('canvas')", 'root.append(canvas)', 'canvas.remove()', 'canvasRef.current = null']) {
  if (!particlePortal.includes(token)) throw new Error(`Particle Portal transient Canvas contract is missing ${token}.`)
}
if (/<canvas\s+className="particle-portal__canvas"/.test(particlePortal)) {
  throw new Error('Particle Portal must not keep an idle page-level Canvas in its React tree.')
}
for (const token of ['uSourceRect', 'uTargetRect', 'uSourceUv', 'uTargetUv', 'gl.drawArrays(gl.POINTS', 'measureImagePlacement']) {
  if (!particlePortalRuntime.includes(token)) throw new Error(`Particle Portal runtime is missing ${token}.`)
}
if (!frame.includes('particleNavigation') || !projects.includes('requestParticlePortal')) {
  throw new Error('Frame and Projects must both route their explicit media transitions through Particle Portal.')
}

if (!workTransition.includes('variant="browser"') || !workTransition.includes('LiquidMetalButton')) {
  throw new Error('The Stack → Work bridge must use the Spark browser variant and one Liquid Metal CTA.')
}
if (!workTransition.includes('useReducedMotion') || !workTransition.includes('controlsForProgress') || !workTransition.includes('ctaMounted')) {
  throw new Error('The Stack → Work bridge must retain reduced-motion and scroll-driven particle controls.')
}
if (!workTransition.includes('portfolioSparkBadgeUrl') || !sparkBadgeSource.includes("spark-badge-portfolio.html?url")) {
  throw new Error('The portfolio must use one shared URL contract for its budgeted Spark scene.')
}
for (const token of ['resolveSparkBadgeSource', 'variant=${variant}', 'portfolioSparkBadgeUrl']) {
  if (!sparkBadgeSource.includes(token)) throw new Error(`Spark source identity must retain ${token}.`)
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
for (const token of ['bridge-ready', 'renderer-ready', 'renderer-failed', 'pointer-bridge', 'portfolio:iframe-pointer', 'syncPendingFrame', 'escapeHtml(text)', 'status: "failed"', 'typeof window.__set', 'webglcontextlost', 'contextLeaseRef', 'acquireOptionalContextWhenAvailable', 'lease?.release()', 'onReadyChange?.(ready)']) {
  if (!liquidMetalButton.includes(token)) throw new Error(`Liquid Metal runtime must avoid a blank font-blocked entrance: ${token}`)
}
if (/\{mounted\s*\?\s*\(\s*<button[^>]*liquid-metal-button__fallback/s.test(liquidMetalButton)) {
  throw new Error('Liquid Metal must keep its semantic fallback button mounted independently of GPU visibility admission.')
}
if (liquidMetalButton.includes('onload="this.media=')) {
  throw new Error('Liquid Metal must not depend on an inline event handler that enforced CSP will block.')
}
for (const token of ['keepMounted', 'useGLSurface', 'mountMargin: keepMounted ? "140% 0px" : "80px"', 'spark-badge-activity', 'postActivity(active && mounted)']) {
  if (!workTransition.includes(token) && !read('src/shaders/spark-badge/SparkBadge.tsx').includes(token)) {
    throw new Error(`Stack → Work must preload and pause its right-side Spark resource: ${token}`)
  }
}
for (const token of ['sparkControlFrame', 'pendingSparkProgress', 'requestAnimationFrame(flushSparkControls)']) {
  if (!workTransition.includes(token)) throw new Error(`Stack → Work controls must coalesce to one frame: ${token}`)
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
for (const needle of ['WORK_GATE_PROGRESS', 'CTA_PREPARE_PROGRESS', "data-gate={gateLocked ? 'locked' : 'open'}", 'data-renderer-ready', 'Click to continue', 'Preparing interaction', 'dispatchWorkHandoff', 'enterWork', 'deliberateChapterJump', 'ctaReleasedRef', 'setCtaReleased(true)', '!ctaReleased']) {
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
for (const token of ['AboutDecryptReveal', 'about__dossier', 'MOVE TO DECRYPT', 'about__grid--evidence']) {
  if (!about.includes(token)) throw new Error(`About Decrypt dossier is missing ${token}.`)
}
for (const token of ['height: min(100svh, 960px)', 'grid-template-columns: repeat(12', '@media (min-width: 901px) and (max-height: 800px)']) {
  if (!aboutStyle.includes(token)) throw new Error(`About Decrypt must retain its desktop single-screen layout contract: ${token}.`)
}
for (const token of ['radius: 400', 'softness: 0.5', 'cell: 10', 'edgeGlow: 2', 'aberration: 10', "color: '#d6c5a8'"]) {
  if (!decryptConfig.includes(token)) throw new Error(`Decrypt Reveal must retain the official profile token ${token}.`)
}
for (const token of ['CELL_FRAG', 'MAIN_FRAG', 'INNER[6]', 'OUTER[10]', 'uEdgeFlicker', 'drawElementImage', 'onFirstFrame', 'pause()', 'resume()']) {
  if (!decryptVendor.includes(token)) throw new Error(`Vendored Decrypt Reveal is missing ${token}.`)
}
for (const forbidden of ['scanline', 'linear-gradient', 'clipPath']) {
  if (decryptSurface.includes(forbidden)) throw new Error(`Decrypt Reveal must not become a custom scanning mask: ${forbidden}`)
}
for (const token of ['supportsHtmlInCanvas', 'acquireOptionalContextWhenAvailable', 'stopWaitingForContext()', 'contextLease?.release()', 'webglcontextlost', 'visibilitychange', 'onFirstFrame', "setAttribute('drawable', '')", 'requestPaint', "querySelectorAll<HTMLImageElement>('img')", 'syncCaptureSubtree', 'source.replaceChildren(capture)', 'content: capture']) {
  if (!canvasHtmlSurface.includes(token)) throw new Error(`HTML-in-Canvas lifecycle is missing ${token}.`)
}
for (const token of ['failureCount', "addEventListener('canvas-ui:invalidate'", 'firstFrameImages', 'initialImagesReady', 'INITIAL_IMAGE_WAIT_MS', 'FACTORY_STARTUP_WAIT_MS', 'FIRST_FRAME_WAIT_MS', 'availability.some', 'scheduleCaptureRefresh', 'MutationObserver', "attributeFilter: ['aria-hidden', 'aria-selected', 'class', 'src', 'srcset']"]) {
  if (!canvasHtmlSurface.includes(token)) throw new Error(`Glass first-frame recovery is missing ${token}.`)
}
for (const token of ['.canvas-ui-html__source > [drawable]', '.canvas-ui-html__source', 'opacity: 0', 'pointer-events: none']) {
  if (!canvasHtmlStyle.includes(token)) throw new Error(`Canvas UI single-DOM handoff CSS is missing ${token}.`)
}
if ((canvasHtmlSurface.match(/\{children\}/g) ?? []).length !== 1) {
  throw new Error('Canvas UI host must render exactly one semantic React subtree.')
}
for (const forbidden of ['retainFallbackUntilReady', 'canvas-ui-html__fallback', 'canvas-ui-html--retained-fallback']) {
  if (canvasHtmlSurface.includes(forbidden) || canvasHtmlStyle.includes(forbidden) || glassSurface.includes(forbidden)) {
    throw new Error(`Canvas UI must never duplicate its semantic subtree: ${forbidden}`)
  }
}
for (const forbidden of ['preserveDom', 'captureRef']) {
  if (canvasHtmlSurface.includes(forbidden)) {
    throw new Error(`Canvas UI effects must keep one semantic React subtree and avoid broad mutation mirroring: ${forbidden}`)
  }
}
for (const token of ['size: 140', 'ior: 1.5', 'edge: 0.7', 'depth: 250', 'reflection: 1.12', 'shine: 0.14', 'zoom: 1.5', 'follow: 0.2', "targets: '[data-glass-target]'"]) {
  if (!glassConfig.includes(token)) throw new Error(`Project Glass must retain its source-backed dark-page profile token ${token}.`)
}
for (const token of ['sampleRefraction', 'fresnelSchlick', 'iorForWavelength', 'ggx', 'drawElementImage', 'onFirstFrame', 'pause()', 'resume()']) {
  if (!glassVendor.includes(token)) throw new Error(`Vendored Glass is missing ${token}.`)
}
for (const token of ['subscribePointer', 'getPointerSnapshot', 'continuityStates', 'persistContinuity', 'resolveGlassSourceGeometry', 'uSourceOrigin', 'uSourceResolution', 'scopeSelector', 'float body =', 'paintable.requestPaint!()']) {
  if (!glassVendor.includes(token)) throw new Error(`Project Glass continuous pointer lifecycle is missing ${token}.`)
}
if (glassVendor.includes('interaction = content')) {
  throw new Error('Glass pointer mapping must remain attached to its captured content subtree.')
}
for (const token of ['ProjectGlassSurface', 'glassReady', 'glassSuppressed', 'glassActive']) {
  if (!projects.includes(token)) throw new Error(`Projects Glass handoff is missing ${token}.`)
}
for (const token of ['surfaceId="project-overview"', 'variant="overview"', 'data-glass-target']) {
  if (!projects.includes(token)) throw new Error(`Project Glass overview discovery is missing ${token}.`)
}
const overviewSurfaceStart = projects.indexOf('surfaceId="project-overview"')
const overviewSurfaceEnd = projects.indexOf('</ProjectGlassSurface>', overviewSurfaceStart)
for (const token of ['projects__header', '<ProjectsBento />']) {
  const position = projects.indexOf(token, overviewSurfaceStart)
  if (position < overviewSurfaceStart || position > overviewSurfaceEnd) {
    throw new Error(`Project Glass overview must capture the complete Work opening: ${token}.`)
  }
}
for (const token of ['exclusiveGroup="canvas-ui-html-primary"', 'mountMargin="220% 0px"', 'viewportOutput: true', "scopeSelector: '#projects'", 'surfaceId', 'portalOutput', 'preloadProjectGlass', 'registerWorkGlassSurface', 'selectedSurface']) {
  if (!glassSurface.includes(token)) throw new Error(`Project Glass single-surface handoff is missing ${token}.`)
}
for (const token of ['requestAnimationFrame(flush)', "addEventListener('mousemove'", "addEventListener('scroll'", 'elementFromPoint', 'portfolio:iframe-pointer']) {
  if (!pointerCoordinator.includes(token)) throw new Error(`Shared pointer coordinator is missing ${token}.`)
}
for (const token of ['subscribePointer', 'is-over-glass']) {
  if (!cursor.includes(token)) throw new Error(`Cursor must share Work Glass pointer state: ${token}.`)
}
for (const token of ['selectWorkGlassSurface', 'directTarget', 'verticalDistance', 'retainCurrentAcrossGap', 'withinWork', 'subscribeWorkGlassSelection', 'registerWorkGlassSurface']) {
  if (!workGlassCoordinator.includes(token)) throw new Error(`Work Glass chapter arbitration is missing ${token}.`)
}
for (const token of ['findProjectReturnImage', 'setGlassSuppressed(true)', 'requestPointerHitTest', 'onComplete: resumeGlass']) {
  if (!projects.includes(token)) throw new Error(`Work Glass case-study handoff is missing ${token}.`)
}
for (const token of ['setRevealState', "'.project-glass--overview'", "'.project-glass--card'", 'onEnterBack', "new Event('canvas-ui:invalidate')"]) {
  if (!projects.includes(token)) throw new Error(`Projects reveal state must survive Glass subtree replacement: ${token}.`)
}
if (!projectsIntroStyle.includes('.project-glass--overview.is-visible .bento-glow')) {
  throw new Error('All six Work previews must inherit reveal state from the stable Glass host.')
}
for (const token of ['.project-glass--card.is-visible .project-card', '.project-glass--card.is-visible .media-frame']) {
  if (!projectsCardStyle.includes(token)) throw new Error(`Project cards must inherit stable Glass reveal state: ${token}.`)
}
for (const token of ['createPortal', 'document.body', 'canvas-ui-html__output--viewport']) {
  if (!canvasHtmlSurface.includes(token)) throw new Error(`Canvas UI viewport portal is missing ${token}.`)
}
for (const token of ['.canvas-ui-html__output--viewport', 'position: fixed', 'width: 100vw', 'height: 100svh']) {
  if (!canvasHtmlStyle.includes(token)) throw new Error(`Project Glass viewport continuity is missing ${token}.`)
}
if (projectsCardStyle.includes('.project-glass > .canvas-ui-html__output')) {
  throw new Error('Project Glass output must not remain inside a chapter clipping boundary.')
}
if (!glassVendor.includes('source.closest(config.scopeSelector)') || glassVendor.includes('output.closest(config.scopeSelector)')) {
  throw new Error('Portaled Glass must derive its Work scope from the local capture source.')
}
for (const token of ['candidates', 'useSyncExternalStore', 'useCanvasSurfaceSlot']) {
  if (!canvasSurfaceSlots.includes(token)) throw new Error(`Canvas surface slot governor is missing ${token}.`)
}
if (!glassSurface.includes("import('../../lib/canvas-ui/vendor/Glass/GlassVanilla')")) {
  throw new Error('Project Glass shader must remain deferred behind a dynamic import.')
}
for (const token of ['projects__intro', 'ProjectLaser', 'setScrollActivity', 'WORK_HANDOFF_EVENT', 'consumePendingWorkHandoff', 'laserActive']) {
  if (!projects.includes(token)) throw new Error(`Projects laser intro is missing ${token}.`)
}
for (const token of ["acquireOptionalContextWhenAvailable('project-laser'", 'activeContextOwners', 'contextLease?.release()', 'ResizeObserver', 'retryCountRef', 'setRetryKey', 'key={retryKey}', 'getWebGLRecoveryDelay', "host.dataset.lifecycle = 'waiting-context'", "host.dataset.lifecycle = 'live'", 'window.clearTimeout(retryTimer)']) {
  if (!projectLaser.includes(token)) throw new Error(`Project Laser lifecycle must retain ${token}.`)
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
for (const token of ['setScrollState', 'data-frame-particles', 'data-frame-particle-capture', 'markDrawableSubtree', "acquireOptionalContextWhenAvailable('frame-particle-handoff'", 'contextLease?.release()', 'readiness.every(Boolean)', "start: 'top top'", "end: 'bottom bottom'"]) {
  if (!frameParticles.includes(token)) throw new Error(`Frame Particle Scroll lifecycle must retain ${token}.`)
}
for (const token of ["mode: 'dissolve'", 'point: 0.61', 'band: 320', 'density: 2', 'size: 1.1', 'spread: 260', 'gravity: 0.08', 'drift: 0.4', 'swirl: 80', 'settle: 0.82', 'smoothing: 0.26', 'frontStart: 0.18', 'frontEnd: 1.28', 'canRenderFrameParticles', 'forceLoseCanvasWebGLContext']) {
  if (!frameParticleRuntime.includes(token)) throw new Error(`Frame Particle Scroll adapter must retain ${token}.`)
}
for (const token of ['POINT_VERT', 'BASE_FRAG', 'setScrollState', 'config.mode === "dissolve"', 'signalProgress', 'content.scrollTop =', 'drawElementImage', 'deleteVertexArray']) {
  if (!frameParticleVendor.includes(token)) throw new Error(`Vendored Canvas UI Particle Scroll must retain ${token}.`)
}
for (const token of ['height: 190svh', 'position: sticky', '.frame-particle-document__contact', '.frame-particle-handoff__scanline', '.frame-particle-handoff__caption', '.frame-particle-handoff__status', 'clip-path: inset(calc(var(--dissolve-progress)', 'scrollbar-width: none', '(prefers-reduced-motion: reduce)']) {
  if (!frameStyle.includes(token)) throw new Error(`Frame Particle Scroll fallback must retain ${token}.`)
}
for (const forbidden of ['externalProgress', '--particle-front', 'mask-image:', 'frame-particle-handoff__dust', 'frame-particle-handoff__signal']) {
  if (frameParticleVendor.includes(forbidden) || frameParticles.includes(forbidden) || frameStyle.includes(forbidden)) {
    throw new Error(`Frame Particle Scroll must not retain the rejected hybrid renderer: ${forbidden}`)
  }
}
if (frameParticles.includes('Promise.allSettled')) {
  throw new Error('Frame Particle Scroll must not promote failed image decodes into a Canvas takeover.')
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
for (const token of ["acquireOptionalContextWhenAvailable('footer-liquid'", 'stopWaitingForContext()', 'contextLease?.release()', 'visibilitychange']) {
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
for (const requiredSoundToken of ['MASTER_GAIN = 0.28', 'FADE_SECONDS = 0.18', 'SOUNDTRACK_TIMEOUT_MS', 'bufferGenerationRef', 'controller.signal.aborted', 'visibilitychange', 'AudioBufferSourceNode']) {
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
for (const token of ['spark-badge-activity', 'renderActive', 'scheduleFrame()', 'cancelAnimationFrame(renderFrame)']) {
  if (!sparkPortfolio.includes(token)) throw new Error(`The warmed Spark scene must pause cleanly offscreen: ${token}`)
}
for (const token of ["postMessage({ type: 'spark-badge-ready' }", "event.data.type === 'spark-badge-ready-request'"]) {
  if (!sparkPortfolio.includes(token)) {
    throw new Error(`The warmed Spark scene must keep its readiness handshake: ${token}`)
  }
}
const sparkBadge = read('src/shaders/spark-badge/SparkBadge.tsx')
for (const token of ['event.data', 'spark-badge-ready-request']) {
  if (!sparkBadge.includes(token)) {
    throw new Error(`SparkBadge must wait for and recover its iframe readiness handshake: ${token}`)
  }
}
const skillsIndex = registry.indexOf("id: 'skills'")
const transitionIndex = registry.indexOf("id: 'work-transition'")
const projectsIndex = registry.indexOf("id: 'projects'")
if (!(skillsIndex < transitionIndex && transitionIndex < projectsIndex)) {
  throw new Error('The navless work transition must remain between Stack and Work.')
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const canonicalScenes = {
  'src/shaders/liquid-metal-button/liquid-metal-button.html': '692b8bb800ab273bc74dd2c0df3a5cb911269cc7928834b85b0925e0d86fee3e',
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
for (const token of ['renderActive', 'useReducedMotion', "document.addEventListener('visibilitychange'", "renderActive && !reducedMotion", '!renderActive || reducedMotion', "typeof ResizeObserver === 'undefined'", "typeof IntersectionObserver === 'undefined'", 'drift-wall__semantic', 'aria-hidden="true"']) {
  if (!driftWall.includes(token)) throw new Error(`DriftWall must stop its offscreen frame loop: ${token}`)
}
for (const token of ['clusterElements', 'imagesByCluster', 'latestProgress', 'measuredScrollDistance']) {
  if (!archiveThemeScroll.includes(token)) throw new Error(`Frame scroll hot path must cache stable layout data: ${token}`)
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
