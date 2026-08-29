import { expect, test } from '@playwright/test'

test('core Landing narrative remains usable across browser engines', async ({ page }) => {
  const fatalErrors: string[] = []
  page.on('pageerror', (error) => {
    if (!/WebGL context|THREE\.Clock/i.test(error.message)) fatalErrors.push(error.message)
  })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('#hero .hero__name')).toContainText('Tim')

  const menuButton = page.getByRole('button', { name: /open section menu/i })
  await menuButton.click()
  const menu = page.locator('.staggered-section-menu')
  await expect(menu.getByRole('dialog', { name: 'Section map' })).toBeVisible()
  await expect(menu.locator('.staggered-section-menu__item').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()

  await page.goto('/#projects', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('#projects .border-glow-card')).toHaveCount(6)
  await expect(page.locator('.sciscope-film')).toHaveAttribute('data-mode', 'scroll-expand')
  expect(fatalErrors, fatalErrors.join('\n')).toEqual([])
})

