import { expect, type Page, test } from '@playwright/test'

async function openMobileHome(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.querySelector('.intro')?.remove())
}

test('Mobile Hero presents title and portrait in the first viewport', async ({ page }) => {
  await openMobileHome(page)

  const heroLayout = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.nav')
    const title = document.querySelector<HTMLElement>('.hero__name')
    const ghost = document.querySelector<HTMLImageElement>('.hero__ghost')
    const navRect = nav?.getBoundingClientRect()
    const titleRect = title?.getBoundingClientRect()
    const ghostRect = ghost?.getBoundingClientRect()

    return {
      navHeight: navRect ? Math.round(navRect.height) : 0,
      titleText: title?.textContent?.trim(),
      titleRect: titleRect ? {
        top: Math.round(titleRect.top),
        bottom: Math.round(titleRect.bottom),
        width: Math.round(titleRect.width),
        height: Math.round(titleRect.height),
      } : null,
      ghostRect: ghostRect ? {
        left: Math.round(ghostRect.left),
        right: Math.round(ghostRect.right),
        width: Math.round(ghostRect.width),
        height: Math.round(ghostRect.height),
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
  })

  expect(heroLayout.navHeight).toBeLessThanOrEqual(72)
  expect(heroLayout.titleText).toContain('Tim')
  expect(heroLayout.titleText).toContain('Cai')
  expect(heroLayout.titleRect?.top).toBeGreaterThanOrEqual(heroLayout.navHeight + 24)
  expect(heroLayout.titleRect?.bottom).toBeLessThanOrEqual(heroLayout.viewport.height - 72)
  expect(heroLayout.titleRect?.width).toBeGreaterThan(260)
  expect(heroLayout.ghostRect?.left).toBeGreaterThanOrEqual(-40)
  expect(heroLayout.ghostRect?.right).toBeLessThanOrEqual(heroLayout.viewport.width + 80)
})
