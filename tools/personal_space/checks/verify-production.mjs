// Desktop production readiness/media checks, without screenshots or recordings.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && /THREE|GLSL|WebGL|shader/i.test(m.text())) errors.push(m.text()) })
  await page.goto(process.env.LANDING_PRODUCTION_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  const ready = await page.evaluate(() => {
    const s = window.__portfolioPreloadDebug.snapshot()
    return { failed: s.failed, pending: s.pending, count: s.fulfilled.length }
  })
  assert.equal(ready.failed.length, 0); assert.equal(ready.pending.length, 0)
  const finishedAt = await page.evaluate(() => performance.now())
  await page.evaluate(() => {
    const el = document.querySelector('#archive-entry')
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY + .65 * (el.offsetHeight - innerHeight))
  })
  await page.waitForSelector('#archive-entry canvas[data-archive-shared]')
  await page.evaluate(() => {
    const el = document.querySelector('.sciscope-film__expand')
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY + .9 * (el.offsetHeight - innerHeight))
  })
  await page.waitForTimeout(1800)
  // Prefer the real authored button once admitted; the semantic button covers
  // unsupported WebGL. Both invoke the same visitor-facing playback action.
  const authored = page.locator('.sciscope-film__play-shell iframe.is-ready')
  if (await authored.count()) await page.frameLocator('.sciscope-film__play-shell iframe').locator('button').first().click()
  else await page.locator('.sciscope-film .liquid-metal-button__fallback').click()
  await page.waitForSelector('.sciscope-film__dialog[open]')
  await page.waitForFunction(() => { const v = document.querySelector('.sciscope-film video'); return !v.paused && v.currentTime > 0 })
  assert.equal(await page.locator('.sciscope-film video').evaluate(v => v.currentSrc.startsWith('blob:')), true)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('.sciscope-film__dialog').open)
  const late = await page.evaluate(t => performance.getEntriesByType('resource')
    .filter(r => r.startTime > t && r.transferSize > 300 && /\.(glb|mp4|mp3|woff2?|webp|png|jpg)(?:\?|$)/.test(r.name))
    .map(r => ({ url: r.name, bytes: r.transferSize })), finishedAt)
  console.log('PRODUCTION_BOOT_ROOM_FILM', ready, 'LATE_ASSET_TRANSFERS', late)
  assert.deepEqual(errors, []); assert.deepEqual(late, [])
} finally { await browser.close() }
