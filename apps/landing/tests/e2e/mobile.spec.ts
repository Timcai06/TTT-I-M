import { expect, type Page, test } from '@playwright/test'

async function openMobileHome(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.locator('.intro').waitFor({ state: 'detached', timeout: 8000 }).catch(async () => {
    await page.addStyleTag({ content: '.intro { display: none !important; pointer-events: none !important; }' })
  })
}

async function scrollChapterToTop(page: Page, id: string) {
  await page.evaluate((chapterId) => {
    document.getElementById(chapterId)?.scrollIntoView({ block: 'start' })
  }, id)
  await page.waitForTimeout(700)
}

test('Mobile Hero presents title and portrait in the first viewport', async ({ page }) => {
  await openMobileHome(page)

  const heroLayout = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.nav')
    const title = document.querySelector<HTMLElement>('.hero__name')
    const ghost = document.querySelector<HTMLImageElement>('.hero__ghost')
    const navRect = nav?.getBoundingClientRect()
    const titleRect = title?.getBoundingClientRect()
    const ghostRect = ghost?.getBoundingClientRect()

    return {
      navHeight: navRect ? Math.round(navRect.height) : 0,
      titleText: title?.textContent?.trim(),
      titleRect: titleRect ? {
        top: Math.round(titleRect.top),
        bottom: Math.round(titleRect.bottom),
        width: Math.round(titleRect.width),
        height: Math.round(titleRect.height),
      } : null,
      ghostRect: ghostRect ? {
        left: Math.round(ghostRect.left),
        right: Math.round(ghostRect.right),
        width: Math.round(ghostRect.width),
        height: Math.round(ghostRect.height),
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
  })

  expect(heroLayout.navHeight).toBeLessThanOrEqual(72)
  expect(heroLayout.titleText).toContain('Tim')
  expect(heroLayout.titleText).toContain('Cai')
  expect(heroLayout.titleRect?.top).toBeGreaterThanOrEqual(heroLayout.navHeight + 24)
  expect(heroLayout.titleRect?.bottom).toBeLessThanOrEqual(heroLayout.viewport.height - 72)
  expect(heroLayout.titleRect?.width).toBeGreaterThan(260)
  expect(heroLayout.ghostRect?.left).toBeGreaterThanOrEqual(-40)
  expect(heroLayout.ghostRect?.right).toBeLessThanOrEqual(heroLayout.viewport.width + 80)
})

test('Mobile narrative chapters expose stable scroll anchors', async ({ page }) => {
  await openMobileHome(page)

  const anchors = await page.evaluate(() => {
    return ['hero', 'about', 'life', 'frame', 'skills', 'projects', 'contact'].map((id) => {
      const el = document.getElementById(id)
      const rect = el?.getBoundingClientRect()
      return {
        id,
        exists: Boolean(el),
        height: rect ? Math.round(rect.height) : 0,
      }
    })
  })

  expect(anchors.filter((anchor) => !anchor.exists), JSON.stringify(anchors)).toHaveLength(0)
  expect(anchors.filter((anchor) => anchor.height <= 0), JSON.stringify(anchors)).toHaveLength(0)
})

test('Mobile About leads with text and avoids a WebGL particle gap', async ({ page }) => {
  await openMobileHome(page)
  await scrollChapterToTop(page, 'about')

  const aboutLayout = await page.evaluate(() => {
    const rectOf = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector)
      const rect = el?.getBoundingClientRect()
      return rect ? {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      } : null
    }

    return {
      nav: rectOf('.nav'),
      lead: rectOf('.about__lead'),
      portrait: rectOf('.about__portrait-frame'),
      manifesto: rectOf('.about__manifesto-fx'),
      hasAboutCanvas: Boolean(document.querySelector('.about__manifesto-fx canvas')),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(aboutLayout.lead?.top).toBeGreaterThanOrEqual((aboutLayout.nav?.height ?? 0) + 20)
  expect(aboutLayout.lead?.top).toBeLessThan(220)
  expect(aboutLayout.portrait?.top).toBeGreaterThan(aboutLayout.lead?.bottom ?? 0)
  expect(aboutLayout.hasAboutCanvas).toBe(false)
  expect(aboutLayout.manifesto?.height).toBeLessThanOrEqual(150)
  expect(aboutLayout.scrollWidth).toBe(aboutLayout.viewportWidth)
})

test('Mobile Life gallery uses wide in-flow image cards', async ({ page }) => {
  await openMobileHome(page)
  await scrollChapterToTop(page, 'life')

  const lifeLayout = await page.evaluate(() => {
    const galleryWrap = document.querySelector<HTMLElement>('#life .gallery-wrap')
    const overlay = document.querySelector<HTMLElement>('#life .life__intro-overlay')
    const images = [...document.querySelectorAll<HTMLImageElement>('#life .gallery__item img')]
      .filter((img) => {
        const rect = img.getBoundingClientRect()
        return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.top < window.innerHeight
      })
      .map((img) => {
        const rect = img.getBoundingClientRect()
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })

    return {
      wrapPosition: galleryWrap ? window.getComputedStyle(galleryWrap).position : '',
      overlayDisplay: overlay ? window.getComputedStyle(overlay).display : '',
      images,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(lifeLayout.wrapPosition).toBe('relative')
  expect(lifeLayout.overlayDisplay).toBe('none')
  expect(lifeLayout.images.length).toBeGreaterThan(0)
  expect(lifeLayout.images.filter((image) => image.width <= image.height), JSON.stringify(lifeLayout.images)).toHaveLength(0)
  expect(lifeLayout.images.filter((image) => image.left < 0 || image.right > lifeLayout.viewportWidth), JSON.stringify(lifeLayout.images)).toHaveLength(0)
  expect(lifeLayout.scrollWidth).toBe(lifeLayout.viewportWidth)
})

test('Mobile Frame and Work media stay inside the viewport', async ({ page }) => {
  await openMobileHome(page)

  const samples = []
  for (const id of ['frame', 'projects']) {
    await scrollChapterToTop(page, id)
    for (let step = 0; step < 4; step += 1) {
      if (step > 0) {
        await page.evaluate(() => window.scrollBy(0, 420))
        await page.waitForTimeout(300)
      }
      samples.push(await page.evaluate((chapterId) => {
        const images = [...document.querySelectorAll<HTMLImageElement>(`#${chapterId} img`)]
          .filter((img) => {
            const rect = img.getBoundingClientRect()
            const style = window.getComputedStyle(img)
            return rect.width > 1
              && rect.height > 1
              && rect.bottom > 0
              && rect.top < window.innerHeight
              && style.display !== 'none'
              && style.visibility !== 'hidden'
          })
          .map((img) => {
            const rect = img.getBoundingClientRect()
            return {
              chapterId,
              alt: img.alt,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          })
        return {
          chapterId,
          images,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }
      }, id))
    }
  }

  const visibleImages = samples.flatMap((sample) => sample.images)
  expect(visibleImages.length).toBeGreaterThan(0)
  expect(samples.filter((sample) => sample.scrollWidth !== sample.viewportWidth), JSON.stringify(samples)).toHaveLength(0)
  expect(visibleImages.filter((image) => image.left < 0 || image.right > 390), JSON.stringify(visibleImages)).toHaveLength(0)
})

test('Mobile Cuisine and Scenery use readable in-viewport archive cards', async ({ page }) => {
  await openMobileHome(page)

  const samples = []
  for (const theme of ['cuisine', 'scenery']) {
    await page.evaluate((themeName) => {
      document.querySelector(`[data-archive-theme='${themeName}']`)?.scrollIntoView({ block: 'start' })
    }, theme)
    await page.waitForTimeout(900)

    samples.push(await page.evaluate((themeName) => {
      const themeRoot = document.querySelector<HTMLElement>(`[data-archive-theme='${themeName}']`)
      const track = themeRoot?.querySelector<HTMLElement>('.archive-theme-section__track')
      const firstCluster = themeRoot?.querySelector<HTMLElement>('.archive-cluster')
      const images = [...(themeRoot?.querySelectorAll<HTMLImageElement>('img') ?? [])]
        .filter((img) => {
          const rect = img.getBoundingClientRect()
          const style = window.getComputedStyle(img)
          return rect.width > 1
            && rect.height > 1
            && rect.bottom > 0
            && rect.top < window.innerHeight
            && style.display !== 'none'
            && style.visibility !== 'hidden'
        })
        .map((img) => {
          const rect = img.getBoundingClientRect()
          return {
            themeName,
            alt: img.alt,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })

      return {
        themeName,
        trackPaddingLeft: track ? Math.round(parseFloat(window.getComputedStyle(track).paddingLeft)) : -1,
        trackPaddingRight: track ? Math.round(parseFloat(window.getComputedStyle(track).paddingRight)) : -1,
        clusterWidth: firstCluster ? Math.round(firstCluster.getBoundingClientRect().width) : 0,
        images,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }
    }, theme))
  }

  const visibleImages = samples.flatMap((sample) => sample.images)
  expect(visibleImages.length).toBeGreaterThan(0)
  expect(samples.filter((sample) => sample.trackPaddingLeft !== 16 || sample.trackPaddingRight !== 16), JSON.stringify(samples)).toHaveLength(0)
  expect(samples.filter((sample) => sample.clusterWidth > 358), JSON.stringify(samples)).toHaveLength(0)
  expect(visibleImages.filter((image) => image.width < 240), JSON.stringify(visibleImages)).toHaveLength(0)
  expect(visibleImages.filter((image) => image.left < 0 || image.right > 390), JSON.stringify(visibleImages)).toHaveLength(0)
  expect(samples.filter((sample) => sample.scrollWidth !== sample.viewportWidth), JSON.stringify(samples)).toHaveLength(0)
})

test('Mobile Contact keeps the final section compact and readable', async ({ page }) => {
  await openMobileHome(page)
  await scrollChapterToTop(page, 'contact')

  const contactLayout = await page.evaluate(() => {
    const rectOf = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector)
      const rect = el?.getBoundingClientRect()
      return rect ? {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      } : null
    }

    return {
      footer: rectOf('#contact'),
      title: rectOf('.footer__title'),
      items: rectOf('.contact__items'),
      firstButton: rectOf('.contact__btn'),
      blobWrapDisplay: window.getComputedStyle(document.querySelector<HTMLElement>('.contact__blob-wrap')!).display,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(contactLayout.title?.width).toBeLessThanOrEqual(contactLayout.viewportWidth)
  expect(contactLayout.firstButton?.width).toBeLessThanOrEqual(contactLayout.viewportWidth - 32)
  expect(contactLayout.items?.height).toBeLessThanOrEqual(120)
  expect(contactLayout.footer?.height).toBeLessThanOrEqual(contactLayout.viewportWidth * 2.25)
  expect(contactLayout.blobWrapDisplay).toBe('none')
  expect(contactLayout.scrollWidth).toBe(contactLayout.viewportWidth)
})

test('Mobile persistent links keep accessible tap targets', async ({ page }) => {
  await openMobileHome(page)
  await scrollChapterToTop(page, 'contact')

  const tapTargets = await page.evaluate(() => {
    const selectors = ['.nav__brand', '.footer__links a']
    return selectors.flatMap((selector) => (
      [...document.querySelectorAll<HTMLElement>(selector)].map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          selector,
          text: el.textContent?.trim().replace(/\s+/g, ' ') ?? '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
    ))
  })

  expect(tapTargets.filter((target) => target.height < 44), JSON.stringify(tapTargets)).toHaveLength(0)
  expect(tapTargets.filter((target) => target.width < 44), JSON.stringify(tapTargets)).toHaveLength(0)
})
