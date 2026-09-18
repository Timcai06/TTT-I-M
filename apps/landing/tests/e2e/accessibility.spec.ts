import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { INTRO_TIMEOUT_MS } from './intro'

test('Landing has no automatic WCAG A/AA violations after hand-off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})

