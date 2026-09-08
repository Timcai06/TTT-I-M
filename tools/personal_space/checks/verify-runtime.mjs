// Functional readiness and lifecycle checks only; no screenshots or visual judgement.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const url = process.env.LANDING_RUNTIME_URL ?? 'http://127.0.0.1:5173/'
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = [], lateModels = []
  let opened = false, release
  const gate = new Promise(resolve => { release = resolve })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL|GLSL/i.test(message.text())) errors.push(message.text()) })
  page.on('request', request => { if (opened && /\.glb(?:\?|$)/.test(request.url())) lateModels.push(request.url()) })
  await page.route(/personal-space\.glb(?:\?t=\d+)?$/, async route => { await gate; await route.continue().catch(() => {}) })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__portfolioPreloadDebug?.tasks.some(task => task.id === 'renderer:personal-archive'))
  await page.waitForTimeout(4500)
  assert.equal(await page.locator('.intro').count(), 1, 'Slow model must remain behind the intro')
  assert.equal(await page.evaluate(() => window.__portfolioPreloadDebug.snapshot().pending.some(task => task.id === 'renderer:personal-archive')), true)
  console.log('SLOW_MODEL_STAYS_BEHIND_INTRO')
  release()
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  opened = true
  const ready = await page.evaluate(() => {
    const state = window.__portfolioPreloadDebug.snapshot()
    return { failed: state.failed, pending: state.pending, count: state.fulfilled.length,
      roomMs: state.fulfilled.find(task => task.id === 'renderer:personal-archive').durationMs,
      previews: document.querySelectorAll('[data-preview-ready="true"]').length }
  })
  assert.deepEqual(ready.failed, []); assert.deepEqual(ready.pending, []); assert.equal(ready.previews, 5)
  console.log('ALL_TASKS_READY_BEFORE_REVEAL', ready)
  const move = async p => {
    await page.evaluate(async p => {
      const el = document.querySelector('#archive-entry')
      const { getLenis } = await import('/src/lib/lenis.ts')
      getLenis().scrollTo(el.getBoundingClientRect().top + scrollY + p * (el.offsetHeight - innerHeight), { immediate: true, force: true })
    }, p)
  }
  await move(.65)
  await page.waitForSelector('#archive-entry canvas[data-archive-shared]')
  const canvas = await page.locator('#archive-entry canvas').elementHandle()
  assert.equal(await page.locator('#archive-entry').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)')
  await move(1)
  await page.waitForFunction(() => !document.querySelector('#archive-entry canvas') && getComputedStyle(document.querySelector('#about .about-decrypt')).visibility === 'visible')
  await move(.65)
  await page.waitForSelector('#archive-entry canvas[data-archive-shared]')
  assert.equal(await page.evaluate(canvas => canvas === document.querySelector('#archive-entry canvas'), canvas), true)
  assert.deepEqual(lateModels, []); assert.deepEqual(errors, [])
  console.log('BLACK_BACKDROP_SAME_CANVAS_REVERSE_NO_MODEL_REFETCH')
  await page.unrouteAll({ behavior: 'wait' }); opened = false
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  assert.deepEqual(await page.evaluate(() => window.__portfolioPreloadDebug.snapshot().failed), [])
  console.log('WARM_RELOAD_READY')
  await page.close()
  const failed = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await failed.route(/personal-space\.glb(?:\?t=\d+)?$/, route => route.abort())
  await failed.goto(url, { waitUntil: 'domcontentloaded' })
  await failed.waitForSelector('.intro__retry', { timeout: 120000 })
  assert.equal(await failed.locator('.intro__retry button').isEnabled(), true)
  assert.equal(await failed.locator('.intro').count(), 1)
  assert.ok(await failed.evaluate(() => window.__portfolioPreloadDebug.snapshot().failed.some(task => task.id === 'renderer:personal-archive')))
  console.log('FAILED_MODEL_EXPOSES_RETRY_WITHOUT_FALSE_READY')
} finally { await browser.close() }
