import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'

type Commit = {
  kind: string
  frameId: number
  position?: { segment: string; progress: number }
  permit?: { owner: string }
}

async function alignSectionProgress(section: Locator, targetProgress: number) {
  await expect.poll(async () => section.evaluate((node, progress) => {
    const rect = node.getBoundingClientRect()
    const distance = Math.max(1, rect.height - window.innerHeight)
    const current = -rect.top / distance
    if (Math.abs(current - progress) > 0.005) {
      window.scrollTo({ top: window.scrollY + (progress - current) * distance, behavior: 'auto' })
    }
    return Math.abs(current - progress)
  }, targetProgress)).toBeLessThan(0.01)
}

async function boot(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    ;(window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
}

async function commits(page: Page) {
  return page.evaluate(() => (
    window as unknown as { __portfolioArchiveExecution: { getSnapshot(): Commit[] } }
  ).__portfolioArchiveExecution.getSnapshot().filter(record => record.kind === 'sample-committed'))
}

async function exerciseBridge(browser: Browser, shadowFlag: boolean) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript((enabled) => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    ;(window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
    if (enabled) {
      ;(window as Window & { __portfolioArchiveStoryShadowEnabled?: boolean }).__portfolioArchiveStoryShadowEnabled = true
    }
  }, shadowFlag)
  try {
    await page.goto('/?archiveSample=legacy', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
    const bridge = page.locator('[data-archive-track="about-life"]')
    await alignSectionProgress(bridge, 0.48)
    await expect(bridge).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 })
    await expect(bridge).toHaveAttribute('data-failed', 'false')
    const canvas = page.locator('canvas[data-archive-shared="true"]')
    await expect(canvas).toHaveAttribute('data-archive-shot', 'about-life')
    const latest = (await commits(page)).at(-1)
    return {
      errors,
      shadowExposed: await page.evaluate(() => '__portfolioArchiveStoryShadow' in window),
      segment: latest?.position?.segment,
      progress: latest?.position?.progress,
      owner: latest?.permit?.owner,
    }
  } finally {
    await context.close()
  }
}

test('retired shadow and legacy query cannot fork the production sample path', async ({ browser }) => {
  const withoutFlag = await exerciseBridge(browser, false)
  const withFlag = await exerciseBridge(browser, true)

  expect(withoutFlag.errors).toEqual([])
  expect(withFlag.errors).toEqual([])
  expect(withoutFlag.shadowExposed).toBe(false)
  expect(withFlag.shadowExposed).toBe(false)
  expect(withFlag.owner).toBe('sample')
  expect(withFlag.segment).toBe('about-life')
  expect(withFlag.progress).toBeCloseTo(withoutFlag.progress ?? -1, 8)
})

test('an occupied retired shadow global cannot change successful sample drawing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__portfolioArchiveStoryShadow', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: 'occupied-by-existing-diagnostic',
    })
  })
  await boot(page)
  const bridge = page.locator('[data-archive-track="about-life"]')
  await alignSectionProgress(bridge, 0.4)
  await expect(bridge).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 })
  await expect(page.locator('canvas[data-archive-shared="true"]')).toHaveAttribute('data-archive-shot', 'about-life')
  expect((await commits(page)).at(-1)?.permit?.owner).toBe('sample')
  expect(await page.evaluate(() => (
    window as Window & { __portfolioArchiveStoryShadow?: unknown }
  ).__portfolioArchiveStoryShadow)).toBe('occupied-by-existing-diagnostic')
})

test('an actual renderer throw still follows the shared runtime failure path', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const prototype = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>
      const original = prototype[method]
      prototype[method] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        const canvas = this.canvas as HTMLCanvasElement
        if (canvas?.dataset.archiveShared === 'true' && document.documentElement.dataset.nr05RendererFailure === 'armed') {
          document.documentElement.dataset.nr05RendererFailure = 'consumed'
          throw new Error('NR-05 controlled renderer failure')
        }
        return original.apply(this, args)
      }
    }
  })
  await boot(page)
  const bridge = page.locator('[data-archive-track="about-life"]')
  await alignSectionProgress(bridge, 0.4)
  await expect(bridge).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 })
  await page.evaluate(() => { document.documentElement.dataset.nr05RendererFailure = 'armed' })
  await alignSectionProgress(bridge, 0.48)
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.nr05RendererFailure)).toBe('consumed')
  await expect(bridge).toHaveAttribute('data-failed', 'true')
  await expect(bridge).toHaveAttribute('data-scene-ready', 'false')
  await expect(page.locator('canvas[data-archive-shared="true"]')).toHaveAttribute('data-archive-state', 'failed')
  const failedFrame = (await commits(page)).at(-1)?.frameId
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
  await page.evaluate(() => window.scrollBy(0, 8))
  await expect(page.locator('canvas[data-archive-shared="true"]')).toHaveAttribute('data-archive-state', 'failed')
  expect((await commits(page)).at(-1)?.frameId).toBe(failedFrame)
})
