import { expect, test } from '@playwright/test'

function readIntroCount(text: string | null) {
  return Number.parseInt(text ?? '0', 10)
}

test('Loader progress keeps moving and intro title layout remains stable', async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toBeVisible()
  await expect(page.locator('.intro__text-wrap--interactive')).toBeVisible()

  const textWrapPaint = await page.locator('.intro__text-wrap--interactive').evaluate((node) => {
    const style = window.getComputedStyle(node)
    return {
      contain: style.contain,
      overflow: style.overflow,
    }
  })
  expect(textWrapPaint.overflow).toBe('visible')
  expect(textWrapPaint.contain).not.toContain('paint')

  const firstCount = readIntroCount(await page.locator('.intro__counter > span').first().textContent())
  const firstWidths = await page.locator('.intro__char').evaluateAll((chars) =>
    chars.map((char) => Math.round(char.getBoundingClientRect().width))
  )

  await page.waitForTimeout(900)

  const introStillVisible = await page.locator('.intro').isVisible().catch(() => false)
  test.skip(!introStillVisible, 'Loader finished before the stability sample could be collected.')

  const secondCount = readIntroCount(await page.locator('.intro__counter > span').first().textContent())
  const secondWidths = await page.locator('.intro__char').evaluateAll((chars) =>
    chars.map((char) => Math.round(char.getBoundingClientRect().width))
  )

  expect(secondCount).toBeGreaterThan(firstCount)
  expect(secondWidths).toEqual(firstWidths)
})
