// Functional browser checks only. Never captures or judges rendered images.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath, headless: true })
const url = process.env.LANDING_RUNTIME_URL ?? 'http://127.0.0.1:5173/'
try {
  const page = await browser.newPage({ viewport: { width: 1496, height: 756 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error' && /THREE|GLSL|WebGL|shader/i.test(msg.text())) errors.push(msg.text()) })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-archive-track="work-contact"]', { state: 'attached' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  const move = async (track, p) => {
    await page.evaluate(async ({ track, p }) => {
      const el = document.querySelector(`[data-archive-track="${track}"]`)
      const { getLenis } = await import('/src/lib/lenis.ts')
      getLenis().scrollTo(el.getBoundingClientRect().top + scrollY + p * (el.offsetHeight - innerHeight), { immediate: true, force: true })
      // ScrollTrigger samples scroll first; the shared renderer draws on the next frame.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }, { track, p })
  }
  for (const track of ['about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']) {
    await move(track, .68)
    await page.waitForFunction(track => document.querySelector(`[data-archive-track="${track}"]`)?.dataset.sceneReady === 'true', track)
    const transfer = await page.locator(`[data-archive-track="${track}"]`).evaluate(el => {
      const paper = el.querySelector('.archive-chapter-bridge__page')
      return { display: getComputedStyle(paper).display, pins: paper.querySelectorAll('.pin-spacer,canvas,section').length, text: paper.textContent.trim().length }
    })
    assert.equal(transfer.display, 'none', `${track}: HTML must never paint over the room`)
    assert.equal(transfer.pins, 0, `${track}: live chapter machinery leaked into preview`)
    assert.ok(transfer.text > 10)
    await move(track, .8)
    await page.waitForFunction(track => document.querySelector('canvas[data-archive-shared]')?.dataset.archiveShot === track, track)
    await move(track, 1)
    await page.waitForFunction(track => {
      const el = document.querySelector(`[data-archive-track="${track}"]`)
      return el.dataset.phase === 'released' && !el.querySelector('canvas')
    }, track)
    assert.equal(await page.locator(`[data-archive-track="${track}"] .archive-chapter-bridge__page`).evaluate(el => +getComputedStyle(el).opacity), 0, `${track}: released paper remains visible`)
    await move(track, .8)
    await page.waitForFunction(track => document.querySelector(`[data-archive-track="${track}"]`)?.dataset.sceneReady === 'true', track)
    console.log('CHAPTER_TRANSFER_REVERSE_RELEASE', track, transfer)
  }
  for (const target of ['about', 'life', 'frame', 'skills', 'projects', 'contact']) {
    await page.evaluate(async target => (await import('/src/lib/chapterScroll.ts')).scrollToChapter(target, { immediate: true, updateHash: true }), target)
    await page.waitForFunction(target => {
      const bridge = document.querySelector(`[data-archive-target="${target}"]`)
      return getComputedStyle(bridge.querySelector('.archive-bridge__stage')).visibility === 'hidden'
    }, target)
  }
  console.log('DIRECT_CHAPTER_LINKS_RELEASE_SPATIAL_LAYER')
  await page.evaluate(async () => (await import('/src/lib/chapterScroll.ts')).scrollToChapter('life', { immediate: true }))
  const photo = page.locator('#life .drift-wall__semantic a').first()
  await photo.evaluate(node => node.click())
  await page.waitForSelector('.pswp--open')
  await page.keyboard.press('Escape')
  await page.waitForSelector('.pswp', { state: 'detached' })
  console.log('LIFE_PHOTO_OPENS_AND_RETURNS')
  await page.evaluate(async () => (await import('/src/lib/chapterScroll.ts')).scrollToChapter('projects', { immediate: true, updateHash: true }))
  await page.waitForTimeout(300)
  const card = page.locator('[data-project-id]').first()
  const id = await card.getAttribute('data-project-id')
  await card.locator('button').first().scrollIntoViewIfNeeded()
  await card.locator('button').first().click()
  await page.waitForSelector(`[data-project-dialog="${id}"]`)
  await page.waitForFunction(() => !document.querySelector('.case-image-transition'))
  assert.equal(new URL(page.url()).searchParams.get('project'), id)
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-project-dialog]', { state: 'detached' })
  assert.equal(new URL(page.url()).searchParams.get('project'), null)
  await page.goForward()
  await page.waitForSelector(`[data-project-dialog="${id}"]`)
  await page.reload()
  await page.waitForSelector(`[data-project-dialog="${id}"]`)
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-project-dialog]', { state: 'detached' })
  assert.equal(new URL(page.url()).searchParams.get('project'), null)
  console.log('CASE_OPEN_CLOSE_FORWARD_RELOAD')
  assert.deepEqual(errors, [])
} finally { await browser.close() }
