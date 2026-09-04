import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'))
const contentPackage = JSON.parse(readFileSync('packages/content/package.json', 'utf8'))
const landingPackage = JSON.parse(readFileSync('apps/landing/package.json', 'utf8'))
const studioPackage = JSON.parse(readFileSync('apps/studio/package.json', 'utf8'))
const studioVercel = JSON.parse(readFileSync('apps/studio/vercel.json', 'utf8'))
const studioHome = readFileSync('apps/studio/app/page.tsx', 'utf8')
const studioContent = readFileSync('apps/studio/content/index.ts', 'utf8')
const studioGraph = readFileSync('apps/studio/app/graph/page.tsx', 'utf8')
const studioGraphPreview = readFileSync('apps/studio/app/graph/preview/page.tsx', 'utf8')
const sharedContent = readFileSync('packages/content/src/index.ts', 'utf8')
const sharedProjects = readFileSync('packages/content/src/projects.ts', 'utf8')
const landingProjects = readFileSync('apps/landing/src/data/projects.ts', 'utf8')
const studioMdx = readFileSync('apps/studio/content/mdx.ts', 'utf8')
const studioSafeHref = readFileSync('apps/studio/lib/safeHref.ts', 'utf8')
const studioSite = readFileSync('apps/studio/lib/site.ts', 'utf8')
const studioBlogDetail = readFileSync('apps/studio/app/blog/[slug]/page.tsx', 'utf8')
const studioLayout = readFileSync('apps/studio/app/layout.tsx', 'utf8')
const studioStyles = readFileSync('apps/studio/app/studio.css', 'utf8')
const landingApp = readFileSync('apps/landing/src/App.tsx', 'utf8')
const landingTelemetry = readFileSync('apps/landing/src/components/ProductionTelemetry.tsx', 'utf8')
const landingChapterBoundary = readFileSync('apps/landing/src/components/ChapterBoundary.tsx', 'utf8')
const landingNav = readFileSync('apps/landing/src/components/Nav.tsx', 'utf8')
const landingGlobal = readFileSync('apps/landing/src/styles/global.css', 'utf8')
const vercelSource = readFileSync('vercel.json', 'utf8')
const vercelConfig = JSON.parse(vercelSource)
const contentFixtureTest = readFileSync('packages/content/tests/githubPublicService.test.ts', 'utf8')
const githubPublicService = readFileSync('packages/content/src/githubPublicService.ts', 'utf8')
const githubPublicTransport = readFileSync('packages/content/src/githubPublicTransport.ts', 'utf8')
const githubPublicValidation = readFileSync('packages/content/src/githubPublicValidation.ts', 'utf8')
const githubPublicPreviewCache = readFileSync('packages/content/src/githubPublicPreviewCache.ts', 'utf8')
const landingVite = readFileSync('apps/landing/vite.config.ts', 'utf8')
const landingPlaywright = readFileSync('apps/landing/playwright.config.ts', 'utf8')
const liquidButtonAdapter = readFileSync('apps/landing/src/shaders/liquid-metal-button/liquidMetalAdapter.ts', 'utf8')
const liquidButtonHtml = readFileSync('apps/landing/src/shaders/liquid-metal-button/liquid-metal-button.html', 'utf8')
const sparkPortfolioHtml = readFileSync('apps/landing/src/shaders/spark-badge/spark-badge-portfolio.html', 'utf8')
const crossZoneSmoke = readFileSync('tests/runtime/cross-zone-smoke.mjs', 'utf8')
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')

const requiredPaths = [
  'apps/landing/src/App.tsx',
  'apps/landing/src/components/Nav.tsx',
  'apps/landing/src/shaders/liquid-metal-button/liquidMetalAdapter.ts',
  'apps/landing/vite.config.ts',
  'apps/studio/app/blog/page.tsx',
  'apps/studio/app/blog/[slug]/page.tsx',
  'apps/studio/app/work/page.tsx',
  'apps/studio/app/work/[slug]/page.tsx',
  'apps/studio/app/graph/page.tsx',
  'apps/studio/app/graph/preview/page.tsx',
  'apps/studio/app/dashboard/page.tsx',
  'apps/studio/app/rss.xml/route.ts',
  'apps/studio/app/sitemap.ts',
  'apps/studio/app/api/build-meta/route.ts',
  'apps/studio/app/styles/base.css',
  'apps/studio/app/styles/editorial.css',
  'apps/studio/app/styles/article.css',
  'apps/studio/app/styles/graph.css',
  'apps/studio/app/styles/responsive.css',
  'apps/studio/components/MdxContent.tsx',
  'apps/studio/content/mdx.ts',
  'apps/studio/content/posts/platform-split.mdx',
  'apps/studio/content/posts/studio-mdx-system.mdx',
  'apps/studio/lib/safeHref.ts',
  'apps/studio/tests/mdx.test.ts',
  'apps/studio/tests/site-boundaries.test.ts',
  'packages/tokens/src/tokens.css',
  'packages/content/src/index.ts',
  'packages/content/src/githubGraphAdapter.ts',
  'packages/content/src/publicPreview.ts',
  'packages/content/src/githubPublicService.ts',
  'packages/content/src/githubPublicTransport.ts',
  'packages/content/src/githubPublicValidation.ts',
  'packages/content/src/githubPublicPreviewCache.ts',
  'packages/content/tests/githubPublicService.test.ts',
  'packages/content/tests/fixtures/github-public-user.json',
  'packages/content/tests/fixtures/github-public-repos.json',
  'packages/content/tests/fixtures/github-public-readme.md',
]

const missing = requiredPaths.filter((path) => !existsSync(path))
if (missing.length > 0) {
  throw new Error(`Plan 03 platform paths are missing:\n  - ${missing.join('\n  - ')}`)
}

if (!rootPackage.workspaces?.includes('apps/*') || !rootPackage.workspaces?.includes('packages/*')) {
  throw new Error('Root package.json must declare apps/* and packages/* workspaces.')
}
if (
  rootPackage.packageManager !== 'npm@11.11.0' ||
  rootPackage.engines?.node !== '>=24 <26' ||
  rootPackage.engines?.npm !== '>=11 <12'
) {
  throw new Error('The monorepo must pin its npm toolchain and bounded Node.js runtime contract.')
}

if (
  !rootPackage.scripts?.['test:content']?.includes('packages/content/tests/*.test.ts') ||
  !rootPackage.scripts?.['test:studio']?.includes('apps/studio/tests/*.test.ts') ||
  !rootPackage.scripts?.['test:unit']?.includes('test:content') ||
  !rootPackage.scripts?.['test:unit']?.includes('test:studio') ||
  !rootPackage.scripts?.['test:e2e']?.includes('@timcai/landing') ||
  !rootPackage.scripts?.['test:e2e:canvas-experimental']?.includes('@timcai/landing') ||
  !rootPackage.scripts?.['test:build']?.includes('test:content') ||
  !contentFixtureTest.includes('empty public repository lists')
) {
  throw new Error('Root verification scripts must cover content/Studio units, Landing e2e, and the experimental Canvas lane.')
}

for (const [path, source] of [
  ['githubPublicService.ts', githubPublicService],
  ['githubPublicTransport.ts', githubPublicTransport],
  ['githubPublicValidation.ts', githubPublicValidation],
  ['githubPublicPreviewCache.ts', githubPublicPreviewCache],
]) {
  const lineCount = source.split('\n').length - 1
  if (lineCount > 500) throw new Error(`${path} exceeds the 500-line service ownership boundary (${lineCount}).`)
}
if (
  githubPublicService.includes('async function readBoundedText') ||
  githubPublicService.includes('function isTrustedHttpsUrl') ||
  !githubPublicTransport.includes('fetchWithDeadline') ||
  !githubPublicTransport.includes('MAX_JSON_RESPONSE_BYTES') ||
  !githubPublicValidation.includes('isTrustedHttpsUrl') ||
  !githubPublicValidation.includes('parseGitHubRepositories')
) {
  throw new Error('GitHub public preview must keep transport limits, trust validation, and business orchestration in separate modules.')
}
for (const token of ['operationDeadlineAt', 'remainingOperationMs', 'totalTimeoutMs', 'raceWithAbort', 'cancelBodyOnAbort', 'cancelReaderOnAbort']) {
  if (!githubPublicTransport.includes(token)) {
    throw new Error(`GitHub public preview total-deadline contract is missing ${token}.`)
  }
}
for (const token of ["result.status === 'ready'", 'inFlight', 'maxEntries', 'maxInFlight', 'successTtlMs']) {
  if (!githubPublicPreviewCache.includes(token)) {
    throw new Error(`GitHub public preview success-only cache is missing ${token}.`)
  }
}

if (landingPackage.name !== '@timcai/landing') {
  throw new Error('The Vite landing workspace must be named @timcai/landing.')
}

if (!landingPackage.scripts?.dev?.includes('--port 5173 --strictPort')) {
  throw new Error('Landing dev server must stay on port 5173 so local Studio return links work.')
}
if (
  !landingPlaywright.includes("PLAYWRIGHT_PORT ?? '4173'")
  || !landingPlaywright.includes('workers: 1')
  || !landingPlaywright.includes('reuseExistingServer: false')
  || !landingPlaywright.includes('npm run build && npm run preview')
) {
  throw new Error('Playwright must run one isolated production-preview server instead of reusing a developer process.')
}

if (studioPackage.name !== '@timcai/studio' || !studioPackage.dependencies?.next) {
  throw new Error('The studio workspace must be a Next.js app named @timcai/studio.')
}

if (
  studioVercel.framework !== 'nextjs' ||
  studioVercel.installCommand !== 'cd ../.. && npm ci' ||
  studioVercel.buildCommand !== 'cd ../.. && npm run build:studio'
) {
  throw new Error('Studio Vercel project must install/build from the monorepo root when Root Directory is apps/studio.')
}

const forbiddenStudioRuntime = ['gsap', '@react-three/fiber', 'three', 'lenis', 'sitePreload']
const studioPackageSource = JSON.stringify(studioPackage)
const badStudioDeps = forbiddenStudioRuntime.filter((needle) => studioPackageSource.includes(needle))
if (badStudioDeps.length > 0) {
  throw new Error(`Studio must not depend on landing runtime packages: ${badStudioDeps.join(', ')}`)
}

if (!studioHome.includes('without importing GSAP, R3F, or Lenis') || !studioContent.includes('createStaticRepository')) {
  throw new Error('Studio must document the runtime split and consume repository-backed content.')
}

if (
  !studioHome.includes("href: '/graph'") ||
  !studioHome.includes("href: '/graph/preview'") ||
  !studioLayout.includes("href: '/graph'") ||
  !studioContent.includes('timPublicDemoBuilderGraphRepository') ||
  !studioContent.includes('@timcai/content/github-graph-adapter') ||
  !studioGraph.includes('builderGraph.getSnapshot') ||
  !studioGraph.includes('No GitHub login, token')
) {
  throw new Error('Studio Graph must expose the A4 demo Builder Graph surface without real GitHub auth.')
}

const contentGraphSubpaths = [
  './builder-graph',
  './github-connector',
  './github-graph-adapter',
  './public-preview',
  './github-public-service',
  './github-public-preview-cache',
]
const missingContentGraphSubpaths = contentGraphSubpaths.filter((subpath) => !contentPackage.exports?.[subpath])
if (missingContentGraphSubpaths.length > 0) {
  throw new Error(`@timcai/content must expose Studio-only graph code through explicit subpath exports:\n  - ${missingContentGraphSubpaths.join('\n  - ')}`)
}

for (const forbiddenMainExport of [
  'BUILDER_GRAPH_SCHEMA_VERSION',
  'oauthIdentityPermissionProfile',
  'createGitHubGraphAdapter',
  'timPublicDemoBuilderGraphRepository',
  'createPublicPreviewDraft',
  'fetchPublicGitHubPreviewSnapshot',
]) {
  if (sharedContent.includes(forbiddenMainExport)) {
    throw new Error(`@timcai/content main export must stay landing-light; move ${forbiddenMainExport} to a subpath export.`)
  }
}

if (
  !studioGraph.includes('href="/graph/preview"') ||
  !studioGraphPreview.includes('createPublicPreviewDraft') ||
  !studioGraphPreview.includes('fetchPublicGitHubPreviewSnapshot') ||
  !studioGraphPreview.includes('fetchCachedPublicGitHubPreviewSnapshot') ||
  studioGraphPreview.includes('unstable_cache') ||
  !studioGraphPreview.includes('@timcai/content/public-preview') ||
  !studioGraphPreview.includes('@timcai/content/github-public-service') ||
  !studioGraphPreview.includes('method="get"') ||
  !studioGraphPreview.includes('name="handle"') ||
  !studioGraphPreview.includes('name="repo"') ||
  !studioGraphPreview.includes('no OAuth') ||
  !studioGraphPreview.includes('public repositories only') ||
  !studioGraphPreview.includes('repositoryGroups') ||
  !studioGraphPreview.includes('readmeExcerpt')
) {
  throw new Error('Studio Graph Preview A5/A6 must expose public GitHub fetch + repo selection before real OAuth.')
}

if (!studioContent.includes('readPosts()') || !studioMdx.includes('readdirSync(postsDirectory)')) {
  throw new Error('Studio posts must be read from repository MDX files, not hardcoded page data.')
}
for (const token of ['requirePublishState', 'optionalIsoDate', 'PUBLIC_STATES', 'Duplicate post slug']) {
  if (!studioMdx.includes(token)) throw new Error(`Studio MDX publication boundary is missing ${token}.`)
}
for (const token of ['resolveSafeHref', 'NON_WEB_PROTOCOLS', 'return null']) {
  if (!studioSafeHref.includes(token)) throw new Error(`Studio authored-link protocol boundary is missing ${token}.`)
}
if (!studioSite.includes('normalizeSiteUrl') || !studioSite.includes('url.origin')) {
  throw new Error('Studio canonical URL configuration must validate and normalize its deployment origin.')
}

if (
  !sharedContent.includes('portfolioProjects') ||
  !sharedContent.includes('landingPortfolioProjects') ||
  !sharedProjects.includes('export const portfolioProjects') ||
  !sharedProjects.includes('export const landingPortfolioProjects') ||
  !studioContent.includes('portfolioProjects') ||
  !landingProjects.includes("landingPortfolioProjects as projects")
) {
  throw new Error('Work content must remain single-sourced in packages/content, with a curated Landing catalogue and the existing Studio catalogue.')
}

if (!studioBlogDetail.includes('MdxContent') || !studioBlogDetail.includes('post.body')) {
  throw new Error('Studio blog detail pages must render MDX-backed post bodies.')
}

// Real MDX (next-mdx-remote/rsc), not the old hand-rolled markdown-subset renderer.
const studioMdxComponent = readFileSync('apps/studio/components/MdxContent.tsx', 'utf8')
if (
  !studioMdxComponent.includes('next-mdx-remote/rsc')
  || !studioMdxComponent.includes('MDXRemote')
  || !studioMdxComponent.includes('resolveSafeHref')
) {
  throw new Error('MdxContent must render real MDX via next-mdx-remote/rsc (server-compiled), not a hand-rolled parser.')
}
if (!studioPackage.dependencies?.['next-mdx-remote'] || !studioPackage.dependencies?.['gray-matter']) {
  throw new Error('Studio must depend on next-mdx-remote (real MDX) and gray-matter (robust frontmatter).')
}
if (!studioMdx.includes('matter(')) {
  throw new Error('Studio frontmatter must be parsed by gray-matter, not the hand-rolled flat parser.')
}

if (
  !landingApp.includes("lazy(() => import('./components/ProductionTelemetry'))") ||
  !landingTelemetry.includes("@vercel/analytics/react") ||
  !landingTelemetry.includes("@vercel/speed-insights/react") ||
  !landingTelemetry.includes('<Analytics />') ||
  !landingTelemetry.includes('<SpeedInsights />')
) {
  throw new Error('Landing must mount Vercel Analytics and Speed Insights outside the render-critical entry chunk.')
}
if (
  landingChapterBoundary.includes("import { track } from '@vercel/analytics/react'")
  || !landingChapterBoundary.includes("import('@vercel/analytics/react')")
) {
  throw new Error('Chapter error telemetry must remain dynamically loaded outside the Landing entry chunk.')
}

if (!landingNav.includes('VITE_STUDIO_URL') || !landingNav.includes('http://localhost:5174') || !landingNav.includes('href={blogHref}')) {
  throw new Error('Landing brand must be the configurable Blog entry point instead of a hero/index scroll button.')
}

if (!studioLayout.includes('NEXT_PUBLIC_LANDING_URL') || !studioLayout.includes('http://localhost:5173') || !studioLayout.includes('href={landingHref}')) {
  throw new Error('Studio brand must point back to the landing app.')
}

if (!studioLayout.includes("@timcai/tokens/css") || !landingGlobal.includes("@timcai/tokens/css")) {
  throw new Error('Landing and Studio must share packages/tokens CSS.')
}

const studioStyleModules = ['base.css', 'editorial.css', 'article.css', 'graph.css', 'responsive.css']
let previousStyleImport = -1
for (const module of studioStyleModules) {
  const token = `@import './styles/${module}';`
  const index = studioStyles.indexOf(token)
  if (index <= previousStyleImport) throw new Error(`Studio CSS module order is missing or unstable at ${module}.`)
  previousStyleImport = index
  const lineCount = readFileSync(`apps/studio/app/styles/${module}`, 'utf8').split('\n').length - 1
  if (lineCount > 500) throw new Error(`Studio CSS module ${module} exceeds the 500-line ownership boundary (${lineCount}).`)
}

// tokens.css must stay the single source of truth: landing's global.css used to
// redeclare every shared variable in its own :root, silently overriding the
// package. Any `--bg:`/`--fg:`/`--accent:`/`--font-`/`--ease-` declaration in
// landing global.css is that drift coming back.
if (/--(bg|fg|accent|line|font-(sans|serif|mono)|ease-(out|inout))\s*:/.test(landingGlobal)) {
  throw new Error('Landing global.css must not redeclare shared @timcai/tokens variables — edit packages/tokens/src/tokens.css instead.')
}

if (!landingPackage.dependencies?.['@timcai/tokens']) {
  throw new Error('Landing must declare @timcai/tokens as a dependency (it imports its CSS).')
}

// Cross-document View Transitions opt-in lives in the shared tokens package
// (separate view-transitions.css export) and BOTH documents must import it —
// the requirement for cross-document VT on same-origin navigation.
const viewTransitionsCss = readFileSync('packages/tokens/src/view-transitions.css', 'utf8')
if (!viewTransitionsCss.includes('@view-transition')) {
  throw new Error('packages/tokens view-transitions.css must contain the @view-transition opt-in.')
}
if (!studioLayout.includes('@timcai/tokens/view-transitions.css') || !landingGlobal.includes('@timcai/tokens/view-transitions.css')) {
  throw new Error('Landing and Studio must both import @timcai/tokens/view-transitions.css (cross-document VT needs both documents).')
}

if (!vercelSource.includes('apps/landing/dist') || !vercelSource.includes('npm run build:landing')) {
  throw new Error('Root Vercel config must build and serve the landing workspace output.')
}
if (vercelConfig.installCommand !== 'npm ci') {
  throw new Error('Landing production installs must be immutable and lockfile-backed via npm ci.')
}

const immutableAssetHeaders = vercelConfig.headers
  ?.find((entry) => entry.source === '/assets/(.*)')
  ?.headers ?? []
if (!immutableAssetHeaders.some((header) => header.key === 'Cache-Control' && header.value === 'public, max-age=31536000, immutable')) {
  throw new Error('Content-hashed Vite assets must receive a one-year immutable cache policy.')
}

// The Landing deliberately embeds same-origin HTML renderers (for example the
// Stack -> Work Spark Badge). DENY makes those production-only iframes blank,
// while SAMEORIGIN keeps third-party framing blocked.
const globalHeaders = vercelConfig.headers
  ?.find((entry) => entry.source === '/(.*)')
  ?.headers ?? []
const globalHeaderMap = new Map(globalHeaders.map((header) => [header.key, header.value]))
if (globalHeaderMap.get('X-Frame-Options') !== 'SAMEORIGIN') {
  throw new Error('Landing security headers must allow its same-origin renderer iframes via X-Frame-Options: SAMEORIGIN.')
}
const landingCsp = globalHeaderMap.get('Content-Security-Policy') ?? ''
if (!landingCsp.includes("frame-ancestors 'self'") || !landingCsp.includes("object-src 'none'")) {
  throw new Error('Landing must enforce CSP with same-origin framing and blocked object embeds.')
}
if (globalHeaderMap.has('Content-Security-Policy-Report-Only')) {
  throw new Error('Landing CSP must be enforced, not report-only.')
}
if (/fonts\.(?:googleapis|gstatic)\.com/.test(landingCsp) || /fonts\.(?:googleapis|gstatic)\.com/.test(liquidButtonHtml)) {
  throw new Error('Liquid Metal must use the bundled Inter font instead of a runtime Google Fonts dependency.')
}

function inlineScripts(source) {
  return [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
}
function cspHash(source) {
  return `sha256-${createHash('sha256').update(source).digest('base64')}`
}
const bridgeScript = liquidButtonAdapter.match(/const LIQUID_METAL_BUTTON_BRIDGE = `\n<script[^>]*>([\s\S]*?)<\/script>`;/)?.[1]
if (!bridgeScript) throw new Error('Liquid Metal iframe bridge script could not be located for CSP hashing.')
const playMessagePatch = liquidButtonAdapter.match(
  /\.replace\(\s*"window\.__seek\s+= v => \{ clock = v; drawn = null; \};",\s*`([\s\S]*?)`,\s*\)/,
)?.[1]
if (!playMessagePatch) throw new Error('Liquid Metal play runtime patch could not be located for CSP hashing.')
const liquidPlayRuntime = liquidButtonHtml
  .replace(
    'let needResize = true;',
    'let needResize = true;\nlet playStrokeWidth = 3;',
  )
  .replace(
    'const bw = Math.max(1.5, 3.2 * (BH/516));      // stroke half-width, device px',
    'const bw = Math.max(0.5 * DPR, playStrokeWidth * DPR * 0.5); // configurable stroke half-width, device px',
  )
  .replace('window.__seek   = v => { clock = v; drawn = null; };', playMessagePatch)
const iframeScriptHashes = [
  ...inlineScripts(sparkPortfolioHtml),
  ...inlineScripts(liquidButtonHtml),
  ...inlineScripts(liquidPlayRuntime),
  bridgeScript,
].map(cspHash)
for (const hash of iframeScriptHashes) {
  if (!landingCsp.includes(`'${hash}'`)) {
    throw new Error(`Landing CSP is missing approved iframe script hash ${hash}.`)
  }
}

const studioGlobalHeaders = studioVercel.headers
  ?.find((entry) => entry.source === '/(.*)')
  ?.headers ?? []
const studioHeaderMap = new Map(studioGlobalHeaders.map((header) => [header.key, header.value]))
if (!studioHeaderMap.get('Content-Security-Policy')?.includes("object-src 'none'") || studioHeaderMap.get('X-Frame-Options') !== 'SAMEORIGIN') {
  throw new Error('Studio must enforce its CSP and same-origin framing policy.')
}

const rewrites = vercelConfig.rewrites ?? []
const rewriteMap = new Map(rewrites.map((rewrite) => [rewrite.source, rewrite.destination]))

const requiredRewrites = new Map([
  // /_next must come first in the array so Vercel routes studio static assets
  // before any page rewrite intercepts them — without this, the proxied /blog
  // HTML loads but its /_next/*.css|js 404 on the main domain (verified by curl).
  ['/_next/:path*', 'https://ttt-i-m-studio.vercel.app/_next/:path*'],
  ['/__studio/build-meta.json', 'https://ttt-i-m-studio.vercel.app/api/build-meta'],
  ['/blog', 'https://ttt-i-m-studio.vercel.app/blog'],
  ['/blog/:path*', 'https://ttt-i-m-studio.vercel.app/blog/:path*'],
  ['/work', 'https://ttt-i-m-studio.vercel.app/work'],
  ['/work/:path*', 'https://ttt-i-m-studio.vercel.app/work/:path*'],
  ['/graph', 'https://ttt-i-m-studio.vercel.app/graph'],
  ['/graph/:path*', 'https://ttt-i-m-studio.vercel.app/graph/:path*'],
  ['/dashboard', 'https://ttt-i-m-studio.vercel.app/dashboard'],
  ['/dashboard/:path*', 'https://ttt-i-m-studio.vercel.app/dashboard/:path*'],
  ['/rss.xml', 'https://ttt-i-m-studio.vercel.app/rss.xml'],
  ['/sitemap.xml', 'https://ttt-i-m-studio.vercel.app/sitemap.xml'],
])

for (const [source, destination] of requiredRewrites) {
  if (rewriteMap.get(source) !== destination) {
    throw new Error(`Root Vercel config must rewrite ${source} to the Studio origin.`)
  }
}

// /_next must be the first rewrite entry — Vercel evaluates rewrites in order
// and a page rewrite before /_next would shadow static asset requests.
const firstRewrite = rewrites[0]
if (firstRewrite?.source !== '/_next/:path*') {
  throw new Error(
    '/_next/:path* must be the first rewrite in vercel.json so static assets resolve before page rewrites intercept them.'
  )
}

for (const token of ['deployment-metadata', 'build-meta.json', 'VERCEL_GIT_COMMIT_SHA']) {
  if (!landingVite.includes(token)) throw new Error(`Landing build metadata is missing ${token}.`)
}
for (const token of [
  'CROSS_ZONE_EXPECTED_SHA',
  '/__studio/build-meta.json',
  'waitForExactDeployment',
  "'/blog/platform-split'",
  "'/work/bdi'",
  'assetType.includes(expectedType)',
  'checkSitemap()',
]) {
  if (!crossZoneSmoke.includes(token)) throw new Error(`Cross-zone exact-deployment proof is missing ${token}.`)
}
if (!ciWorkflow.includes('CROSS_ZONE_EXPECTED_SHA: ${{ github.sha }}')) {
  throw new Error('Cross-zone CI must wait for the exact pushed SHA, not whichever production deployment answers first.')
}

console.log('[platform-guards] Plan 03 monorepo, studio, tokens, runtime isolation, and /_next cross-zone routing are wired.')
