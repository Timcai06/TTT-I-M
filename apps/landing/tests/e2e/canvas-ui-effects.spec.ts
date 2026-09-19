import { expect, test, type Page } from '@playwright/test'
import { INTRO_TIMEOUT_MS } from './intro'

async function waitForLive(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })
}

/** Put the pointer inside #contact, which is what arms the footer liquid. */
async function hoverContact(page: import('@playwright/test').Page) {
  const box = await page.locator('#contact').boundingBox()
  if (!box) throw new Error('#contact has no box to hover')
  const x = box.x + box.width / 2
  const y = Math.max(1, Math.min(box.y + box.height / 2, (page.viewportSize()?.height ?? 900) - 2))
  await page.mouse.move(x, y)
  await page.mouse.move(x + 6, y + 4, { steps: 4 })
}

test('stable Chromium keeps Frame DOM fallback and a non-blocking Projects laser', async ({ page }) => {
  const fatal: string[] = []
  page.on('pageerror', (error) => {
    if (!/WebGL context|THREE\.Clock/i.test(error.message)) fatal.push(error.message)
  })
  await waitForLive(page)

  await page.locator('#frame-building').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await expect(page.locator('#frame-building [data-horizontal-bend="active"]')).toHaveCount(0)
  await expect(page.locator('#frame-building .frame-edge-blur')).toHaveCount(2)

  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  const intro = page.locator('#projects .projects__intro')
  const layout = await intro.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    viewport: window.innerHeight,
    overflowY: getComputedStyle(node).overflowY,
  }))
  expect(layout.height).toBeGreaterThan(layout.viewport * 0.9)
  expect(layout.overflowY).not.toBe('scroll')
  await expect(page.locator('#projects .projects__laser canvas')).toHaveCount(0)
  await expect(page.locator('#projects .projects__bento button').first()).toBeEnabled()
  expect(fatal).toEqual([])
})

test('the end of the stack-to-work bridge yields to an explicit Contact jump', async ({ page }) => {
  // This asserted data-gate locked -> open on #work-transition. That gate is the
  // liquid-metal one in WorkTransition, and ArchiveWorkTransition renders it only
  // for mobile and reduced motion; on desktop the section is
  // ArchiveChapterBridge track="stack-work", which has no forward gate at all, so
  // the attribute is never set.
  //
  // What the test was protecting is still worth protecting: sitting at the very
  // end of that transition must not trap the reader when they ask for a chapter
  // by name. That is asserted directly now.
  await waitForLive(page)
  const transition = page.locator('#work-transition')
  await expect(transition).toHaveAttribute('data-archive-track', 'stack-work')
  await expect(transition.locator('.liquid-metal-button')).toHaveCount(0)
  const target = await transition.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top + scrollY + (rect.height - innerHeight) * 0.995
  })
  await page.evaluate((top) => scrollTo({ top, behavior: 'auto' }), target)

  await page.getByRole('button', { name: 'Scroll to CONTACT', exact: true }).click()
  await expect(page.locator('#contact')).toBeInViewport({ timeout: 20_000 })
})

test('Footer liquid stays pointer-transparent and reduced motion mounts no optional canvases', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await waitForLive(page)
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(page.locator('.footer-liquid canvas')).toHaveCount(0)
  await expect(page.locator('.projects__laser canvas')).toHaveCount(0)
  await expect(page.locator('.horizontal-bend canvas')).toHaveCount(0)
  const email = page.locator('.contact__btn--email')
  await expect(email).toBeVisible()
  await email.click({ trial: true })
  await context.close()
})

test('Footer liquid acquires a fresh context after leaving and re-entering Contact', async ({ page }) => {
  // Headless Linux can expose four logical cores, which intentionally selects
  // the low-tier one-context budget already occupied by the required Hero.
  // This test targets lifecycle reacquisition, so pin a deterministic high-tier
  // profile; low-tier fallback is covered by the degradation tests.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 })
  })
  await waitForLive(page)
  const liquid = page.locator('.footer-liquid')

  await page.evaluate(() => window.history.replaceState(null, '', '#contact'))
  await page.locator('#contact').scrollIntoViewIfNeeded()
  // The liquid is pointer-driven: FooterLiquidCursor only activates while
  // `pointerInside` is true, set from pointerenter/pointermove on #contact. This
  // test asserted is-active before ever moving the pointer in - its mouse moves
  // came twenty lines later - so it was asserting activation without satisfying
  // activation's precondition. Its real subject is reacquisition after leaving
  // and re-entering Contact, which is unchanged.
  await hoverContact(page)
  await expect(liquid).toHaveClass(/is-active/)
  await expect(liquid).toHaveAttribute('data-liquid-state', 'live')
  await expect(liquid).toHaveCSS('pointer-events', 'none')
  const viewportLayer = await liquid.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, vw: innerWidth, vh: innerHeight }
  })
  expect(Math.abs(viewportLayer.x)).toBeLessThan(2)
  expect(Math.abs(viewportLayer.y)).toBeLessThan(2)
  expect(Math.abs(viewportLayer.width - viewportLayer.vw)).toBeLessThan(2)
  expect(Math.abs(viewportLayer.height - viewportLayer.vh)).toBeLessThan(2)
  await page.mouse.move(760, 620)
  await page.mouse.move(1080, 680, { steps: 8 })

  await page.locator('#projects').scrollIntoViewIfNeeded()
  await expect(liquid).not.toHaveClass(/is-active/)
  await expect(liquid).toHaveAttribute('data-liquid-state', 'idle')

  await page.locator('#contact').scrollIntoViewIfNeeded()
  await hoverContact(page)
  await expect(liquid).toHaveClass(/is-active/)
  await expect(liquid).toHaveAttribute('data-liquid-state', 'live')
  await expect(liquid.locator('canvas')).not.toHaveAttribute('data-context-state', 'lost')
})

test('Loader exposes the local two-cell status without changing the real preload gate', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const loader = page.locator('.intro')
  if (await loader.count()) {
    await expect(loader.locator('.intro__spinner')).toHaveAttribute('aria-hidden', 'true')
    await expect(loader.locator('.intro__stage')).not.toHaveText('')
  }
  await expect(loader).toHaveCount(0, { timeout: INTRO_TIMEOUT_MS })
})
