/**
 * Cross-zone runtime smoke check.
 *
 * The build guards (`platform-guards.mjs`) only assert that the rewrite *strings*
 * exist in vercel.json. They cannot catch the one production failure this repo
 * has actually had: the proxied /blog HTML loads (200) while its /_next assets
 * 404 on the main domain → unstyled, non-hydrated blog (2026-06-05 incident,
 * fixed 2026-06-06 by the /_next/:path* rewrite). This script is the runtime
 * complement: it exercises the deployed main domain the way a browser does.
 *
 * Checks, per content path (/blog, /work, /graph, /graph/preview, /dashboard):
 *   1. main-domain HTML responds 200 with text/html
 *   2. every /_next/static CSS+JS asset referenced by that HTML responds 200
 *      *on the main domain* (the exact failure mode of the incident)
 *   3. at least one CSS and one JS asset were found (so the check can't pass
 *      vacuously against an error page)
 * Plus /rss.xml responds 200 with an XML payload.
 *
 * Usage:
 *   node tests/runtime/cross-zone-smoke.mjs
 *   CROSS_ZONE_MAIN_ORIGIN=https://example.com node tests/runtime/cross-zone-smoke.mjs
 *
 * Exit code 0 = healthy, 1 = at least one check failed.
 */

// Canonical production domain (www.crt-dsg.com; the apex 307s to www). The
// ttt-i-m.vercel.app project domain serves the same deploy but is not what
// users hit, so the smoke must exercise the real domain's DNS + rewrites.
function normalizeMainOrigin(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('CROSS_ZONE_MAIN_ORIGIN must be a credential-free HTTPS origin.')
  }
  return url.origin
}

function positiveInteger(value, label) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`)
  return parsed
}

const MAIN_ORIGIN = normalizeMainOrigin(process.env.CROSS_ZONE_MAIN_ORIGIN ?? 'https://www.crt-dsg.com')
const EXPECTED_SHA = process.env.CROSS_ZONE_EXPECTED_SHA?.trim().toLowerCase()
if (EXPECTED_SHA && !/^[a-f\d]{40}$/.test(EXPECTED_SHA)) {
  throw new Error('CROSS_ZONE_EXPECTED_SHA must be a full 40-character Git commit SHA.')
}
const HTML_PATHS = [
  '/blog',
  '/blog/platform-split',
  '/work',
  '/work/bdi',
  '/graph',
  '/graph/preview',
  '/dashboard',
]
const FETCH_TIMEOUT_MS = 15_000
const FETCH_RETRIES = 2
const DEPLOYMENT_WAIT_MS = positiveInteger(process.env.CROSS_ZONE_DEPLOY_WAIT_MS ?? 480_000, 'CROSS_ZONE_DEPLOY_WAIT_MS')
const DEPLOYMENT_POLL_MS = 10_000

const failures = []

function fail(message) {
  failures.push(message)
  console.error(`  ✗ ${message}`)
}

function ok(message) {
  console.log(`  ✓ ${message}`)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url) {
  let lastError
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'ttt-i-m-cross-zone-smoke' },
      })
      if (attempt < FETCH_RETRIES && [429, 502, 503, 504].includes(response.status)) {
        await response.body?.cancel()
        await wait(250 * (attempt + 1))
        continue
      }
      return response
    } catch (error) {
      lastError = error
      if (attempt < FETCH_RETRIES) {
        await wait(250 * (attempt + 1))
      }
    }
  }
  throw lastError
}

async function readDeploymentCommit(path) {
  const response = await fetchWithTimeout(`${MAIN_ORIGIN}${path}?proof=${Date.now()}`)
  if (!response.ok) throw new Error(`${path} -> ${response.status}`)
  const body = await response.json()
  if (!body || typeof body.commit !== 'string') throw new Error(`${path} returned invalid deployment metadata`)
  return body.commit.toLowerCase()
}

async function waitForExactDeployment() {
  if (!EXPECTED_SHA) return true
  const deadline = Date.now() + DEPLOYMENT_WAIT_MS
  let observed = 'unavailable'

  while (Date.now() <= deadline) {
    try {
      const [landing, studio] = await Promise.all([
        readDeploymentCommit('/build-meta.json'),
        readDeploymentCommit('/__studio/build-meta.json'),
      ])
      observed = `landing=${landing}, studio=${studio}`
      if (landing === EXPECTED_SHA && studio === EXPECTED_SHA) {
        ok(`production serves exact commit ${EXPECTED_SHA} in both zones`)
        return true
      }
    } catch (error) {
      observed = error instanceof Error ? error.message : String(error)
    }

    console.log(`  … waiting for ${EXPECTED_SHA}; observed ${observed}`)
    await wait(DEPLOYMENT_POLL_MS)
  }

  fail(`production never converged to ${EXPECTED_SHA} in both zones; last observed ${observed}`)
  return false
}

/** Extract /_next/static asset URLs (css/js) from raw HTML. */
function extractNextAssets(html) {
  const urls = new Set()
  for (const match of html.matchAll(/(?:href|src)="(\/_next\/[^"]+?\.(?:css|js))(?:\?[^"]*)?"/g)) {
    urls.add(match[1])
  }
  return [...urls]
}

async function checkHtmlPath(path) {
  console.log(`\n${MAIN_ORIGIN}${path}`)
  let response
  try {
    response = await fetchWithTimeout(`${MAIN_ORIGIN}${path}`)
  } catch (error) {
    fail(`${path} fetch failed: ${error instanceof Error ? error.message : error}`)
    return
  }

  if (response.status !== 200) {
    fail(`${path} responded ${response.status} (expected 200)`)
    return
  }
  if (new URL(response.url).origin !== MAIN_ORIGIN) {
    fail(`${path} redirected away from the canonical main origin to ${response.url}`)
    return
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    fail(`${path} content-type is "${contentType}" (expected text/html)`)
    return
  }
  ok(`${path} HTML 200`)

  const html = await response.text()
  const assets = extractNextAssets(html)
  const hasCss = assets.some((url) => url.endsWith('.css'))
  const hasJs = assets.some((url) => url.endsWith('.js'))
  if (!hasCss || !hasJs) {
    fail(`${path} HTML references ${assets.length} /_next assets (css: ${hasCss}, js: ${hasJs}) — expected both, page may be an error shell`)
  }

  const results = await Promise.allSettled(
    assets.map(async (assetPath) => {
      const assetResponse = await fetchWithTimeout(`${MAIN_ORIGIN}${assetPath}`)
      if (assetResponse.status !== 200) {
        throw new Error(`${assetPath} -> ${assetResponse.status}`)
      }
      const expectedType = assetPath.endsWith('.css') ? 'text/css' : 'javascript'
      const assetType = assetResponse.headers.get('content-type') ?? ''
      if (!assetType.includes(expectedType)) {
        throw new Error(`${assetPath} content-type "${assetType}" (expected ${expectedType})`)
      }
    })
  )

  const assetFailures = results.filter((result) => result.status === 'rejected')
  if (assetFailures.length > 0) {
    for (const result of assetFailures) {
      fail(`${path} asset failed on main domain: ${result.reason instanceof Error ? result.reason.message : result.reason}`)
    }
  } else {
    ok(`${path} ${assets.length} /_next assets all 200 on main domain`)
  }
}

async function checkRss() {
  console.log(`\n${MAIN_ORIGIN}/rss.xml`)
  try {
    const response = await fetchWithTimeout(`${MAIN_ORIGIN}/rss.xml`)
    if (response.status !== 200) {
      fail(`/rss.xml responded ${response.status} (expected 200)`)
      return
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/rss+xml')) {
      fail(`/rss.xml content-type is "${contentType}" (expected application/rss+xml)`)
      return
    }
    const body = await response.text()
    if (!body.includes('<rss')) {
      fail('/rss.xml body does not look like an RSS feed')
      return
    }
    ok('/rss.xml 200 with RSS payload')
  } catch (error) {
    fail(`/rss.xml fetch failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function checkSitemap() {
  console.log(`\n${MAIN_ORIGIN}/sitemap.xml`)
  try {
    const response = await fetchWithTimeout(`${MAIN_ORIGIN}/sitemap.xml`)
    if (response.status !== 200) {
      fail(`/sitemap.xml responded ${response.status} (expected 200)`)
      return
    }
    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (!contentType.includes('application/xml') && !contentType.includes('text/xml')) {
      fail(`/sitemap.xml content-type is "${contentType}" (expected XML)`)
      return
    }
    if (!body.includes('<urlset') || !body.includes(`${MAIN_ORIGIN}/blog/`)) {
      fail('/sitemap.xml is missing its URL set or public blog detail routes')
      return
    }
    ok('/sitemap.xml 200 with public detail routes')
  } catch (error) {
    fail(`/sitemap.xml fetch failed: ${error instanceof Error ? error.message : error}`)
  }
}

console.log(`[cross-zone-smoke] main origin: ${MAIN_ORIGIN}`)

if (!await waitForExactDeployment()) process.exit(1)

for (const path of HTML_PATHS) {
  await checkHtmlPath(path)
}
await checkRss()
await checkSitemap()

if (failures.length > 0) {
  console.error(`\n[cross-zone-smoke] FAILED — ${failures.length} problem(s). The main domain is serving a broken cross-zone experience.`)
  process.exit(1)
}

console.log('\n[cross-zone-smoke] All cross-zone routes and their /_next assets resolve on the main domain.')
