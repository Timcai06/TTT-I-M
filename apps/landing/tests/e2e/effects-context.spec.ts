import { expect, test, type Page } from '@playwright/test'

async function waitForLive(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context|THREE\.Clock/i.test(error.message)) return
    throw error
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
}

test('chapter-scoped effects replace the global continuum without leaking canvases', async ({ page }) => {
  await waitForLive(page)
  await expect(page.locator('.particle-continuum')).toHaveCount(0)
  await expect(page.locator('[data-drift-wall]')).toHaveCount(1)
  await expect(page.locator('[data-frame-accordion]')).toHaveCount(1)
  await expect(page.locator('.bento-glow')).toHaveCount(6)
  await expect(page.locator('.sciscope-film')).toHaveCount(1)
  await expect(page.locator('.nav__sound-button')).toHaveAttribute('aria-pressed', 'false')

  const counts: number[] = []
  for (const chapter of ['hero', 'life', 'frame', 'projects', 'contact']) {
    // This test samples chapter-scoped canvas ownership, not the intentional
    // click gate. Mark the Work jump as deliberate so it can reach Contact.
    if (chapter === 'projects') {
      await page.evaluate(() => window.history.replaceState(null, '', '#projects'))
    }
    await page.locator(`#${chapter}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    counts.push(await page.locator('canvas').count())
  }

  expect(Math.max(...counts), `canvas samples: ${counts.join(', ')}`).toBeLessThanOrEqual(2)
  await expect(page.locator('.footer__ascii [data-ascii-state="live"]')).toHaveCount(1)
  await expect(page.locator('.footer__ascii .ascii-filter')).toHaveCount(1)
  await expect(page.locator('.footer__ascii pre')).toHaveCount(1)
})

test('project bento keeps its outer glow and restores blurred-to-clear focus', async ({ page }) => {
  await waitForLive(page)
  await page.evaluate(() => window.history.replaceState(null, '', '#projects'))
  await page.locator('#projects').scrollIntoViewIfNeeded()

  const firstCard = page.locator('.bento-glow').first().locator('.border-glow-card')
  await expect(firstCard).toBeVisible()
  const image = firstCard.locator('.bento-tile__img')
  const resting = await image.evaluate((node) => ({
    filter: getComputedStyle(node).filter,
    transform: getComputedStyle(node).transform,
  }))
  await firstCard.hover({ position: { x: 2, y: 80 } })
  await page.waitForTimeout(850)

  const layers = await firstCard.evaluate((card) => ({
    borderLayer: getComputedStyle(card, '::before').zIndex,
    outerGlow: getComputedStyle(card.querySelector('.edge-light') as HTMLElement).zIndex,
    wrapper: getComputedStyle(card.closest('.bento-glow') as HTMLElement).zIndex,
  }))
  expect(layers).toEqual({ borderLayer: '0', outerGlow: '3', wrapper: '4' })

  const focused = await image.evaluate((node) => ({
    filter: getComputedStyle(node).filter,
    transform: getComputedStyle(node).transform,
  }))
  expect(resting.filter).toContain('blur(3px)')
  expect(focused.filter).toContain('blur(0px)')
  expect(focused.transform).not.toBe(resting.transform)
  await expect(firstCard.locator('.pixelated-image-card')).toHaveCount(0)
})

test('SciScope opens as one uninterrupted film with its original sound', async ({ page }) => {
  await waitForLive(page)
  await page.setViewportSize({ width: 1440, height: 760 })
  await page.evaluate(() => window.history.replaceState(null, '', '#projects'))

  const film = page.locator('.sciscope-film')
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-mode', 'entrance')
  await expect(film.locator('.sciscope-film__entrance')).toBeVisible()
  await expect(film.locator('.sciscope-film__story, .sciscope-film__evidence, .sciscope-film__score')).toHaveCount(0)

  await film.locator('.sciscope-film__entrance').click()
  const modal = page.locator('.sciscope-film__dialog')
  const video = modal.locator('video')
  await expect(modal).toBeVisible()
  await expect(film).toHaveAttribute('data-state', 'playing')
  await expect(video).toHaveAttribute('controls', '')
  expect(await video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(false)
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0.05)
  await expect(modal.locator('img')).toHaveCount(0)

  const filmBounds = await modal.evaluate((dialog) => {
    const panel = dialog.querySelector<HTMLElement>('.sciscope-film__dialog-panel')
    const filmVideo = dialog.querySelector<HTMLVideoElement>('video')
    const dialogRect = dialog.getBoundingClientRect()
    const panelRect = panel!.getBoundingClientRect()
    const videoRect = filmVideo!.getBoundingClientRect()

    return {
      viewportHeight: window.innerHeight,
      dialogTop: dialogRect.top,
      dialogBottom: dialogRect.bottom,
      panelBottom: panelRect.bottom,
      videoBottom: videoRect.bottom,
    }
  })
  expect(filmBounds.dialogTop).toBeGreaterThanOrEqual(12)
  expect(filmBounds.dialogBottom).toBeLessThanOrEqual(filmBounds.viewportHeight - 12)
  expect(filmBounds.panelBottom).toBeLessThanOrEqual(filmBounds.viewportHeight - 12)
  expect(filmBounds.videoBottom).toBeLessThanOrEqual(filmBounds.viewportHeight - 13)

  await modal.getByRole('button', { name: 'Close concept film' }).click()
  await expect(modal).not.toBeVisible()
  await expect(film).toHaveAttribute('data-state', 'ready')
  await expect(film.locator('.sciscope-film__entrance')).toBeFocused()
})

test('desktop life archive uses seven equal-width columns with varied photographs', async ({ page }) => {
  await waitForLive(page)

  const wall = page.locator('#life [data-drift-wall]')
  await wall.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)

  const layout = await wall.evaluate((root) => {
    const columns = [...root.querySelectorAll<HTMLElement>('.drift-wall__col')]
    const cards = columns.map((column) => column.querySelector<HTMLElement>('.drift-wall__inner'))
    const sampleImages = columns.flatMap((column) =>
      [...column.querySelectorAll<HTMLImageElement>('.drift-wall__tile img')]
        .slice(0, 5)
        .map((image) => image.getAttribute('src')),
    )
    const wallRect = root.getBoundingClientRect()
    const planeRect = root.querySelector<HTMLElement>('.drift-wall__plane')!.getBoundingClientRect()
    const firstInner = root.querySelector<HTMLElement>('.drift-wall__inner')!
    const firstImage = root.querySelector<HTMLImageElement>('.drift-wall__tile img')!
    const firstOverlay = root.querySelector<HTMLElement>('.drift-wall__overlay')!

    return {
      columnCount: columns.length,
      columnWidths: columns.map((column) => getComputedStyle(column).width),
      cardWidths: cards.map((card) => card ? getComputedStyle(card).width : null),
      uniqueImages: new Set(sampleImages).size,
      toneCounts: columns.map((column) => new Set(
        [...column.querySelectorAll<HTMLElement>('.drift-wall__tile')]
          .slice(0, 5)
          .map((tile) => tile.dataset.tone),
      ).size),
      planeLeftGap: planeRect.left - wallRect.left,
      wallBackgroundColor: getComputedStyle(root).backgroundColor,
      wallBackgroundImage: getComputedStyle(root).backgroundImage,
      cardOpacity: getComputedStyle(firstInner).opacity,
      imageFilter: getComputedStyle(firstImage).filter,
      overlayOpacity: getComputedStyle(firstOverlay).opacity,
      overlayBackgroundColor: getComputedStyle(firstOverlay).backgroundColor,
    }
  })

  expect(layout.columnCount).toBe(7)
  expect(new Set(layout.columnWidths).size).toBe(1)
  expect(layout.columnWidths[0]).toBe('204px')
  expect(new Set(layout.cardWidths).size).toBe(1)
  expect(layout.cardWidths[0]).toBe('188px')
  expect(layout.uniqueImages).toBeGreaterThanOrEqual(12)
  expect(layout.toneCounts.every((count) => count >= 4)).toBe(true)
  expect(layout.planeLeftGap).toBeLessThan(24)
  expect(layout.wallBackgroundColor).toBe('rgb(0, 0, 0)')
  expect(layout.wallBackgroundImage).toBe('none')
  expect(layout.cardOpacity).toBe('0.66')
  expect(layout.imageFilter).toContain('saturate(0.86)')
  expect(layout.imageFilter).toContain('contrast(1.04)')
  expect(layout.overlayOpacity).toBe('0.24')
  expect(layout.overlayBackgroundColor).toBe('rgb(0, 0, 0)')
})

test('desktop stack-to-work copy tracks scroll continuously through stable reading windows', async ({ page }) => {
  await waitForLive(page)
  const transition = page.locator('#work-transition')
  const start = await transition.evaluate((section) => section.getBoundingClientRect().top + window.scrollY)

  // A large jump toward the chapter used to make anticipatePin fix the visual
  // layer to the viewport while the section was still below it. Native sticky
  // must keep the bridge inside its own document-flow boundary at any speed.
  const approach = await transition.evaluate((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY
    return top - window.innerHeight - 120
  })
  await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), approach)
  const preEntryGeometry = await transition.evaluate((section) => {
    const sticky = section.querySelector<HTMLElement>('.work-transition__sticky')
    return {
      sectionTop: section.getBoundingClientRect().top,
      stickyTop: sticky?.getBoundingClientRect().top ?? Number.NEGATIVE_INFINITY,
      viewportHeight: window.innerHeight,
    }
  })
  expect(preEntryGeometry.sectionTop).toBeGreaterThan(preEntryGeometry.viewportHeight)
  expect(preEntryGeometry.stickyTop).toBeGreaterThanOrEqual(preEntryGeometry.sectionTop - 1)

  await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), start + 2)
  await page.waitForTimeout(250)

  await expect(transition.locator('.work-transition__spark')).toHaveCSS('pointer-events', 'none')
  await page.mouse.move(page.viewportSize()!.width * 0.74, page.viewportSize()!.height * 0.52)
  await page.mouse.wheel(0, 260)
  await page.waitForTimeout(1200)

  const readProgress = () => transition.evaluate((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY
    const distance = section.getBoundingClientRect().height - window.innerHeight
    return (window.scrollY - top) / distance
  })
  const lightWheelProgress = await readProgress()
  expect(lightWheelProgress).toBeGreaterThan(0.01)
  expect(lightWheelProgress).toBeLessThan(0.1)

  const scrollToProgress = async (progress: number) => {
    const target = await transition.evaluate((section, nextProgress) => {
      const top = section.getBoundingClientRect().top + window.scrollY
      return top + (section.getBoundingClientRect().height - window.innerHeight) * nextProgress
    }, progress)
    await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), target)
    await page.waitForTimeout(1000)
  }

  await scrollToProgress(0.14)
  expect(await readProgress()).toBeGreaterThan(0.13)
  expect(await readProgress()).toBeLessThan(0.17)
  await expect(transition.locator('[data-work-phase="potential"] .work-transition__phase-content')).toHaveCSS('opacity', '1')
  await expect(transition.locator('[data-work-phase="potential"] .work-transition__phase-content')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')

  await scrollToProgress(0.44)
  expect(await readProgress()).toBeGreaterThan(0.43)
  expect(await readProgress()).toBeLessThan(0.47)
  await expect(transition.locator('[data-work-phase="system"] .work-transition__phase-content')).toHaveCSS('opacity', '1')
  await expect(transition.locator('[data-work-phase="potential"] .work-transition__phase-content')).toHaveCSS('opacity', '0')

  await scrollToProgress(0.82)
  await expect(transition.locator('[data-work-phase="proof"] .work-transition__phase-content')).toHaveCSS('opacity', '1')
  await expect(transition.locator('[data-work-phase="system"] .work-transition__phase-content')).toHaveCSS('opacity', '0')
  await expect(transition.locator('.work-transition__product')).toHaveCount(0)
})

test('desktop stack-to-work narrative stops at the CTA until the metal button is activated', async ({ page }) => {
  await waitForLive(page)
  const transition = page.locator('#work-transition')
  const target = await transition.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    const top = rect.top + window.scrollY
    return top + (rect.height - window.innerHeight) * 0.995
  })

  await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), target)
  await expect(transition).toHaveAttribute('data-gate', 'locked')
  await expect(transition.locator('.work-transition__gate-hint')).toContainText('Click to continue')
  await expect(transition.locator('.liquid-metal-button')).toHaveAttribute('data-state', 'ready')
  const metalButton = transition.frameLocator('.liquid-metal-button__frame').locator('#btn')
  await expect(metalButton).toHaveAttribute('aria-label', 'ENTER THE WORK')
  expect(await metalButton.evaluate((button) => button.getBoundingClientRect().width)).toBeGreaterThan(200)
  const ctaShell = await transition.locator('.work-transition__cta-shell').boundingBox()
  expect(ctaShell).not.toBeNull()
  expect(ctaShell!.x).toBeGreaterThan(20)
  expect(ctaShell!.x).toBeLessThan(150)

  const metalBounds = await metalButton.boundingBox()
  expect(metalBounds).not.toBeNull()
  await page.mouse.move(metalBounds!.x + metalBounds!.width / 2, metalBounds!.y + metalBounds!.height / 2)
  await expect(page.locator('.cursor')).not.toHaveClass(/is-labeled/)
  await expect(page.locator('.cursor')).not.toHaveClass(/is-hover/)
  await expect(page.locator('.cursor')).not.toHaveAttribute('data-label', /.+/)
  const cursorBounds = await page.locator('.cursor').boundingBox()
  expect(cursorBounds).not.toBeNull()
  expect(Math.abs(
    cursorBounds!.x + cursorBounds!.width / 2 - (metalBounds!.x + metalBounds!.width / 2),
  )).toBeLessThan(8)
  expect(Math.abs(
    cursorBounds!.y + cursorBounds!.height / 2 - (metalBounds!.y + metalBounds!.height / 2),
  )).toBeLessThan(8)

  const lockedAt = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(250)
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - lockedAt)).toBeLessThan(4)

  await page.mouse.wheel(0, -520)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(lockedAt - 80)
  await expect(transition).toHaveAttribute('data-gate', 'open')

  await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), target)
  await expect(transition).toHaveAttribute('data-gate', 'locked')

  await metalButton.click()
  await expect(transition).toHaveAttribute('data-gate', 'open')
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#projects')
  await expect.poll(() => page.locator('#projects').evaluate((section) => Math.abs(section.getBoundingClientRect().top - 48))).toBeLessThan(12)
})

test('archive cursor remains interactive during a Lenis scroll burst', async ({ page }) => {
  await waitForLive(page)
  const gallery = page.locator('[data-frame-accordion]')
  await gallery.scrollIntoViewIfNeeded()

  const panel = gallery.locator('.ag-panel').first()
  const box = await panel.boundingBox()
  expect(box).not.toBeNull()

  await page.evaluate(() => document.body.classList.add('disable-hover'))
  expect(await page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe('none')

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator('.cursor')).toHaveClass(/is-labeled/)

  await page.mouse.wheel(0, 80)
  await expect(page.locator('.cursor')).toHaveClass(/is-labeled/)
  await page.evaluate(() => document.body.classList.remove('disable-hover'))
})
