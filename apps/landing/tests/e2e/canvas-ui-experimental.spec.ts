import { expect, test } from '@playwright/test'

test.skip(process.env.HTML_CANVAS_EXPERIMENTAL !== '1', 'Requires Chromium HTML-in-Canvas experimental feature.')

test('HTML-in-Canvas enables Bend capture and Laser content refraction', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  expect(await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return false
    return typeof Reflect.get(context, 'drawElementImage') === 'function'
      && typeof Reflect.get(canvas, 'requestPaint') === 'function'
  })).toBe(true)

  await page.locator('#frame-building').scrollIntoViewIfNeeded()
  const bend = page.locator('#frame-building [data-horizontal-bend]')
  await expect(bend).toHaveAttribute('data-horizontal-bend', 'active')
  await expect(page.locator('#frame-building .frame-edge-blur').first()).toBeHidden()
  const semanticTrack = page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track')
  await expect(semanticTrack).toHaveCSS('opacity', '0')
  await expect(semanticTrack.locator('.archive-slot__caption').first()).toHaveCSS('visibility', 'visible')
  await expect(page.locator('#frame-building [data-horizontal-bend-capture] .archive-slot__caption').first()).toHaveCSS('visibility', 'visible')
  await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)

  const bendCanvas = bend.locator('canvas').first()
  const pinRange = await page.locator('#frame-building').evaluate((section) => {
    const spacer = section.parentElement
    const spacerRect = spacer?.getBoundingClientRect()
    if (!spacer || !spacerRect) throw new Error('Frame building pin spacer is missing')
    return {
      start: spacerRect.top + window.scrollY,
      distance: Math.max(window.innerHeight, spacer.offsetHeight - window.innerHeight),
    }
  })
  const captureCenter = async () => {
    const box = await bendCanvas.boundingBox()
    if (!box) throw new Error('Frame Bend canvas has no visible bounds')
    return page.screenshot({
      clip: {
        x: box.x + box.width * 0.38,
        y: box.y + box.height * 0.18,
        width: box.width * 0.24,
        height: box.height * 0.64,
      },
    })
  }

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), pinRange.start + pinRange.distance * 0.2)
  await page.waitForTimeout(250)
  const earlyCapture = await captureCenter()
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), pinRange.start + pinRange.distance * 0.7)
  await page.waitForTimeout(250)
  const lateCapture = await captureCenter()
  expect(lateCapture.equals(earlyCapture), 'Bend canvas center must advance with the hidden DOM rail').toBe(false)

  await bend.locator('canvas').dispatchEvent('webglcontextlost')
  await expect(bend).toHaveAttribute('data-horizontal-bend', 'fallback')
  await expect(page.locator('#frame-building .frame-edge-blur').first()).toBeVisible()
  await expect(page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track')).toHaveCSS('opacity', '1')
  await expect(page.locator('#frame-building .archive-theme-section__pin > .archive-theme-section__track .archive-slot__media').first()).toHaveCSS('opacity', '1')

  const transition = page.locator('#work-transition')
  const gateTarget = await transition.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top + window.scrollY + (rect.height - window.innerHeight) * 0.995
  })
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), gateTarget)
  await expect(transition).toHaveAttribute('data-gate', 'locked')
  await transition.frameLocator('.liquid-metal-button__frame').locator('#btn').click()
  await expect(page.locator('#projects .projects__laser')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('#projects .projects__laser canvas').first()).toBeAttached()
  await expect(page.locator('#projects .projects__laser')).toHaveAttribute('data-mode', 'html-canvas')
  await expect(page.locator('#projects [data-project-laser-capture]')).toHaveCount(1)
  await expect(page.locator('#projects [data-project-laser-capture].projects__intro-content')).toHaveCount(1)
  await expect(page.locator('#projects [data-project-laser-capture] .projects__bento')).toHaveCount(1)
  await expect(page.locator('#projects .projects__laser-capture')).toHaveAttribute('data-capture-state', 'ready')
  await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)
  await expect(page.locator(
    '#projects .projects__intro-sticky > .projects__intro-content .projects__bento button',
  ).first()).toBeEnabled()

  const lastPreview = page.locator('#projects .projects__bento .bento-glow').last()
  const settleTarget = await lastPreview.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    // Move clearly beyond the ScrollTrigger end instead of sampling its exact
    // threshold. Linux CI and macOS resolve fonts/images to slightly different
    // card heights, and a boundary sample can leave the reversible portal live.
    return rect.bottom + window.scrollY - window.innerHeight + 150 + window.innerHeight * 0.35
  })
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), settleTarget)
  await expect(page.locator('#projects .projects__laser canvas')).toHaveCount(0)
})

test('HTML-in-Canvas dissolves the Frame handoff and releases it before Stack', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })

  const handoff = page.locator('.frame-particle-handoff')
  const handoffRange = await handoff.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return {
      start: rect.top + window.scrollY,
      distance: rect.height - window.innerHeight,
    }
  })
  await page.evaluate(
    ({ start, distance }) => window.scrollTo({ top: start + distance * 0.5, behavior: 'auto' }),
    handoffRange,
  )
  await expect(handoff).toHaveAttribute('data-frame-particles', 'active')
  await expect(handoff.locator('[data-frame-particle-capture]')).toHaveCount(1)
  await expect(handoff.locator('canvas')).toHaveCount(2)
  await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)

  const captureGeometry = await handoff.locator('[data-frame-particle-capture]').evaluate((content) => ({
    clientHeight: content.clientHeight,
    scrollHeight: content.scrollHeight,
    scrollTop: content.scrollTop,
    exposures: content.querySelectorAll('.frame-particle-document__figure').length,
  }))
  expect(captureGeometry.scrollHeight).toBeLessThanOrEqual(captureGeometry.clientHeight * 1.05)
  expect(captureGeometry.scrollTop).toBe(0)
  expect(captureGeometry.exposures).toBe(1)

  // The transition used to mount/unmount exactly at its ScrollTrigger edge,
  // which made fast direction changes flash or jump. Exercise both directions
  // inside the pinned range and require the enhanced surface to stay complete.
  for (const progress of [0.22, 0.76, 0.34, 0.88, 0.48]) {
    await page.evaluate(
      ({ start, distance, progress }) => window.scrollTo({
        top: start + distance * progress,
        behavior: 'auto',
      }),
      { ...handoffRange, progress },
    )
    await page.waitForTimeout(120)
    await expect(handoff).toHaveAttribute('data-frame-particles', 'active')
    await expect(handoff.locator('canvas')).toHaveCount(2)
    await expect.poll(async () => Number.parseFloat(
      await handoff.locator('.frame-particle-handoff__surface').evaluate((node) => getComputedStyle(node).opacity),
    )).toBeGreaterThan(0.25)
    await expect.poll(() => page.locator('canvas').count()).toBeLessThanOrEqual(2)
  }

  const beforeProgress = await handoff.evaluate((section) => Number.parseFloat(
    getComputedStyle(section).getPropertyValue('--particle-progress'),
  ))
  await page.evaluate(
    ({ start, distance }) => window.scrollTo({ top: start + distance * 0.58, behavior: 'auto' }),
    handoffRange,
  )
  await expect.poll(async () => handoff.evaluate((section) => Number.parseFloat(
    getComputedStyle(section).getPropertyValue('--particle-progress'),
  ))).toBeGreaterThan(beforeProgress)
  await expect(handoff).toHaveAttribute('data-handoff-phase', 'canvas-owned')

  await page.mouse.wheel(0, 1_800)
  await expect(handoff.locator('canvas')).toHaveCount(0)
})
