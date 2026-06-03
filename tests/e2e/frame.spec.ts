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
  await expect(page.locator('.archive-cluster-marker')).toHaveCount(4)
  await expect(page.locator("[data-cluster-marker='building-surface-memory']")).toContainText('Surface Memory')
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

test('Building rail reaches its final cluster before Cuisine takes over', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  await page.evaluate(() => {
    document.querySelector('#frame')?.scrollIntoView()
  })
  await page.waitForTimeout(500)

  let sawFinalClusterBeforeCuisine = false
  let lastState = { finalVisible: false, cuisineTop: 0 }

  for (let i = 0; i < 80; i += 1) {
    await page.mouse.wheel(0, 760)
    await page.waitForTimeout(90)

    lastState = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>("[data-archive-theme='building']")
      const finalCluster = section?.querySelector<HTMLElement>("[data-cluster='building-night-current']")
      const cuisine = document.querySelector<HTMLElement>("[data-archive-theme='cuisine']")
      if (!finalCluster || !cuisine) return { finalVisible: false, cuisineTop: 0 }

      const finalRect = finalCluster.getBoundingClientRect()
      const cuisineRect = cuisine.getBoundingClientRect()
      return {
        finalVisible: finalRect.right > 0 && finalRect.left < window.innerWidth,
        cuisineTop: Math.round(cuisineRect.top),
      }
    })

    if (lastState.finalVisible && lastState.cuisineTop > 600) {
      sawFinalClusterBeforeCuisine = true
      break
    }

    if (lastState.cuisineTop <= 600) break
  }

  expect(sawFinalClusterBeforeCuisine, JSON.stringify(lastState)).toBe(true)
})
