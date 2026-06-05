import { existsSync, readFileSync } from 'node:fs'

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'))
const landingPackage = JSON.parse(readFileSync('apps/landing/package.json', 'utf8'))
const studioPackage = JSON.parse(readFileSync('apps/studio/package.json', 'utf8'))
const studioHome = readFileSync('apps/studio/app/page.tsx', 'utf8')
const studioContent = readFileSync('apps/studio/content/index.ts', 'utf8')
const studioMdx = readFileSync('apps/studio/content/mdx.ts', 'utf8')
const studioBlogDetail = readFileSync('apps/studio/app/blog/[slug]/page.tsx', 'utf8')
const studioLayout = readFileSync('apps/studio/app/layout.tsx', 'utf8')
const landingApp = readFileSync('apps/landing/src/App.tsx', 'utf8')
const landingNav = readFileSync('apps/landing/src/components/Nav.tsx', 'utf8')
const landingGlobal = readFileSync('apps/landing/src/styles/global.css', 'utf8')
const vercelSource = readFileSync('vercel.json', 'utf8')

const requiredPaths = [
  'apps/landing/src/App.tsx',
  'apps/landing/src/components/Nav.tsx',
  'apps/landing/vite.config.ts',
  'apps/studio/app/blog/page.tsx',
  'apps/studio/app/blog/[slug]/page.tsx',
  'apps/studio/app/work/page.tsx',
  'apps/studio/app/work/[slug]/page.tsx',
  'apps/studio/app/dashboard/page.tsx',
  'apps/studio/app/rss.xml/route.ts',
  'apps/studio/app/sitemap.ts',
  'apps/studio/components/MdxContent.tsx',
  'apps/studio/content/mdx.ts',
  'apps/studio/content/posts/platform-split.mdx',
  'apps/studio/content/posts/studio-mdx-system.mdx',
  'packages/tokens/src/tokens.css',
  'packages/content/src/index.ts',
]

const missing = requiredPaths.filter((path) => !existsSync(path))
if (missing.length > 0) {
  throw new Error(`Plan 03 platform paths are missing:\n  - ${missing.join('\n  - ')}`)
}

if (!rootPackage.workspaces?.includes('apps/*') || !rootPackage.workspaces?.includes('packages/*')) {
  throw new Error('Root package.json must declare apps/* and packages/* workspaces.')
}

if (landingPackage.name !== '@timcai/landing') {
  throw new Error('The Vite landing workspace must be named @timcai/landing.')
}

if (studioPackage.name !== '@timcai/studio' || !studioPackage.dependencies?.next) {
  throw new Error('The studio workspace must be a Next.js app named @timcai/studio.')
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

if (!studioContent.includes('readPosts()') || !studioMdx.includes('readdirSync(postsDirectory)')) {
  throw new Error('Studio posts must be read from repository MDX files, not hardcoded page data.')
}

if (!studioBlogDetail.includes('MdxContent') || !studioBlogDetail.includes('post.body')) {
  throw new Error('Studio blog detail pages must render MDX-backed post bodies.')
}

if (
  !landingApp.includes("@vercel/analytics/react") ||
  !landingApp.includes("@vercel/speed-insights/react") ||
  !landingApp.includes('<Analytics />') ||
  !landingApp.includes('<SpeedInsights />')
) {
  throw new Error('Landing App must mount Vercel Analytics and Speed Insights at the app shell.')
}

if (!landingNav.includes('VITE_STUDIO_URL') || !landingNav.includes('href={blogHref}')) {
  throw new Error('Landing brand must be the configurable Blog entry point instead of a hero/index scroll button.')
}

if (!studioLayout.includes('NEXT_PUBLIC_LANDING_URL') || !studioLayout.includes('href={landingHref}')) {
  throw new Error('Studio brand must point back to the landing app.')
}

if (!studioLayout.includes("@timcai/tokens/css") || !landingGlobal.includes("@timcai/tokens/css")) {
  throw new Error('Landing and Studio must share packages/tokens CSS.')
}

if (!vercelSource.includes('apps/landing/dist') || !vercelSource.includes('npm run build:landing')) {
  throw new Error('Root Vercel config must build and serve the landing workspace output.')
}

console.log('[platform-guards] Plan 03 monorepo, studio, tokens, and runtime isolation are wired.')
