// Functional desktop lifecycle checks; no screenshots, video or pixel inspection.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = [], lateModels = []
  let started = false
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', m => { if (m.type() === 'error' && /personal-archive|THREE|GLSL|shader/i.test(m.text())) errors.push(m.text()) })
  page.on('request', r => { if (started && /\.glb(?:\?|$)/.test(r.url())) lateModels.push(r.url()) })
  await page.goto(process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  started = true
  const selector = track => track === 'entry' ? '#archive-entry' : `[data-archive-track="${track}"]`
  const move = async (track, p) => {
    await page.evaluate(async ({ selector, p }) => {
      const el = document.querySelector(selector)
      const { getLenis } = await import('/src/lib/lenis.ts')
      getLenis().scrollTo(el.getBoundingClientRect().top + scrollY + p * (el.offsetHeight - innerHeight), { immediate: true, force: true })
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }, { selector: selector(track), p })
  }
  const ready = async track => {
    await page.waitForFunction(selector => {
      const el = document.querySelector(selector), canvas = el.querySelector('canvas[data-archive-shared]')
      return el.dataset.sceneReady === 'true' && el.dataset.failed === 'false' && canvas?.dataset.archiveState === 'ready'
    }, selector(track))
  }
  await move('entry', .65); await ready('entry')
  const canvas = await page.locator('#archive-entry canvas').elementHandle()
  const assertOwner = async track => {
    const status = await page.evaluate(({ canvas, selector }) => {
      const el = document.querySelector(selector)
      return {
        same: el.querySelector('canvas') === canvas,
        canvases: document.querySelectorAll('canvas[data-archive-shared]').length,
        stale: [...document.querySelectorAll('.archive-bridge__page')].filter(p => !el.contains(p) && +getComputedStyle(p).opacity > 0).length,
        visible: document.documentElement.dataset.archiveVisible,
      }
    }, { canvas, selector: selector(track) })
    assert.deepEqual(status, { same: true, canvases: 1, stale: 0, visible: 'true' })
  }
  for (const track of ['stack-work', 'about-life', 'work-contact', 'entry', 'frame-stack', 'life-frame', 'entry']) {
    await move(track, .8); await ready(track); await assertOwner(track)
    await move(track, .4); await assertOwner(track)
  }
  console.log('RAPID_FORWARD_REVERSE_JUMPS_KEEP_ONE_CANVAS_AND_NO_STALE_PAGES')
  const lose = async () => {
    await canvas.evaluate(canvas => {
      const ext = canvas.getContext('webgl2').getExtension('WEBGL_lose_context')
      if (!ext) throw new Error('Context-loss test extension unavailable')
      window.__archiveLossTest = ext
      ext.loseContext()
    })
    await page.waitForFunction(canvas => canvas.dataset.archiveState === 'recovering', canvas)
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.archive-bridge__page')].every(p => +getComputedStyle(p).opacity === 0)), true)
  }
  const restore = async () => { await page.evaluate(() => window.__archiveLossTest.restoreContext()) }
  await lose(); await restore(); await ready('entry'); await assertOwner('entry')
  console.log('ACTIVE_GPU_LOSS_RESTORES_SAME_ROOM_WITHOUT_MODEL_REFETCH')
  await lose()
  await move('frame-stack', .8)
  await restore(); await ready('frame-stack'); await assertOwner('frame-stack')
  console.log('CHAPTER_CHANGE_DURING_GPU_RECOVERY_RESUMES_CURRENT_CHAPTER')
  await move('frame-stack', 1)
  await page.waitForFunction(() => !document.querySelector('canvas[data-archive-shared]'))
  await lose(); await restore()
  await page.waitForFunction(canvas => canvas.dataset.archiveState === 'ready', canvas)
  await move('stack-work', .8); await ready('stack-work'); await assertOwner('stack-work')
  // Pinned chapter offsets are recalculated after a debounced resize refresh.
  // Do not seek using new viewport dimensions and still-old pin measurements.
  await page.evaluate(async () => {
    const { ScrollTrigger } = await import('/src/lib/gsap.ts')
    window.__archiveResizeSettled = false
    const refreshed = () => {
      ScrollTrigger.removeEventListener('refresh', refreshed)
      requestAnimationFrame(() => { window.__archiveResizeSettled = true })
    }
    ScrollTrigger.addEventListener('refresh', refreshed)
  })
  await page.setViewportSize({ width: 1728, height: 1080 })
  await page.waitForFunction(() => window.__archiveResizeSettled)
  await move('stack-work', .8); await ready('stack-work'); await assertOwner('stack-work')
  const owners = await page.evaluate(async () => {
    // Vite stamps dependencies after edits; inspect the same module instance.
    const source = await (await fetch('/src/components/personal-archive/archiveRuntime.ts')).text()
    const url = source.match(/from "([^"]*contextRegistry[^\"]*)"/)[1]
    return (await import(url)).activeContextOwners()
  })
  assert.equal(owners.filter(owner => owner === 'personal-archive-shared').length, 1)
  assert.ok(owners.length <= 3)
  assert.deepEqual(lateModels, []); assert.deepEqual(errors, [])
  console.log('OFFSCREEN_GPU_RECOVERY_AND_DESKTOP_RESIZE_PRESERVE_CONTEXT_BUDGET', owners)
  await lose()
  await page.waitForFunction(() => document.querySelector('[data-archive-track="stack-work"]').dataset.failed === 'true', null, { timeout: 25000 })
  assert.equal(await page.locator('[data-archive-track="stack-work"] .archive-bridge__page').evaluate(p => +getComputedStyle(p).opacity), 0)
  assert.ok(errors.every(error => /Archive GPU recovery timed out/.test(error)))
  started = false
  await Promise.all([
    page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
    page.locator('[data-archive-track="stack-work"] button').click(),
  ])
  await page.waitForSelector('#archive-entry', { state: 'attached', timeout: 120000 })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  await move('entry', .65); await ready('entry')
  console.log('PERMANENT_GPU_LOSS_EXPOSES_RELOAD_AND_REENTERS_READY_ROOM')
} finally { await browser.close() }
