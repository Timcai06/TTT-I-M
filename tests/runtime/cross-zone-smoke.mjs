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
 * Checks, per content path (/blog, /work, /dashboard):
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

const MAIN_ORIGIN = process.env.CROSS_ZONE_MAIN_ORIGIN ?? 'https://ttt-i-m.vercel.app'
const HTML_PATHS = ['/blog', '/work', '/dashboard']
const FETCH_TIMEOUT_MS = 15_000
const FETCH_RETRIES = 2
const MAX_ASSETS_PER_PAGE = 25

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
      return await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'ttt-i-m-cross-zone-smoke' },
      })
    } catch (error) {
      lastError = error
      if (attempt < FETCH_RETRIES) {
        await wait(250 * (attempt + 1))
      }
    }
  }
  throw lastError
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
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    fail(`${path} content-type is "${contentType}" (expected text/html)`)
    return
  }
  ok(`${path} HTML 200`)

  const html = await response.text()
  const assets = extractNextAssets(html).slice(0, MAX_ASSETS_PER_PAGE)
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

console.log(`[cross-zone-smoke] main origin: ${MAIN_ORIGIN}`)

for (const path of HTML_PATHS) {
  await checkHtmlPath(path)
}
await checkRss()

if (failures.length > 0) {
  console.error(`\n[cross-zone-smoke] FAILED — ${failures.length} problem(s). The main domain is serving a broken cross-zone experience.`)
  process.exit(1)
}

console.log('\n[cross-zone-smoke] All cross-zone routes and their /_next assets resolve on the main domain.')
