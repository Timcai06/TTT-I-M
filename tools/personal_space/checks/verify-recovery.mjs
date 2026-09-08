// Runtime regression checks only; no screenshots or visual assessment.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.LANDING_RUNTIME_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForSelector('#archive-entry', { state: 'attached' })
  await page.evaluate(async () => {
    const el = document.querySelector('#archive-entry')
    const { getLenis } = await import('/src/lib/lenis.ts')
    getLenis().scrollTo(el.getBoundingClientRect().top + scrollY + .65 * (el.offsetHeight - innerHeight), { immediate: true, force: true })
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#archive-entry')
    return el.dataset.failed === 'true' || !!el.querySelector('canvas')
  }, null, { timeout: 120000 })
  const state = await page.locator('#archive-entry').evaluate(el => ({ ready: el.dataset.sceneReady, failed: el.dataset.failed, canvas: !!el.querySelector('canvas') }))
  console.log('EXPANDED_PREVIEW', state)
  assert.equal(state.failed, 'false'); assert.equal(state.canvas, true); assert.deepEqual(errors, [])
} finally { await browser.close() }
