import { expect, type Page, test } from '@playwright/test'

async function openHome(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context/i.test(error.message)) return
    throw error
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
}

async function scrollToFrame(page: Page) {
  await page.evaluate(() => {
    document.querySelector('#frame')?.scrollIntoView()
  })
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
        if (!media || !caption) return null

        const slotRect = slot.getBoundingClientRect()
        const mediaRect = media.getBoundingClientRect()
        const captionRect = caption.getBoundingClientRect()
        const visibleWidth = Math.max(0, Math.min(slotRect.right, viewport.width) - Math.max(slotRect.left, 0))
        const visibleHeight = Math.max(0, Math.min(slotRect.bottom, viewport.height) - Math.max(slotRect.top, 0))
        const ratio = (visibleWidth * visibleHeight) / Math.max(1, slotRect.width * slotRect.height)
        if (ratio < 0.55) return null

        return {
          title: slot.querySelector('.archive-slot__caption-title')?.textContent ?? '',
          mediaWidth: Math.round(mediaRect.width),
          mediaHeight: Math.round(mediaRect.height),
          captionBelowMedia: captionRect.top >= mediaRect.bottom - 2,
          captionInsideFigure: captionRect.left >= slotRect.left - 2 && captionRect.right <= slotRect.right + 2,
        }
      })
      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)

    return {
      visibleSlots,
      tinySlots: visibleSlots.filter((slot) => slot.mediaWidth < 240 || slot.mediaHeight < 300),
      detachedCaptions: visibleSlots.filter((slot) => !slot.captionBelowMedia || !slot.captionInsideFigure),
    }
  })

  expect(layout.visibleSlots.length).toBeGreaterThan(0)
  expect(layout.tinySlots, JSON.stringify(layout.tinySlots)).toHaveLength(0)
  expect(layout.detachedCaptions, JSON.stringify(layout.detachedCaptions)).toHaveLength(0)
})

test('Frame falls back to a stable vertical layout on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openHome(page)
  await scrollToFrame(page)

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

test('Frame keeps lazy image and offscreen rendering performance guards', async ({ page }) => {
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

    const badLazyImages = clusters.flatMap((cluster) => {
      return [...cluster.querySelectorAll<HTMLImageElement>('.archive-slot img')]
        .slice(1)
        .filter((img) => img.loading !== 'lazy' || img.fetchPriority !== 'low')
        .map((img) => img.alt)
    })

    const slots = [...document.querySelectorAll<HTMLElement>('.archive-slot')]
    const badContentVisibility = slots.filter((slot) => window.getComputedStyle(slot).contentVisibility !== 'auto')
    const inactiveWillChangeTracks = [...document.querySelectorAll<HTMLElement>('.archive-theme-section__track')]
      .filter((track) => !track.closest('.is-frame-theme-active'))
      .filter((track) => window.getComputedStyle(track).willChange.includes('transform'))

    const visibleSlots = slots.filter((slot) => {
      const rect = slot.getBoundingClientRect()
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight
    })

    return {
      badResponsiveImages,
      badLazyImages,
      badContentVisibilityCount: badContentVisibility.length,
      inactiveWillChangeTrackCount: inactiveWillChangeTracks.length,
      visibleSlotCount: visibleSlots.length,
      totalSlotCount: slots.length,
    }
  })

  expect(performanceGuards.badResponsiveImages, JSON.stringify(performanceGuards.badResponsiveImages)).toHaveLength(0)
  expect(performanceGuards.badLazyImages, JSON.stringify(performanceGuards.badLazyImages)).toHaveLength(0)
  expect(performanceGuards.badContentVisibilityCount).toBe(0)
  expect(performanceGuards.inactiveWillChangeTrackCount).toBe(0)
  expect(performanceGuards.visibleSlotCount).toBeLessThan(14)
  expect(performanceGuards.totalSlotCount).toBeGreaterThan(40)
})
