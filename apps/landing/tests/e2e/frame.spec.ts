import { expect, type Page, test } from '@playwright/test'

async function openHome(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context/i.test(error.message)) return
    throw error
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await waitForFrameReady(page)
}

async function waitForFrameReady(page: Page) {
  await page.waitForFunction(() => {
    const requiredIds = ['hero', 'about', 'life', 'frame', 'skills', 'projects', 'contact']
    const sectionsReady = requiredIds.every((id) => {
      const el = document.getElementById(id)
      return el && el.getBoundingClientRect().height > 0
    })

    return sectionsReady
      && document.querySelectorAll('.archive-theme-section').length === 3
      && document.querySelectorAll('.archive-slot').length > 0
  }, { timeout: 15000 })
}

async function scrollToFrame(page: Page) {
  await waitForFrameReady(page)
  await page.evaluate(() => {
    document.querySelector('#frame')?.scrollIntoView()
  })
  // Wait for the frame archive to actually render rather than a fixed delay (the
  // lazy chunk + slots can land late on slow/loaded runners). Best-effort: don't
  // throw here, let the individual assertions report if something is truly absent.
  await page
    .locator('.archive-slot')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 })
    .catch(() => {})
  await page.waitForTimeout(500)
}

test('Frame keeps the horizontal archive structure available', async ({ page }) => {
  await openHome(page)
  await scrollToFrame(page)

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

test('Frame first theme releases within a bounded wheel distance', async ({ page }) => {
  await openHome(page)
  await scrollToFrame(page)

  const pinViewports = await page.locator('#frame-building').evaluate((section) => {
    const spacer = section.parentElement
    if (!spacer?.classList.contains('pin-spacer')) {
      throw new Error('Frame building ScrollTrigger pin spacer is missing')
    }
    return spacer.offsetHeight / window.innerHeight
  })

  // One viewport is the visible section itself; the remaining budget is the
  // compressed horizontal traversal plus a short exit breath.
  expect(pinViewports).toBeLessThanOrEqual(7.5)
})

test('Frame themes show their final clusters before the next chapter takes over', async ({ page }) => {
  await openHome(page)
  await scrollToFrame(page)

  const checkpoints = [
    {
      key: 'building',
      finalCluster: 'building-night-current',
      nextSelector: "[data-archive-theme='cuisine']",
    },
    {
      key: 'cuisine',
      finalCluster: 'cuisine-tail',
      nextSelector: "[data-archive-theme='scenery']",
    },
    {
      key: 'scenery',
      finalCluster: 'scenery-close',
      nextSelector: '#skills',
    },
  ]
  const seen = Object.fromEntries(checkpoints.map(({ key }) => [key, false]))
  let lastState = { key: '', finalVisible: false, nextTop: 0 }

  for (let i = 0; i < 180; i += 1) {
    await page.mouse.wheel(0, 760)
    await page.waitForTimeout(90)

    for (const checkpoint of checkpoints) {
      if (seen[checkpoint.key]) continue

      lastState = await page.evaluate(({ key, finalCluster, nextSelector }) => {
        const cluster = document.querySelector<HTMLElement>(`[data-cluster='${finalCluster}']`)
        const next = document.querySelector<HTMLElement>(nextSelector)
        if (!cluster || !next) return { key, finalVisible: false, nextTop: 0 }

        const clusterRect = cluster.getBoundingClientRect()
        const nextRect = next.getBoundingClientRect()
        return {
          key,
          finalVisible: clusterRect.right > 0 && clusterRect.left < window.innerWidth,
          nextTop: Math.round(nextRect.top),
        }
      }, checkpoint)

      if (lastState.finalVisible && lastState.nextTop > 600) {
        seen[checkpoint.key] = true
      }
    }

    if (Object.values(seen).every(Boolean)) break
  }

  expect(seen, JSON.stringify(lastState)).toEqual({
    building: true,
    cuisine: true,
    scenery: true,
  })
})

test('Frame first pinned movement releases after lazy pin heights settle', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: '02 · Frame' }).click()
  await expect(page.locator('#frame')).toBeInViewport()

  const firstPinEnd = await page.locator('#frame-building').evaluate((section) => {
    const spacer = section.parentElement
    if (!spacer?.classList.contains('pin-spacer')) return 0
    return Math.round(spacer.getBoundingClientRect().bottom + window.scrollY)
  })
  expect(firstPinEnd).toBeGreaterThan(0)
  const viewportHeight = await page.evaluate(() => window.innerHeight)

  for (let step = 0; step < 40; step += 1) {
    const cuisineTop = await page.locator('#frame-cuisine').evaluate((section) => section.getBoundingClientRect().top)
    if (cuisineTop <= viewportHeight * 0.6) break
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(140)
  }

  const result = await page.evaluate((expectedPinEnd) => ({
    cuisineTop: document.querySelector('#frame-cuisine')?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    expectedPinEnd,
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
  }), firstPinEnd)

  expect(result.scrollY, JSON.stringify(result)).toBeGreaterThan(firstPinEnd - result.viewportHeight * 1.5)
  expect(result.cuisineTop, JSON.stringify(result)).toBeLessThan(result.viewportHeight * 0.6)
})

test('Natural chapter scrolling replaces the hash without creating a navigation jump', async ({ page }) => {
  await openHome(page)
  await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('#frame')
    if (!frame) return
    window.scrollTo({ top: frame.offsetTop - window.innerHeight * 0.8, behavior: 'auto' })
  })
  await page.mouse.wheel(0, 900)

  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#frame')
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')
})

test('Frame and Work navigation active states stay aligned with scroll targets', async ({ page }) => {
  await openHome(page)

  await page.getByRole('button', { name: '02 · Frame' }).click()
  await expect(page.locator('.nav__link.is-active')).toContainText('Frame')
  await expect(page.locator('#frame')).toBeInViewport()

  await page.getByRole('button', { name: '04 · Work' }).click()
  await expect(page.locator('.nav__link.is-active')).toContainText('Work')
  await expect(page.locator('#projects')).toBeInViewport()
})

test('Visible Frame images remain large and captions stay attached below media', async ({ page }) => {
  await openHome(page)
  await scrollToFrame(page)
  await page.mouse.wheel(0, 1800)
  await page.waitForTimeout(700)

  const layout = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const visibleSlots = [...document.querySelectorAll<HTMLElement>('.archive-slot')]
      .map((slot) => {
        const media = slot.querySelector<HTMLElement>('.archive-slot__media')
        const caption = slot.querySelector<HTMLElement>('.archive-slot__caption')
        const image = slot.querySelector<HTMLImageElement>('.archive-slot__media img')
        if (!media || !caption || !image) return null

        const slotRect = slot.getBoundingClientRect()
        const mediaRect = media.getBoundingClientRect()
        const captionRect = caption.getBoundingClientRect()
        const imageRect = image.getBoundingClientRect()
        const naturalAspect = image.naturalWidth / Math.max(1, image.naturalHeight)
        const mediaAspect = mediaRect.width / Math.max(1, mediaRect.height)
        const renderedRect = mediaAspect > naturalAspect
          ? {
              width: mediaRect.height * naturalAspect,
              height: mediaRect.height,
              left: mediaRect.left + (mediaRect.width - mediaRect.height * naturalAspect) / 2,
              right: mediaRect.right - (mediaRect.width - mediaRect.height * naturalAspect) / 2,
              top: mediaRect.top,
              bottom: mediaRect.bottom,
            }
          : {
              width: mediaRect.width,
              height: mediaRect.width / naturalAspect,
              left: mediaRect.left,
              right: mediaRect.right,
              top: mediaRect.top + (mediaRect.height - mediaRect.width / naturalAspect) / 2,
              bottom: mediaRect.bottom - (mediaRect.height - mediaRect.width / naturalAspect) / 2,
            }
        const visibleWidth = Math.max(0, Math.min(slotRect.right, viewport.width) - Math.max(slotRect.left, 0))
        const visibleHeight = Math.max(0, Math.min(slotRect.bottom, viewport.height) - Math.max(slotRect.top, 0))
        const ratio = (visibleWidth * visibleHeight) / Math.max(1, slotRect.width * slotRect.height)
        if (ratio < 0.55) return null

        return {
          title: slot.querySelector('.archive-slot__caption-title')?.textContent ?? '',
          cluster: slot.closest<HTMLElement>('.archive-cluster')?.dataset.cluster ?? '',
          fit: window.getComputedStyle(slot.querySelector<HTMLImageElement>('.archive-slot__media img')!).objectFit,
          mediaWidth: Math.round(mediaRect.width),
          mediaHeight: Math.round(mediaRect.height),
          imageWidth: Math.round(renderedRect.width),
          imageHeight: Math.round(renderedRect.height),
          mediaToImageWidthDelta: Math.round(Math.abs(imageRect.width - renderedRect.width)),
          mediaToImageHeightDelta: Math.round(Math.abs(imageRect.height - renderedRect.height)),
          mediaRect: {
            bottom: mediaRect.bottom,
            left: mediaRect.left,
            right: mediaRect.right,
            top: mediaRect.top,
          },
          captionBelowMedia: captionRect.top >= mediaRect.bottom - 2,
          captionCenterDelta: Math.round(Math.abs(
            (captionRect.left + captionRect.width / 2) - (renderedRect.left + renderedRect.width / 2)
          )),
          captionInsideFigure: captionRect.left >= slotRect.left - 2 && captionRect.right <= slotRect.right + 2,
          captionWidthRatio: Number((captionRect.width / Math.max(1, renderedRect.width)).toFixed(2)),
        }
      })
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    const visibleBuildingOrCuisine = visibleSlots.filter((slot) =>
      slot.cluster.startsWith('building-') || slot.cluster.startsWith('cuisine-')
    )
    const overlappingPairs = visibleBuildingOrCuisine.flatMap((slot, index) => (
      visibleBuildingOrCuisine.slice(index + 1)
        .filter((other) => slot.cluster === other.cluster)
        .filter((other) => {
          const overlapWidth = Math.min(slot.mediaRect.right, other.mediaRect.right) - Math.max(slot.mediaRect.left, other.mediaRect.left)
          const overlapHeight = Math.min(slot.mediaRect.bottom, other.mediaRect.bottom) - Math.max(slot.mediaRect.top, other.mediaRect.top)
          return overlapWidth > 8 && overlapHeight > 8
        })
        .map((other) => `${slot.title} / ${other.title}`)
    ))

    return {
      visibleSlots,
      tinySlots: visibleSlots.filter((slot) => slot.imageWidth < 240 || slot.imageHeight < 300),
      detachedCaptions: visibleSlots.filter((slot) => !slot.captionBelowMedia || !slot.captionInsideFigure),
      misalignedCaptions: visibleSlots.filter((slot) => slot.captionCenterDelta > 18),
      overwideCaptions: visibleBuildingOrCuisine.filter((slot) => slot.captionWidthRatio > 1.35),
      letterboxedMedia: visibleBuildingOrCuisine.filter((slot) => slot.mediaToImageWidthDelta > 12 || slot.mediaToImageHeightDelta > 12),
      croppedSlots: visibleBuildingOrCuisine.filter((slot) => slot.fit !== 'contain').map((slot) => slot.title),
      overlappingPairs,
    }
  })

  expect(layout.visibleSlots.length).toBeGreaterThan(0)
  expect(layout.tinySlots, JSON.stringify(layout.tinySlots)).toHaveLength(0)
  expect(layout.detachedCaptions, JSON.stringify(layout.detachedCaptions)).toHaveLength(0)
  expect(layout.misalignedCaptions, JSON.stringify(layout.misalignedCaptions)).toHaveLength(0)
  expect(layout.overwideCaptions, JSON.stringify(layout.overwideCaptions)).toHaveLength(0)
  expect(layout.letterboxedMedia, JSON.stringify(layout.letterboxedMedia)).toHaveLength(0)
  expect(layout.croppedSlots, JSON.stringify(layout.croppedSlots)).toHaveLength(0)
  expect(layout.overlappingPairs, JSON.stringify(layout.overlappingPairs)).toHaveLength(0)
})

test('Frame falls back to a stable vertical layout on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)
  await scrollToFrame(page)

  // On slower CI mobile the lazy Frame chunk + archive slots can render after the
  // scroll settle; wait for the archive DOM before sampling its computed layout.
  await page.locator('.archive-theme-section__track').first().waitFor({ state: 'attached', timeout: 15000 })
  await page.locator('.archive-slot').first().waitFor({ state: 'attached', timeout: 15000 })

  const mobileLayout = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('.archive-theme-section__track')
    const cluster = document.querySelector<HTMLElement>('.archive-cluster')
    const slot = document.querySelector<HTMLElement>('.archive-slot')
    if (!track || !cluster || !slot) return null

    const trackStyle = window.getComputedStyle(track)
    const slotStyle = window.getComputedStyle(slot)

    return {
      trackDisplay: trackStyle.display,
      trackTransform: trackStyle.transform,
      clusterWidth: Math.round(cluster.getBoundingClientRect().width),
      clusterHeight: Math.round(cluster.getBoundingClientRect().height),
      slotTransform: slotStyle.transform,
    }
  })

  expect(mobileLayout).not.toBeNull()
  expect(mobileLayout?.trackDisplay).toBe('grid')
  expect(mobileLayout?.trackTransform).toBe('none')
  expect(mobileLayout?.slotTransform).toBe('none')
  expect(mobileLayout?.clusterWidth).toBeLessThanOrEqual(390)
  expect(mobileLayout?.clusterHeight).toBeGreaterThan(0)
})

test('Mobile navigation collapses chapters behind a menu and lands on Frame content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)

  await expect(page.locator('.nav__links')).toBeHidden()
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()

  await page.getByRole('button', { name: /menu/i }).click()
  await expect(page.locator('.staggered-section-menu.is-open .staggered-section-menu__panel')).toBeVisible()

  await page.locator('.staggered-section-menu__panel').getByRole('button', { name: /Frame/ }).click()
  await page.waitForFunction(() => (
    window.location.hash === '#frame'
    || document.querySelector('.nav__link.is-active')?.textContent?.includes('Frame')
  ), null, { timeout: 15000 })
  await page.locator('.archive-theme-section__track').first().waitFor({ state: 'attached', timeout: 15000 })
  await page.locator('.archive-slot').first().waitFor({ state: 'attached', timeout: 15000 })

  const landing = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.nav')
    const frame = document.querySelector<HTMLElement>('#frame')
    const activeNav = document.querySelector<HTMLElement>('.nav__link.is-active')
    const title = document.querySelector<HTMLElement>('.frame-hero__title, #frame h2')
    const slot = document.querySelector<HTMLElement>('#frame .archive-slot')
    const navRect = nav?.getBoundingClientRect()
    const frameRect = frame?.getBoundingClientRect()
    const titleRect = title?.getBoundingClientRect()
    const slotRect = slot?.getBoundingClientRect()

    return {
      hash: window.location.hash,
      activeNavText: activeNav?.textContent ?? '',
      navHeight: navRect ? Math.round(navRect.height) : 0,
      frameTop: frameRect ? Math.round(frameRect.top) : null,
      titleVisible: titleRect ? titleRect.bottom > 0 && titleRect.top < window.innerHeight : false,
      slotVisible: slotRect ? slotRect.bottom > 0 && slotRect.top < window.innerHeight : false,
    }
  })

  expect(landing.hash === '#frame' || landing.activeNavText.includes('Frame')).toBe(true)
  expect(landing.navHeight).toBeLessThanOrEqual(72)
  expect(landing.titleVisible || landing.slotVisible).toBe(true)
})

test('Frame keeps responsive images and stable intrinsic track geometry', async ({ page }) => {
  await openHome(page)
  await scrollToFrame(page)

  const performanceGuards = await page.evaluate(() => {
    const clusters = [...document.querySelectorAll<HTMLElement>('.archive-cluster')]
    const badResponsiveImages = clusters.flatMap((cluster) => {
      return [...cluster.querySelectorAll<HTMLImageElement>('.archive-slot img')]
        .filter((img) => {
          const candidates = img.srcset.split(',')
            .map((candidate) => candidate.trim())
            .filter(Boolean)
          const widths = candidates.map((candidate) => {
            const match = candidate.match(/\s(\d+)w$/)
            return match ? Number(match[1]) : 0
          })
          const uniqueWidths = new Set(widths)

          return !img.sizes
            || candidates.length < 2
            || !candidates.some((candidate) => /-\d+\.webp\s+\d+w$/.test(candidate))
            || widths.some((width) => width <= 0)
            || uniqueWidths.size !== widths.length
            || widths.some((width, index) => index > 0 && width <= widths[index - 1])
        })
        .map((img) => img.alt)
    })

    const badPreloadedImages = clusters.flatMap((cluster) => {
      return [...cluster.querySelectorAll<HTMLImageElement>('.archive-slot img')]
        .filter((img) => img.loading !== 'eager' || (img.fetchPriority !== 'high' && img.fetchPriority !== 'auto'))
        .map((img) => img.alt)
    })

    const slots = [...document.querySelectorAll<HTMLElement>('.archive-slot')]
    const unstableIntrinsicPlaceholders = slots.filter(
      (slot) => window.getComputedStyle(slot).contentVisibility === 'auto',
    )
    const inactiveWillChangeTracks = [...document.querySelectorAll<HTMLElement>('.archive-theme-section__track')]
      .filter((track) => !track.closest('.is-frame-theme-active'))
      .filter((track) => window.getComputedStyle(track).willChange.includes('transform'))

    const visibleSlots = slots.filter((slot) => {
      const rect = slot.getBoundingClientRect()
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight
    })

    return {
      badResponsiveImages,
      badPreloadedImages,
      unstableIntrinsicPlaceholderCount: unstableIntrinsicPlaceholders.length,
      inactiveWillChangeTrackCount: inactiveWillChangeTracks.length,
      visibleSlotCount: visibleSlots.length,
      totalSlotCount: slots.length,
    }
  })

  expect(performanceGuards.badResponsiveImages, JSON.stringify(performanceGuards.badResponsiveImages)).toHaveLength(0)
  expect(performanceGuards.badPreloadedImages, JSON.stringify(performanceGuards.badPreloadedImages)).toHaveLength(0)
  expect(performanceGuards.unstableIntrinsicPlaceholderCount).toBe(0)
  expect(performanceGuards.inactiveWillChangeTrackCount).toBe(0)
  expect(performanceGuards.visibleSlotCount).toBeLessThan(14)
  expect(performanceGuards.totalSlotCount).toBeGreaterThan(40)
})
