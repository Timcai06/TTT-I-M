// Technical paint/geometry checks; no screenshots and no aesthetic verdict.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1496, height: 756 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
  for (const shot of ['entry', 'about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']) {
    const steps = [.05, .2, .4, .52, .62, .72, .78, .84, .9, .939, .945, .965, .99]
    for (const p of [...steps, ...steps.toReversed()]) {
      await page.evaluate(async ({ shot, p }) => {
        const root = document.querySelector(shot === 'entry' ? '#archive-entry' : `[data-archive-track="${shot}"]`)
        const { getLenis } = await import('/src/lib/lenis.ts')
        getLenis().scrollTo(root.getBoundingClientRect().top + scrollY + p * (root.offsetHeight - innerHeight), { immediate: true, force: true })
      }, { shot, p })
      await page.waitForFunction(({ shot, p }) => {
        const canvas = document.querySelector('canvas[data-archive-shared]')
        return canvas?.dataset.archiveShot === shot && Math.abs(+canvas.dataset.archiveProgress - p) < .002 && canvas.dataset.archiveState === 'ready'
      }, { shot, p })
      const result = await page.evaluate(() => {
        const canvas = document.querySelector('canvas[data-archive-shared]')
        return { sheet: canvas.dataset.archiveSheet, p: +canvas.dataset.archiveProgress,
          unrelatedDomPaint: [...document.querySelectorAll('.archive-chapter-bridge__page')].some(el => getComputedStyle(el).display !== 'none'),
          clonedPins: document.querySelectorAll('.archive-bridge__page .pin-spacer').length }
      })
      assert.equal(result.unrelatedDomPaint, false, `${shot}/${p}: unrelated chapter HTML paints over the room`)
      assert.equal(result.clonedPins, 0)
      if (result.sheet !== 'hidden') {
        const sheet = JSON.parse(result.sheet)
        assert.equal(sheet.depthTest, true)
        assert.ok(sheet.projected.flat().every(Number.isFinite), `${shot}/${p}: nonfinite projection`)
        assert.ok(sheet.projected.every(v => v[2] >= -1 && v[2] <= 1), `${shot}/${p}: sheet crosses clip plane`)
        if (sheet.merge > 0) {
          assert.equal(sheet.expand, 1, `${shot}/${p}: dark partial panel`)
          const [tl, tr, br, bl] = sheet.projected
          assert.ok(tl[0] <= -1 + 1e-8 && bl[0] <= -1 + 1e-8 && tr[0] >= 1 - 1e-8 && br[0] >= 1 - 1e-8 && tl[1] >= 1 - 1e-8 && tr[1] >= 1 - 1e-8 && bl[1] <= -1 + 1e-8 && br[1] <= -1 + 1e-8, `${shot}/${p}: dark sheet does not cover viewport`)
        }
      } else if (shot !== 'work-contact' && p >= .78) assert.fail(`${shot}/${p}: missing reading sheet`)
    }
    console.log('NO_PARTIAL_DARK_PANEL_FORWARD_REVERSE', shot)
  }
  assert.deepEqual(errors, [])
} finally { await browser.close() }
