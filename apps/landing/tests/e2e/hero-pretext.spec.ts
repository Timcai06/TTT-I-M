import { expect, test } from '@playwright/test'
import { INTRO_TIMEOUT_MS } from './intro'

test('Hero name hover interaction is ready as soon as the loader clears', async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })

  const firstGlyph = page.locator('.hero__name .pretext-glyph').first()
  await expect(firstGlyph).toBeVisible()

  const box = await firstGlyph.boundingBox()
  expect(box).not.toBeNull()

  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2)

  // No fixed wait needed: toHaveCSS polls until the hover transform lands.
  await expect(firstGlyph).toHaveCSS('transform', /matrix/)
})
