import { expect, test, type Page } from '@playwright/test'
import { LASER_CONFIG } from '../../src/lib/canvas-ui/laserConfig.ts'

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
  await expect(page.locator('.archive-editorial-copy')).toHaveCount(3)
  await expect(page.locator('.archive-theme-section__track')).toHaveCount(3)
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

test('Frame final exposure mirrors Particle Scroll without a nested scroll gate', async ({ page }) => {
  await waitForLive(page)
  const handoff = page.locator('.frame-particle-handoff')
  await expect(handoff).toHaveAttribute('data-frame-particles', 'fallback')
  await expect(handoff.locator('canvas')).toHaveCount(0)

  const geometry = await handoff.evaluate((section) => ({
    height: section.getBoundingClientRect().height,
    viewport: window.innerHeight,
    sticky: getComputedStyle(section.querySelector('.frame-particle-handoff__sticky')!).position,
  }))
  expect(geometry.height).toBeGreaterThan(geometry.viewport * 1.85)
  expect(geometry.height).toBeLessThan(geometry.viewport * 1.95)
  expect(geometry.sticky).toBe('sticky')

  const exposureComposition = await handoff.evaluate((section) => {
    const sticky = section.querySelector<HTMLElement>('.frame-particle-handoff__sticky')
    const exposure = section.querySelector<HTMLElement>('.frame-particle-document__figure')
    const scanline = section.querySelector<HTMLElement>('.frame-particle-handoff__scanline')
    if (!sticky || !exposure || !scanline) throw new Error('Frame handoff exposure composition is missing')
    const stickyRect = sticky.getBoundingClientRect()
    const exposureRect = exposure.getBoundingClientRect()
    const scanRect = scanline.getBoundingClientRect()
    return {
      exposureTop: exposureRect.top,
      exposureBottom: exposureRect.bottom,
      scanY: scanRect.top,
      stickyTop: stickyRect.top,
      stickyBottom: stickyRect.bottom,
    }
  })
  expect(exposureComposition.exposureTop).toBeGreaterThanOrEqual(exposureComposition.stickyTop)
  expect(exposureComposition.exposureBottom).toBeLessThan(exposureComposition.stickyBottom)
  expect(Math.abs(exposureComposition.scanY - exposureComposition.exposureTop)).toBeLessThanOrEqual(2)

  const midpoint = await handoff.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top + window.scrollY + (rect.height - window.innerHeight) * 0.5
  })
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), midpoint)
  await page.waitForTimeout(250)
  const state = await handoff.evaluate((section) => ({
    progress: Number(getComputedStyle(section).getPropertyValue('--particle-progress')),
    dissolveProgress: Number(getComputedStyle(section).getPropertyValue('--dissolve-progress')),
    scanTransform: getComputedStyle(section.querySelector('.frame-particle-handoff__scanline')!).transform,
    contactSheets: section.querySelectorAll('.frame-particle-document__contact figure').length,
    rejectedHybridLayers: section.querySelectorAll('.frame-particle-handoff__dust, .frame-particle-handoff__signal').length,
  }))
  expect(state.progress).toBeGreaterThan(0.4)
  expect(state.progress).toBeLessThan(0.6)
  expect(state.dissolveProgress).toBeGreaterThan(0.35)
  expect(state.scanTransform).not.toBe('none')
  expect(state.contactSheets).toBe(1)
  expect(state.rejectedHybridLayers).toBe(0)

  const composition = await handoff.locator('.frame-particle-document__contact').evaluate((contact) => {
    return [...contact.querySelectorAll<HTMLElement>('figure')].map((figure) => {
      const image = figure.querySelector<HTMLImageElement>('img')!
      const rect = figure.getBoundingClientRect()
      const naturalAspect = image.naturalWidth / Math.max(1, image.naturalHeight)
      return {
        aspectDelta: Math.abs(rect.width / Math.max(1, rect.height) - naturalAspect),
        borderWidth: Number.parseFloat(getComputedStyle(figure).borderWidth),
        background: getComputedStyle(figure).backgroundColor,
      }
    })
  })
  expect(composition.every((item) => item.aspectDelta < 0.02)).toBe(true)
  expect(composition.every((item) => item.borderWidth === 0)).toBe(true)
  expect(composition.every((item) => item.background === 'rgba(0, 0, 0, 0)')).toBe(true)

  const skillsTop = await page.locator('#skills').evaluate((skills) => {
    const rect = skills.getBoundingClientRect()
    return rect.top + window.scrollY
  })
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), skillsTop)
  await expect(page.locator('#skills')).toBeInViewport()
  const stackEntry = await page.locator('#skills').evaluate((skills) => ({
    flowOpacity: Number.parseFloat(getComputedStyle(skills.querySelector('.skills__flow-svg')!).opacity),
    activeDash: getComputedStyle(skills.querySelector('.skills__flow-active')!).strokeDasharray,
    rows: [...skills.querySelectorAll<HTMLElement>('.skill-row')].slice(0, 3).map((row) => ({
      opacity: Number.parseFloat(getComputedStyle(row).opacity),
      transform: getComputedStyle(row).transform,
      repeatedEntrance: row.classList.contains('is-visible'),
    })),
  }))
  expect(stackEntry.flowOpacity).toBe(1)
  expect(stackEntry.activeDash).not.toBe('none')
  expect(
    stackEntry.rows.every((row) => row.opacity === 1 && row.transform === 'none' && !row.repeatedEntrance),
    `Stack rows must be stable at handoff: ${JSON.stringify(stackEntry.rows)}`,
  ).toBe(true)
})

test('Stack flow enters continuously from outside the viewport', async ({ page }) => {
  await waitForLive(page)

  const samples = await page.locator('#skills').evaluate(async (skills) => {
    const absoluteTop = skills.getBoundingClientRect().top + window.scrollY
    const active = skills.querySelector<SVGPathElement>('.skills__flow-active')
    const svg = skills.querySelector<SVGSVGElement>('.skills__flow-svg')
    if (!active || !svg) throw new Error('Stack flow path is missing')

    const sampleAt = async (rootTopRatio: number) => {
      window.scrollTo({ top: absoluteTop - window.innerHeight * rootTopRatio, behavior: 'auto' })
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      const dash = getComputedStyle(active).strokeDasharray
      const drawn = Number.parseFloat(dash.split(/[ ,]+/)[0] ?? '0')
      return {
        drawn,
        total: active.getTotalLength(),
        opacity: Number.parseFloat(getComputedStyle(svg).opacity),
      }
    }

    return [
      await sampleAt(1),
      await sampleAt(0),
      await sampleAt(-0.4),
    ]
  })

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

test('desktop stack-to-work copy tracks scroll continuously through stable reading windows', async ({ page }) => {
  await waitForLive(page)
  const transition = page.locator('#work-transition')
  const start = await transition.evaluate((section) => section.getBoundingClientRect().top + window.scrollY)

  // The bridge must remain physically inside its section throughout Frame.
  // This catches both GSAP fixed-pin preemption and sticky choosing the wrong
  // scroll container after a global overflow regression.
  const frame = page.locator('#frame')
  for (const progress of [0.2, 0.5, 0.8]) {
    const frameScroll = await frame.evaluate((section, nextProgress) => {
      const rect = section.getBoundingClientRect()
      const top = rect.top + window.scrollY
      return top + Math.max(0, rect.height - window.innerHeight) * nextProgress
    }, progress)
    await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'auto' }), frameScroll)
    await page.waitForTimeout(100)

    const frameGeometry = await transition.evaluate((section) => {
      const sticky = section.querySelector<HTMLElement>('.work-transition__sticky')
      const sectionRect = section.getBoundingClientRect()
      const stickyRect = sticky?.getBoundingClientRect()
      return {
        sectionTop: sectionRect.top,
        stickyTop: stickyRect?.top ?? Number.NEGATIVE_INFINITY,
        stickyPosition: sticky ? getComputedStyle(sticky).position : '',
        viewportHeight: window.innerHeight,
      }
    })
    expect(frameGeometry.sectionTop).toBeGreaterThan(frameGeometry.viewportHeight)
    expect(frameGeometry.stickyTop).toBeGreaterThanOrEqual(frameGeometry.sectionTop - 1)
    expect(frameGeometry.stickyPosition).toBe('sticky')
  }

  // A large jump toward the chapter must still preserve the same boundary.
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
  const pinnedStage = await transition.locator('.work-transition__sticky').boundingBox()
  expect(pinnedStage).not.toBeNull()
  expect(Math.abs(pinnedStage!.y)).toBeLessThanOrEqual(2)
  expect(pinnedStage!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 2)
  await expect(transition.locator('[data-work-phase="system"] .work-transition__phase-content')).toHaveCSS('opacity', '1')
  await expect(transition.locator('[data-work-phase="potential"] .work-transition__phase-content')).toHaveCSS('opacity', '0')

  await scrollToProgress(0.82)
  await expect(transition.locator('[data-work-phase="proof"] .work-transition__phase-content')).toHaveCSS('opacity', '1')
  await expect(transition.locator('[data-work-phase="system"] .work-transition__phase-content')).toHaveCSS('opacity', '0')
  await expect(transition.locator('.work-transition__product')).toHaveCount(0)
})

test('desktop stack-to-work holds its final frame until the metal CTA releases Work', async ({ page }) => {
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

  const beforeForwardScroll = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(450)
  expect(Math.abs(await page.evaluate(() => window.scrollY) - beforeForwardScroll)).toBeLessThan(36)
  await expect(transition).toHaveAttribute('data-gate', 'locked')

  await metalButton.click()
  await expect(transition).toHaveAttribute('data-gate', 'open')
  await expect(page.locator('#projects .projects__laser')).toHaveAttribute('data-active', 'true')
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#projects')
  await expect.poll(() => page.locator('#projects').evaluate((section) => Math.abs(section.getBoundingClientRect().top - 48))).toBeLessThan(12)

  const laserAlignment = await page.locator('#projects .projects__laser').evaluate((laser, width) => {
    const bento = document.querySelector<HTMLElement>('#projects .projects__bento')
    if (!bento) throw new Error('Project bento is missing')
    const bounds = bento.getBoundingClientRect()
    const style = getComputedStyle(laser, '::after')
    const left = Number.parseFloat(style.left)
    const right = Number.parseFloat(style.right)
    return {
      beamCenter: Number.parseFloat((laser as HTMLElement).dataset.beamCenter ?? 'NaN'),
      bentoCenter: (bounds.left + bounds.right) * 0.5,
      fallbackCenter: (left + window.innerWidth - right) * 0.5,
      fallbackWidth: window.innerWidth - left - right,
      expectedWidth: bounds.width * width,
    }
  }, LASER_CONFIG.width)
  expect(Math.abs(laserAlignment.beamCenter - laserAlignment.bentoCenter)).toBeLessThanOrEqual(1)
  expect(Math.abs(laserAlignment.fallbackCenter - laserAlignment.bentoCenter)).toBeLessThanOrEqual(1)
  expect(Math.abs(laserAlignment.fallbackWidth - laserAlignment.expectedWidth)).toBeLessThanOrEqual(2)

  const previews = page.locator('#projects .projects__bento .bento-glow')
  await expect(previews).toHaveCount(6)
  await expect(page.locator('#projects .projects__intro')).toHaveAttribute('data-handoff', 'active')
  // The CTA handoff uses Lenis' 1.15 s arrival tween. Let that ownership end
  // before simulating the user's next scroll, otherwise the arrival tween can
  // pull a programmatic scroll back to the top of Work.
  await page.waitForTimeout(1_250)
  const portalCrossingTarget = await previews.last().evaluate((preview, offset) => {
    const rect = preview.getBoundingClientRect()
    return window.scrollY + rect.bottom - (window.innerHeight - offset) + 24
  }, LASER_CONFIG.offset)
  await page.evaluate((scrollTop) => scrollTo({ top: scrollTop, behavior: 'auto' }), portalCrossingTarget)
  await expect(page.locator('#projects .projects__intro')).toHaveAttribute('data-handoff', 'settled')
  await expect(page.locator('#projects .projects__laser canvas')).toHaveCount(0)

  const rewindTarget = await transition.evaluate((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top + scrollY + (rect.height - innerHeight) * 0.9
  })
  await page.evaluate((scrollTop) => scrollTo({ top: scrollTop, behavior: 'auto' }), rewindTarget)
  await expect(transition).toHaveAttribute('data-gate', 'open')
  await page.evaluate((scrollTop) => scrollTo({ top: scrollTop, behavior: 'auto' }), target)
  await expect(transition).toHaveAttribute('data-gate', 'locked')
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
