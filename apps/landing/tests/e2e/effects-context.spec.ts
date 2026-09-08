import { expect, test, type Locator, type Page } from '@playwright/test'

async function waitForLive(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context|THREE\.Clock/i.test(error.message)) return
    throw error
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
}

async function alignSectionTop(
  section: Locator,
  viewportRatio: number,
) {
  await expect.poll(async () => section.evaluate((node, ratio) => {
    const delta = node.getBoundingClientRect().top - window.innerHeight * ratio
    if (Math.abs(delta) > 1) {
      window.scrollTo({ top: window.scrollY + delta, behavior: 'auto' })
    }
    return Math.abs(delta)
  }, viewportRatio)).toBeLessThan(2)
}

async function alignSectionProgress(
  page: Page,
  section: Locator,
  targetProgress: number,
) {
  await expect.poll(async () => section.evaluate((node, progress) => {
    const rect = node.getBoundingClientRect()
    const distance = Math.max(1, rect.height - window.innerHeight)
    const currentProgress = -rect.top / distance
    const delta = (progress - currentProgress) * distance
    if (Math.abs(delta) > 1) {
      window.scrollTo({ top: window.scrollY + delta, behavior: 'auto' })
    }
    return Math.abs(currentProgress - progress)
  }, targetProgress)).toBeLessThan(0.01)

  await expect(page.locator('body')).not.toHaveClass(/disable-hover/)
}

test('chapter-scoped effects replace the global continuum without leaking canvases', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
  })
  await waitForLive(page)
  await expect(page.locator('.particle-continuum')).toHaveCount(0)
  await expect(page.locator('[data-drift-wall]')).toHaveCount(1)
  await expect(page.locator('[data-frame-accordion]')).toHaveCount(1)
  await expect(page.locator('.archive-editorial-copy')).toHaveCount(3)
  await expect(page.locator('.archive-theme-section__track')).toHaveCount(3)
  await expect(page.locator('.bento-glow')).toHaveCount(6)
  await expect(page.locator('.sciscope-film')).toHaveCount(1)
  await expect(page.locator('.nav__sound-button')).toHaveAttribute('aria-pressed', 'false')

  const counts: number[] = []
  for (const chapter of ['hero', 'life', 'frame', 'projects', 'contact']) {
    // Navigate to the real reading surface when sampling chapter context ownership.
    if (chapter === 'projects') {
      await page.evaluate(() => window.history.replaceState(null, '', '#projects'))
    }
    await page.locator(`#${chapter}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    counts.push(await page.locator('canvas').count())
  }

  expect(Math.max(...counts), `canvas samples: ${counts.join(', ')}`).toBeLessThanOrEqual(2)
  await expect(page.locator('#work-transition .liquid-metal-button')).toHaveCount(0)
  await expect(page.locator('.footer__ascii [data-ascii-state="live"]')).toHaveCount(1)
  await expect(page.locator('.footer__ascii .ascii-filter')).toHaveCount(1)
  await expect(page.locator('.footer__ascii .ascii-filter .ascii-text__glyphs')).toHaveCount(1)
  await expect(page.locator('.footer__ascii .ascii-text__fallback')).toHaveCount(1)
})

test('project bento keeps its outer glow and restores blurred-to-clear focus', async ({ page }) => {
  await waitForLive(page)
  await page.evaluate(() => window.history.replaceState(null, '', '#projects'))
  await page.locator('#projects').scrollIntoViewIfNeeded()

  const firstGlow = page.locator('.bento-glow').first()
  const firstCard = firstGlow.locator('.border-glow-card')
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

  await firstCard.click()
  const projectId = await firstCard.evaluate((button) => {
    const projects = button.closest('#projects')
    const firstProject = projects?.querySelector<HTMLElement>('[data-project-id]')
    return firstProject?.dataset.projectId ?? ''
  })
  expect(projectId).not.toBe('')
  await expect(page.locator(`[data-project-id="${projectId}"]`)).toBeInViewport({ ratio: 0.25 })
})

test('Frame final exposure enters the screen and releases the original Stack reading surface', async ({ page }) => {
  await waitForLive(page)
  const handoff = page.locator('[data-archive-track="frame-stack"]')
  await expect(handoff).toHaveCount(1)
  await expect(page.locator('.frame-particle-handoff')).toHaveCount(0)
  expect(await handoff.evaluate(node => node.closest('#frame') === null)).toBe(true)
  await alignSectionProgress(page, handoff, .8)
  await expect(handoff.locator('.archive-bridge__stage')).toHaveCSS('position', 'sticky')
  await expect(handoff.locator('.archive-bridge__footer a')).toHaveAttribute('href', '#skills')
  await alignSectionProgress(page, handoff, 1)
  await expect(handoff).toHaveAttribute('data-phase', 'released')
  await expect(handoff.locator('canvas')).toHaveCount(0)
  await expect(page.locator('#skills')).toBeInViewport()
  await expect(page.locator('#skills .skills__flow-svg')).toHaveCSS('opacity', '1')
  await expect(page.locator('#skills .skill-row').first()).toHaveCSS('opacity', '1')
})

test('Stack flow enters continuously from outside the viewport', async ({ page }) => {
  await waitForLive(page)

  const skills = page.locator('#skills')
  const readSample = () => skills.evaluate((section) => {
    const active = section.querySelector<SVGPathElement>('.skills__flow-active')
    const svg = section.querySelector<SVGSVGElement>('.skills__flow-svg')
    if (!active || !svg) throw new Error('Stack flow path is missing')
    const dash = getComputedStyle(active).strokeDasharray
    return {
      drawn: Number.parseFloat(dash.split(/[ ,]+/)[0] ?? '0'),
      total: active.getTotalLength(),
      opacity: Number.parseFloat(getComputedStyle(svg).opacity),
    }
  })

  await alignSectionTop(skills, 1)
  await expect.poll(async () => (await readSample()).drawn).toBeLessThanOrEqual(1)
  const beforeEntry = await readSample()

  await alignSectionTop(skills, 0)
  await expect.poll(async () => (await readSample()).drawn).toBeGreaterThanOrEqual(beforeEntry.drawn)
  const atEntry = await readSample()

  await alignSectionTop(skills, -0.4)
  await expect.poll(async () => (await readSample()).drawn).toBeGreaterThan(atEntry.drawn)
  const inside = await readSample()

  const samples = [beforeEntry, atEntry, inside]

  expect(samples.every(({ opacity }) => opacity === 1)).toBe(true)
  expect(samples[0]?.drawn).toBeLessThanOrEqual(1)
  expect(samples[1]?.drawn).toBeGreaterThanOrEqual(samples[0]?.drawn ?? 0)
  expect(samples[2]?.drawn).toBeGreaterThan(samples[1]?.drawn ?? 0)
  expect(samples[1]?.drawn).toBeLessThan((samples[1]?.total ?? 0) * 0.7)
  expect(samples[2]?.drawn).toBeLessThan((samples[2]?.total ?? 0) * 0.75)
  await expect(page.locator('#skills')).not.toHaveClass(/is-flow-active/)
})

test('SciScope opens as one uninterrupted film with its original sound', async ({ page }) => {
  await waitForLive(page)
  await page.setViewportSize({ width: 1440, height: 760 })
  await page.evaluate(() => window.history.replaceState(null, '', '#projects'))

  const film = page.locator('.sciscope-film')
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-mode', 'scroll-expand')
  await expect(film.locator('.sciscope-film__expand')).toBeVisible()
  await expect(film.locator('.sciscope-film__story, .sciscope-film__evidence, .sciscope-film__score')).toHaveCount(0)

  const expandedScroll = await film.locator('.scroll-expand__track').evaluate((track) => {
    const top = track.getBoundingClientRect().top + window.scrollY
    return top + window.innerHeight * 0.9
  })
  await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), expandedScroll)
  await expect(film.locator('.scroll-expand__overlay')).toHaveCSS('opacity', '1')
  const playButton = film.frameLocator('.sciscope-film__liquid-play .liquid-metal-button__frame').locator('#btn')
  await expect(playButton).toHaveAttribute('aria-label', 'PLAY ORIGINAL CUT')
  await playButton.click()
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
  await expect(film.locator('.sciscope-film__liquid-play .liquid-metal-button__frame')).toBeFocused()
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

test('desktop stack-to-work uses a reversible drawer bridge without a forward gate', async ({ page }) => {
  await waitForLive(page)
  const transition = page.locator('#work-transition')
  await expect(transition).toHaveAttribute('data-archive-track', 'stack-work')
  await expect(transition.locator('.liquid-metal-button, iframe')).toHaveCount(0)
  for (const progress of [.14, .44, .82, .44]) {
    await alignSectionProgress(page, transition, progress)
    const stage = await transition.locator('.archive-bridge__stage').boundingBox()
    expect(stage).not.toBeNull()
    expect(Math.abs(stage!.y)).toBeLessThanOrEqual(2)
  }
  await alignSectionProgress(page, transition, .94)
  const before = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 1000)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100)
  await expect(transition).toHaveAttribute('data-phase', 'released')
  await expect(transition.locator('canvas')).toHaveCount(0)
  await page.mouse.wheel(0, -1000)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before + 200)
  await expect(transition).not.toHaveAttribute('data-gate', /locked|open/)
})

test('archive cursor remains interactive during a Lenis scroll burst', async ({ page }) => {
  await waitForLive(page)
  const section = page.locator('#frame-building')
  const target = await section.evaluate((node) => {
    const spacer = node.parentElement
    const rect = spacer?.getBoundingClientRect()
    if (!spacer || !rect) throw new Error('Frame building pin spacer is missing')
    return rect.top + scrollY + (spacer.offsetHeight - innerHeight) * 0.18
  })
  await page.evaluate((top) => scrollTo({ top, behavior: 'auto' }), target)
  await page.waitForTimeout(250)

  const point = await section.evaluate((node) => {
    const media = [...node.querySelectorAll<HTMLElement>('.archive-slot__open')]
      .map((item) => item.getBoundingClientRect())
      .find((rect) => rect.left > 410 && rect.right < innerWidth - 80 && rect.top > 80 && rect.bottom < innerHeight - 40)
    if (!media) throw new Error('No visible Frame archive image is available for cursor QA')
    return { x: media.left + media.width / 2, y: media.top + media.height / 2 }
  })

  await page.evaluate(() => document.body.classList.add('disable-hover'))
  expect(await page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe('none')

  await page.mouse.move(point.x, point.y)
  await expect(page.locator('.cursor')).toHaveClass(/is-hover/)

  await page.mouse.wheel(0, 80)
  await expect(page.locator('.cursor')).toHaveClass(/is-hover/)
  await page.evaluate(() => document.body.classList.remove('disable-hover'))
})
