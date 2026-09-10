import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const output = path.resolve('../../output/pm/NR-05-R3')

async function boot(page: Page, url = '/') {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
}

async function projectedOwner(hit: Locator) {
  return hit.evaluate(button => {
    const rect = button.getBoundingClientRect()
    const values = getComputedStyle(button).clipPath.match(/-?\d+(?:\.\d+)?px/g)?.map(parseFloat) ?? []
    const points = Array.from({ length: values.length / 2 }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }))
    const center = points.length
      ? points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 })
      : { x: rect.width / 2, y: rect.height / 2 }
    const x = rect.left + center.x
    const y = rect.top + center.y
    const top = document.elementFromPoint(x, y)
    return { x, y, owns: Boolean(top && button.contains(top)), top: top?.getAttribute('aria-label') ?? top?.className ?? null }
  })
}

async function reachLifeObject(page: Page) {
  await boot(page)
  await page.locator('.hero__screen-page').click()
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  const about = page.locator('#about')
  await expect(about).not.toHaveAttribute('inert', '')
  await about.locator('.about__block--manifesto').scrollIntoViewIfNeeded()
  await page.mouse.move(640, 360)
  await page.mouse.wheel(0, 520)
  await page.getByRole('button', { name: 'RETURN TO OBJECT ↖', exact: true }).click()
  await expect(about).toHaveAttribute('inert', '')
  const hit = page.locator('[data-archive-track="about-life"] .archive-bridge__room-hit')
  for (let index = 0; index < 30 && !(await hit.isVisible()); index += 1) {
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(100)
  }
  await expect(hit).toBeVisible()
  await expect(hit).toBeEnabled()
  return hit
}

async function captureClick(page: Page) {
  await page.evaluate(() => {
    ;(window as unknown as { __nr05r3Events: unknown[] }).__nr05r3Events = []
    const events = (window as unknown as { __nr05r3Events: unknown[] }).__nr05r3Events
    document.addEventListener('click', event => events.push({
      type: 'click',
      target: (event.target as Element | null)?.getAttribute?.('aria-label') ?? (event.target as HTMLElement | null)?.className ?? null,
      hash: location.hash,
      scrollY,
    }), { capture: true, once: true })
    window.addEventListener('archive-request-start', () => events.push({ type: 'archive-request-start', hash: location.hash, scrollY }), { once: true })
  })
}

async function chapterProgress(page: Page, id: string) {
  return page.locator(`#${id}`).evaluate(chapter => {
    const root = (chapter.parentElement?.classList.contains('pin-spacer') ? chapter.parentElement : chapter) as HTMLElement
    const top = root.getBoundingClientRect().top + scrollY
    return { scrollY, ratio: Math.max(0, Math.min(1, (scrollY - top) / Math.max(1, root.offsetHeight - innerHeight))) }
  })
}

test('six normal-mode rapid Life object clicks commit the requested reading owner', async ({ page }) => {
  test.setTimeout(180_000)
  const attempts = []
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const hit = await reachLifeObject(page)
    await captureClick(page)
    const owner = await projectedOwner(hit)
    expect(owner.owns, `attempt ${attempt} owner was ${String(owner.top)}`).toBe(true)
    await page.mouse.click(owner.x, owner.y)
    const life = page.locator('#life')
    await expect(life).not.toHaveAttribute('inert', '')
    const state = await page.evaluate(() => ({
      hash: location.hash,
      scrollY,
      lifeInert: document.getElementById('life')?.hasAttribute('inert'),
      sampleOwner: document.documentElement.dataset.archiveSampleOwner ?? null,
      events: (window as unknown as { __nr05r3Events: unknown[] }).__nr05r3Events,
      diagnosticFlag: (window as unknown as { __portfolioArchiveExecutionEnabled?: boolean }).__portfolioArchiveExecutionEnabled ?? null,
    }))
    expect(state.hash).toBe('#life')
    expect(state.sampleOwner).toBe('life-reading')
    attempts.push({ attempt, owner, state })
  }
  mkdirSync(output, { recursive: true })
  writeFileSync(path.join(output, 'rapid-life-clicks.json'), JSON.stringify(attempts, null, 2))
})

test('bookmark, RETURN object and a newer navigation request retain distinct intents', async ({ page }) => {
  test.setTimeout(120_000)
  await boot(page)
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  const about = page.locator('#about')
  await expect(about).not.toHaveAttribute('inert', '')
  await about.locator('.about__block--manifesto').scrollIntoViewIfNeeded()
  await expect(page.locator('.nav__link.is-active')).toHaveAttribute('aria-label', '01 · About')
  await page.evaluate(() => {
    window.addEventListener('click', event => {
      const button = (event.target as Element | null)?.closest?.('button[aria-label="Scroll to CONTACT"]')
      const chapter = document.getElementById('about')
      const root = chapter?.parentElement?.classList.contains('pin-spacer') ? chapter.parentElement : chapter
      if (button && root) {
        const top = root.getBoundingClientRect().top + scrollY
        ;(window as unknown as { __nr05r3Bookmark: { scrollY: number; ratio: number } }).__nr05r3Bookmark = {
          scrollY,
          ratio: Math.max(0, Math.min(1, (scrollY - top) / Math.max(1, root.offsetHeight - innerHeight))),
        }
      }
    }, { capture: true, once: true })
  })

  await page.getByRole('button', { name: 'Scroll to CONTACT', exact: true }).click()
  const bookmark = await page.evaluate(() => (window as unknown as { __nr05r3Bookmark: { scrollY: number; ratio: number } }).__nr05r3Bookmark)
  await expect(page.locator('#contact')).not.toHaveAttribute('inert', '')
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  await expect(about).not.toHaveAttribute('inert', '')
  const restored = await chapterProgress(page, 'about')
  mkdirSync(output, { recursive: true })
  writeFileSync(path.join(output, 'about-bookmark-debug.json'), JSON.stringify({
    bookmark,
    restored,
    sampleOwner: await page.locator('html').getAttribute('data-archive-sample-owner'),
  }, null, 2))
  await expect.poll(async () => Math.abs((await chapterProgress(page, 'about')).ratio - bookmark.ratio)).toBeLessThan(.002)

  await page.getByRole('button', { name: 'RETURN TO OBJECT ↖', exact: true }).click()
  await expect(about).toHaveAttribute('inert', '')
  const entry = page.locator('.archive-bridge--entry .archive-bridge__room-hit')
  for (let index = 0; index < 30 && !(await entry.isVisible()); index += 1) {
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(100)
  }
  await expect(entry).toBeVisible()
  const owner = await projectedOwner(entry)
  expect(owner.owns, `entry owner was ${String(owner.top)}`).toBe(true)
  await page.mouse.click(owner.x, owner.y)
  await expect(about).not.toHaveAttribute('inert', '')
  await expect.poll(async () => Math.abs((await chapterProgress(page, 'about')).ratio - bookmark.ratio)).toBeLessThan(.002)
  const reopened = await chapterProgress(page, 'about')

  await page.getByRole('button', { name: 'Scroll to FRAME', exact: true }).click()
  await page.getByRole('button', { name: 'Scroll to STACK', exact: true }).click()
  await expect(page.locator('#skills')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#frame')).toHaveAttribute('inert', '')
  await expect(page).toHaveURL(/#skills$/)
  writeFileSync(path.join(output, 'navigation-intents.json'), JSON.stringify({
    bookmark,
    restored,
    reopened,
    latestRequest: {
      hash: await page.evaluate(() => location.hash),
      sampleOwner: await page.locator('html').getAttribute('data-archive-sample-owner'),
      frameInert: await page.locator('#frame').getAttribute('inert'),
      skillsInert: await page.locator('#skills').getAttribute('inert'),
    },
  }, null, 2))
})

test('refreshed layout preserves Frame subtarget and Work project offset', async ({ page }) => {
  test.setTimeout(90_000)
  await boot(page, '/#frame-cuisine')
  const cuisine = page.locator('#frame-cuisine')
  await expect(cuisine).not.toHaveAttribute('inert', '')
  await expect.poll(() => cuisine.evaluate(node => Math.abs(node.getBoundingClientRect().top - 40))).toBeLessThan(8)
  const frameLanding = await cuisine.evaluate(node => ({ top: node.getBoundingClientRect().top, hash: location.hash }))

  await page.getByRole('button', { name: 'Scroll to WORK', exact: true }).click()
  const project = page.locator('#project-educanvas')
  await expect(page.locator('#projects')).not.toHaveAttribute('inert', '')
  await project.locator('button').first().click()
  await expect.poll(() => project.evaluate(node => Math.abs(node.getBoundingClientRect().top - 72))).toBeLessThan(8)
  writeFileSync(path.join(output, 'subtarget-offsets.json'), JSON.stringify({
    frameLanding,
    workLanding: await project.evaluate(node => ({
      top: node.getBoundingClientRect().top,
      hash: location.hash,
      sampleOwner: document.documentElement.dataset.archiveSampleOwner ?? null,
    })),
  }, null, 2))
})

test('a real wheel input cancels refresh-stage correction ownership', async ({ page }) => {
  test.setTimeout(60_000)
  await boot(page)
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  await expect(page.locator('#about')).not.toHaveAttribute('inert', '')
  await expect(page.locator('.archive-route-layer')).toHaveCount(0)
  await page.evaluate(() => {
    ;(window as unknown as { __nr05r3CancelEvents: string[] }).__nr05r3CancelEvents = []
    const events = (window as unknown as { __nr05r3CancelEvents: string[] }).__nr05r3CancelEvents
    window.addEventListener('archive-request-start', () => events.push('archive-request-start'), { once: true })
    window.addEventListener('wheel', () => events.push('wheel'), { once: true })
  })

  await page.getByRole('button', { name: 'Scroll to CONTACT', exact: true }).click()
  await page.mouse.wheel(0, -1_400)
  await expect.poll(() => page.locator('html').getAttribute('data-archive-sample-owner'), {
    intervals: [200, 300, 500, 800],
  }).not.toBe('contact-reading')
  const cancelled = await page.evaluate(() => ({
    events: (window as unknown as { __nr05r3CancelEvents: string[] }).__nr05r3CancelEvents,
    hash: location.hash,
    scrollY,
    sampleOwner: document.documentElement.dataset.archiveSampleOwner ?? null,
  }))
  expect(cancelled.events).toEqual(['archive-request-start', 'wheel'])
  expect(cancelled.sampleOwner).not.toBe('contact-reading')
  mkdirSync(output, { recursive: true })
  writeFileSync(path.join(output, 'user-cancel.json'), JSON.stringify(cancelled, null, 2))
})
