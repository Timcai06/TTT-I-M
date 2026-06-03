import { expect, test } from '@playwright/test'

test('Frame keeps the horizontal archive structure available', async ({ page }) => {
  page.on('pageerror', (error) => {
    if (/WebGL context/i.test(error.message)) return
    throw error
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  await page.evaluate(() => {
    document.querySelector('#frame')?.scrollIntoView()
  })

  await expect(page.locator('#frame')).toBeVisible()
  await expect(page.locator('.archive-theme-section')).toHaveCount(3)
  await expect(page.locator('.archive-theme-section__track').first()).toBeVisible()
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')

  const trackTransform = await page.locator('.archive-theme-section__track').first().evaluate((node) => {
    return window.getComputedStyle(node).transform
  })

  expect(trackTransform).not.toBe('none')
  await expect(page.locator('.archive-slot__media img').first()).toBeVisible()

  await page.mouse.wheel(0, 1600)
  await page.waitForTimeout(500)

  await page.screenshot({ path: 'test-results/frame-smoke.png', fullPage: false })
})
