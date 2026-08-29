import { expect, test, type Page } from '@playwright/test'

async function waitForProjects(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await page.locator('#projects').scrollIntoViewIfNeeded()
}

test('project case study traps focus, pauses Lenis, and restores the trigger', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await waitForProjects(page)
  const trigger = page.locator('[data-case-study-trigger]').first()
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()

  expect(pageErrors, pageErrors.join('\n')).toEqual([])

  const dialog = page.locator('[data-project-dialog]')
  await expect(dialog).toBeVisible()
  await expect(page.locator('body')).toHaveAttribute('data-project-dialog-open', 'true')

  await dialog.locator('.project-dialog__shots a').first().click()
  await expect(dialog.locator('.pswp')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog.locator('.pswp')).toHaveCount(0)
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).not.toHaveAttribute('data-project-dialog-open', 'true')
})

test('project images open PhotoSwipe while SciScope film remains independent', async ({ page }) => {
  await waitForProjects(page)
  const mediaLink = page.locator('[data-project-id] .media-frame__open').first()
  await mediaLink.scrollIntoViewIfNeeded()
  await mediaLink.click()
  await expect(page.locator('.pswp')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.pswp')).toHaveCount(0)

  await expect(page.locator('.sciscope-film video')).not.toHaveClass(/pswp/)
  await expect(page.locator('.sciscope-film .media-frame__open')).toHaveCount(0)
})

test('mobile Projects uses an Embla rail without claiming vertical touch gestures', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await waitForProjects(page)

  const carousel = page.locator('[data-project-carousel]').first()
  await expect(carousel).toBeVisible()
  const touchAction = await carousel.locator('.project-carousel__viewport').evaluate(
    (node) => getComputedStyle(node).touchAction,
  )
  expect(touchAction).toContain('pan-y')
  await expect(carousel.locator('.project-carousel__slide')).not.toHaveCount(0)
})
