import { expect, test } from '@playwright/test'

test('Scroll indicator stays aligned with the active chapter after navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })

  await page.getByRole('button', { name: '02 · Frame' }).click()
  await expect(page.locator('#frame')).toBeInViewport()
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')
  await expect(page.locator('.scroll-indicator__label')).toContainText('03')
  await expect(page.locator('.scroll-indicator__label')).toContainText('FRAME')
  await expect(page.locator('.scroll-indicator__segment.is-active')).toHaveAttribute('aria-label', 'Scroll to FRAME')

  await page.getByRole('button', { name: '04 · Work' }).click()
  await expect(page.locator('#projects')).toBeInViewport()
  await expect(page.locator('.nav__link.is-active')).toContainText('Work')
  await expect(page.locator('.scroll-indicator__label')).toContainText('05')
  await expect(page.locator('.scroll-indicator__label')).toContainText('WORK')
  await expect(page.locator('.scroll-indicator__segment.is-active')).toHaveAttribute('aria-label', 'Scroll to WORK')
})
