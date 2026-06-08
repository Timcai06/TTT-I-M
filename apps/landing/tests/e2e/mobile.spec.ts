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
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(contactLayout.title?.width).toBeLessThanOrEqual(contactLayout.viewportWidth)
  expect(contactLayout.firstButton?.width).toBeLessThanOrEqual(contactLayout.viewportWidth - 32)
  expect(contactLayout.items?.height).toBeLessThanOrEqual(120)
  expect(contactLayout.footer?.height).toBeLessThanOrEqual(640)
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
