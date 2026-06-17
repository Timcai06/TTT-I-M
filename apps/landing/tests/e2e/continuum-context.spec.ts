import { expect, test, type Page } from '@playwright/test'

async function waitForLive(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context|THREE\.Clock/i.test(error.message)) return
    throw error
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await page.waitForTimeout(300)
}

async function canvasCount(page: Page) {
  return page.evaluate(() =>
    document.querySelectorAll('canvas:not(.laser-flow-canvas):not(.strands-canvas):not(.shape-blur-canvas)').length
  )
}

test('Particle Continuum does not leak WebGL canvases across chapter jumps', async ({ page }) => {
  await waitForLive(page)

  const samples: number[] = [await canvasCount(page)]
  const jumps = ['01 · About', '02 · Frame', '03 · Stack', '04 · Work', '05 · Contact', '00 · Index']

  for (const label of jumps) {
    await page.getByRole('button', { name: label }).click()
    await page.waitForTimeout(850)
    samples.push(await canvasCount(page))
  }

  expect(Math.max(...samples), `canvas samples: ${samples.join(', ')}`).toBeLessThanOrEqual(2)
})
