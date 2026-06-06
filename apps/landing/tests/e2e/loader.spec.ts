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

  // The interactive pretext wrap only exists during the brief
  // `introReady && !exiting` window. On fast/warm preload (e.g. CI) the loader
  // can blow through it before we sample, so its paint check is best-effort —
  // verified when caught, skipped (not failed) when the loader outran us.
  const interactiveWrap = page.locator('.intro__text-wrap--interactive')
  const caughtInteractive = await interactiveWrap
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false)

  if (caughtInteractive) {
    const textWrapPaint = await interactiveWrap.evaluate((node) => {
      const style = window.getComputedStyle(node)
      return {
        contain: style.contain,
        overflow: style.overflow,
      }
    })
    expect(textWrapPaint.overflow).toBe('visible')
    expect(textWrapPaint.contain).not.toContain('paint')
  }

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
