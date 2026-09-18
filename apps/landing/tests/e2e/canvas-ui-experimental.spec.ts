import { expect, test } from '@playwright/test'
import { INTRO_TIMEOUT_MS } from './intro'

/**
 * Every canvas on the page must belong to a known owner.
 *
 * Both tests here used to assert `page.locator('canvas').count() <= 2`, which had
 * gone stale twice over: the horizontal bend draws through a capture canvas *and*
 * an output canvas, and the archive Index panel is `position: fixed`, so the hero
 * particle portrait never leaves the viewport and never unmounts. Four canvases,
 * against a budget of two, red since 46c62cb.
 *
 * A bare number also could not say which canvas was the surprising one. This
 * checks ownership instead, so it still fails on a leaked or duplicated surface
 * while being true about the four that are meant to be there.
 */
async function expectOnlyKnownCanvases(page: import('@playwright/test').Page, extra: readonly string[]) {
  const owners = ['.archive-stage', '.hero__canvas', ...extra]
  await expect.poll(async () => page.evaluate(
    selectors => [...document.querySelectorAll('canvas')]
      .filter(canvas => !selectors.some(selector => canvas.closest(selector)))
      .map(canvas => canvas.className || canvas.parentElement?.className || '(anonymous)'),
    owners,
  )).toEqual([])
}

test.skip(process.env.HTML_CANVAS_EXPERIMENTAL !== '1', 'Requires Chromium HTML-in-Canvas experimental feature.')

test('HTML-in-Canvas enables Frame Bend capture, rail advance and context-loss fallback', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })
  expect(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return false
    return typeof Reflect.get(context, 'drawElementImage') === 'function'
      && typeof Reflect.get(canvas, 'requestPaint') === 'function'
  })).toBe(true)

  await page.locator('#frame-building').scrollIntoViewIfNeeded()
  const bend = page.locator('#frame-building [data-horizontal-bend]')
  await expect(bend).toHaveAttribute('data-horizontal-bend', 'active')
  await expect(page.locator('#frame-building .frame-edge-blur').first()).toBeHidden()
  const semanticTrack = page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track')
  await expect(semanticTrack).toHaveCSS('opacity', '0')
  await expect(semanticTrack.locator('.archive-slot__caption').first()).toHaveCSS('visibility', 'visible')
  await expect(page.locator('#frame-building [data-horizontal-bend-capture] .archive-slot__caption').first()).toHaveCSS('visibility', 'visible')
  await expectOnlyKnownCanvases(page, ['#frame-building'])

  const bendCanvas = bend.locator('canvas').first()
  const pinRange = await page.locator('#frame-building').evaluate((section) => {
    const spacer = section.parentElement
    const spacerRect = spacer?.getBoundingClientRect()
    if (!spacer || !spacerRect) throw new Error('Frame building pin spacer is missing')
    return {
      start: spacerRect.top + window.scrollY,
      distance: Math.max(window.innerHeight, spacer.offsetHeight - window.innerHeight),
    }
  })
  const captureCenter = async () => {
    const box = await bendCanvas.boundingBox()
    if (!box) throw new Error('Frame Bend canvas has no visible bounds')
    return page.screenshot({
      clip: {
        x: box.x + box.width * 0.38,
        y: box.y + box.height * 0.18,
        width: box.width * 0.24,
        height: box.height * 0.64,
      },
    })
  }

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), pinRange.start + pinRange.distance * 0.2)
  await page.waitForTimeout(250)
  const earlyCapture = await captureCenter()
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), pinRange.start + pinRange.distance * 0.7)
  await page.waitForTimeout(250)
  const lateCapture = await captureCenter()
  expect(lateCapture.equals(earlyCapture), 'Bend canvas center must advance with the hidden DOM rail').toBe(false)

  await bend.locator('canvas').dispatchEvent('webglcontextlost')
  await expect(bend).toHaveAttribute('data-horizontal-bend', 'fallback')
  await expect(bend.locator('canvas')).toHaveCount(0)
  await expect(page.locator('#frame-building .frame-edge-blur').first()).toBeVisible()
  await expect(page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track')).toHaveCSS('opacity', '1')
  await expect(page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track .archive-slot__media').first()).toHaveCSS('opacity', '1')
})

/**
 * The Work transition tail that used to continue this test asserted
 * data-gate="locked" on #work-transition and clicked the liquid-metal-button
 * iframe to enter Projects. ArchiveWorkTransition renders that legacy surface
 * only for mobile and reduced motion; on desktop it is
 * ArchiveChapterBridge track="stack-work", so the attribute is never set and the
 * button is never in the DOM. Everything after it - the Projects laser's
 * html-canvas mode and capture state - was reached *through* that click, so it
 * went unreachable with it. That desktop laser coverage is now missing and wants
 * a test that arrives the way a reader does.
 */

test('the desktop chapter handoffs are archive bridges, not the legacy particle and gate surfaces', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })
  await expect(page.locator('[data-archive-track="frame-stack"]')).toHaveCount(1)
  await expect(page.locator('.frame-particle-handoff')).toHaveCount(0)
  // Same branch, same reason: the liquid-metal gate is the mobile/reduced surface.
  // Scoped to the section - the SciScope film dialog uses the same button
  // component on desktop, so a page-wide count is not the question here.
  await expect(page.locator('#work-transition[data-archive-track="stack-work"]')).toHaveCount(1)
  await expect(page.locator('#work-transition .liquid-metal-button')).toHaveCount(0)
  await expect(page.locator('#work-transition[data-gate]')).toHaveCount(0)
})
