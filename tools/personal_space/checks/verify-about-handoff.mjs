// Full About content/layout continuity, in ordinary and experimental Chrome.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

for (const experimental of [false, true]) {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: experimental ? ['--enable-blink-features=CanvasDrawElement'] : [],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
    const move = async p => {
      await page.evaluate(async p => {
        const root = document.querySelector('#archive-entry')
        const { getLenis } = await import('/src/lib/lenis.ts')
        getLenis().scrollTo(root.getBoundingClientRect().top + scrollY + p * (root.offsetHeight - innerHeight), { immediate: true, force: true })
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }, p)
    }
    await move(.998)
    const comparison = await page.evaluate(() => {
      const projected = document.querySelector('#archive-entry .archive-bridge__page')
      const live = document.querySelector('#about .about-decrypt__content:not([data-canvas-ui-capture])')
      const shape = (root, selector) => {
        const node = root.querySelector(selector), rect = node.getBoundingClientRect(), origin = root.getBoundingClientRect(), css = getComputedStyle(node)
        return { text: node.textContent.replace(/\s+/g, ' ').trim(), font: css.fontFamily, size: css.fontSize,
          box: [rect.left-origin.left, rect.top-origin.top, rect.width, rect.height] }
      }
      const selectors = ['.about__dossier-header', '.about__lead', '.about__dossier-summary', '.about__portrait-frame', '.about__dossier-meta']
      const image = projected.querySelector('img')
      return { pairs: selectors.map(selector => [shape(projected, selector), shape(live, selector)]),
        portrait: { ready: image.complete && image.naturalWidth > 0, same: image.currentSrc === live.querySelector('img').currentSrc },
        opacity: getComputedStyle(projected).opacity, merge: projected.style.getPropertyValue('--paper-merge'),
        pins: projected.querySelectorAll('.pin-spacer, canvas, [data-canvas-ui-capture]').length }
    })
    assert.equal(comparison.opacity, '1'); assert.equal(comparison.merge, '100%')
    assert.deepEqual(comparison.portrait, { ready: true, same: true }); assert.equal(comparison.pins, 0)
    for (const [paper, live] of comparison.pairs) {
      assert.equal(paper.text, live.text); assert.equal(paper.font, live.font); assert.equal(paper.size, live.size)
      paper.box.forEach((value, i) => assert.ok(Math.abs(value-live.box[i]) < .5, `About handoff layout differs: ${JSON.stringify({paper,live})}`))
    }
    await move(1)
    assert.equal(await page.locator('#archive-entry .archive-bridge__stage').evaluate(el => getComputedStyle(el).visibility), 'hidden')
    assert.equal(await page.locator('#about .about-decrypt').evaluate(el => getComputedStyle(el).visibility), 'visible')
    await move(.65)
    await page.waitForFunction(() => +document.querySelector('#archive-entry .archive-bridge__page').style.opacity > .99)
    assert.equal(await page.locator('#about .about-decrypt').evaluate(el => getComputedStyle(el).visibility), 'hidden')
    assert.deepEqual(errors, [])
    console.log('FULL_ABOUT_PORTRAIT_AND_LAYOUT_MATCH_IN_BOTH_DIRECTIONS', { experimental })
  } finally { await browser.close() }
}
