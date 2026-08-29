import { expect, test } from '@playwright/test'

test.skip(process.env.HTML_CANVAS_EXPERIMENTAL !== '1', 'Requires Chromium HTML-in-Canvas experimental feature.')

test('HTML-in-Canvas enables Bend capture and Laser content refraction', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
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
  await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)

  await bend.locator('canvas').dispatchEvent('webglcontextlost')
  await expect(bend).toHaveAttribute('data-horizontal-bend', 'fallback')
  await expect(page.locator('#frame-building .frame-edge-blur').first()).toBeVisible()

  const transition = page.locator('#work-transition')
  const gateTarget = await transition.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top + window.scrollY + (rect.height - window.innerHeight) * 0.995
  })
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), gateTarget)
  await expect(transition).toHaveAttribute('data-gate', 'locked')
  await transition.frameLocator('.liquid-metal-button__frame').locator('#btn').click()
  await expect(page.locator('#projects .projects__laser')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('#projects .projects__laser canvas').first()).toBeAttached()
  await expect(page.locator('#projects .projects__laser')).toHaveAttribute('data-mode', 'html-canvas')
  await expect(page.locator('#projects [data-project-laser-capture]')).toHaveCount(1)
  await expect(page.locator('#projects .projects__laser-capture')).toHaveAttribute('data-capture-state', 'ready')
  await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)
  await expect(page.locator(
    '#projects .projects__intro-sticky > .projects__intro-content .projects__bento button',
  ).first()).toBeEnabled()
})
