import { expect, test } from '@playwright/test'

test('Scroll indicator stays aligned with the active chapter after navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })

  await page.getByRole('button', { name: '02 · Frame' }).click()
  await expect(page.locator('#frame')).toBeInViewport()
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')
  await expect(page.locator('.scroll-indicator__label')).toContainText('03')
  await expect(page.locator('.scroll-indicator__label')).toContainText('FRAME')
  await expect(page.locator('.scroll-indicator__segment.is-active')).toHaveAttribute('aria-label', 'Scroll to FRAME')

  await page.getByRole('button', { name: '04 · Work' }).click()
  await expect(page.locator('#projects')).toBeInViewport()
  await expect(page.locator('.nav__link.is-active')).toContainText('Work')
  await expect(page.locator('.scroll-indicator__label')).toContainText('05')
  await expect(page.locator('.scroll-indicator__label')).toContainText('WORK')
  await expect(page.locator('.scroll-indicator__segment.is-active')).toHaveAttribute('aria-label', 'Scroll to WORK')
})

test('Staggered section map opens from the retained top nav and jumps to chapters', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })

  await expect(page.locator('.nav__links')).toBeVisible()
  const menuButton = page.getByRole('button', { name: /open section menu/i })
  await menuButton.click()
  const menu = page.locator('.staggered-section-menu')
  await expect(menu.locator('.staggered-section-menu__panel')).toBeVisible()
  await expect(page.locator('.staggered-section-menu__kicker')).toContainText('Section Map')
  await expect(menu.locator('.staggered-section-menu__item').first()).toBeFocused()
  expect(await menu.evaluate((node) => node.hasAttribute('inert'))).toBe(false)

  await page.keyboard.press('Escape')
  await expect(menu).toHaveAttribute('aria-hidden', 'true')
  expect(await menu.evaluate((node) => node.hasAttribute('inert'))).toBe(true)
  await expect(menuButton).toBeFocused()

  await menuButton.click()
  await expect(menu.locator('.staggered-section-menu__item').first()).toBeFocused()

  await page.locator('.staggered-section-menu__panel').getByRole('button', { name: /Frame/ }).click()
  await page.waitForFunction(() => window.location.hash === '#frame', null, { timeout: 15_000 })
  await expect(page.locator('#frame')).toBeInViewport()
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')
})

test('Direct Contact hash lands on a stable readable footer', async ({ page }) => {
  await page.goto('/#contact', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.locator('#contact')).toBeInViewport()

  const footerState = await page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('#contact')
    const inner = document.querySelector<HTMLElement>('.footer__inner')
    const ascii = document.querySelector<HTMLElement>('.footer__ascii')
    const irisWrap = document.querySelector<HTMLElement>('.contact__blob-wrap')
    const irisCore = document.querySelector<SVGCircleElement>('[data-iris-core]')
    if (!footer || !inner) return null

    return {
      footerClass: footer.className,
      footerTop: footer.getBoundingClientRect().top,
      footerBg: getComputedStyle(footer).backgroundColor,
      innerOpacity: Number(getComputedStyle(inner).opacity),
      asciiOpacity: ascii ? Number(getComputedStyle(ascii).opacity) : 0,
      irisWrapOpacity: irisWrap ? Number(getComputedStyle(irisWrap).opacity) : 0,
      irisWrapVisibility: irisWrap ? getComputedStyle(irisWrap).visibility : 'missing',
      irisCoreRadius: irisCore ? Number(irisCore.getAttribute('r')) : 0,
    }
  })

  expect(footerState).not.toBeNull()
  expect(footerState?.footerClass).toContain('is-iris-reveal')
  expect(footerState?.footerTop ?? Number.POSITIVE_INFINITY).toBeLessThan(220)
  expect(footerState?.innerOpacity).toBe(1)
  expect(footerState?.asciiOpacity).toBeGreaterThan(0.3)
  await expect(page.locator('.footer__ascii pre')).toHaveCount(1)
  expect(footerState?.irisWrapOpacity).toBeGreaterThan(0.95)
  expect(footerState?.irisWrapVisibility).toBe('visible')
  expect(footerState?.irisCoreRadius).toBeGreaterThan(0)
})
