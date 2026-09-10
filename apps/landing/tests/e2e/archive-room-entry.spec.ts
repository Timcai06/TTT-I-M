import { expect, test, type Page } from '@playwright/test'

type Commit = {
  kind: string
  position: { segment: string; progress: number }
  layout: { spans: Array<{ segment: string; start: number; end: number }> }
}

const roomEntries = [
  { segment: 'entry', track: 'entry', label: '打开 About 书本', target: 'about' },
  { segment: 'about-life', track: 'about-life', label: '打开 life', target: 'life' },
  { segment: 'life-frame', track: 'life-frame', label: '打开 frame', target: 'frame' },
  { segment: 'frame-stack', track: 'frame-stack', label: '打开 skills', target: 'skills' },
  { segment: 'stack-work', track: 'stack-work', label: '打开 projects', target: 'projects' },
  { segment: 'work-contact', track: 'work-contact', label: '打开 contact', target: 'contact' },
] as const

async function commits(page: Page): Promise<Commit[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { __portfolioArchiveExecution?: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution
    return api?.getSnapshot().filter(record => record.kind === 'sample-committed') ?? []
  })
}

async function boot(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    ;(window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
  })
  await page.goto('/')
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect.poll(async () => (await commits(page)).length).toBeGreaterThan(0)
}

async function seekStory(page: Page, segment: string, progress = .5) {
  const layout = (await commits(page)).at(-1)!.layout
  const span = layout.spans.find(item => item.segment === segment)
  if (!span) throw new Error(`Missing story span: ${segment}`)
  await page.evaluate(top => window.scrollTo({ top, behavior: 'auto' }), span.start + (span.end - span.start) * progress)
  await expect.poll(async () => (await commits(page)).at(-1)?.position.segment).toBe(segment)
}

async function ownsProjectedPoint(hit: ReturnType<Page['locator']>) {
  return hit.evaluate(button => {
    const rect = button.getBoundingClientRect()
    const clip = getComputedStyle(button).clipPath.match(/-?\d+(?:\.\d+)?px/g)?.map(parseFloat) ?? []
    const points = Array.from({ length: clip.length / 2 }, (_, index) => ({ x: clip[index * 2], y: clip[index * 2 + 1] }))
    const point = points.length
      ? points.reduce((sum, value) => ({ x: sum.x + value.x / points.length, y: sum.y + value.y / points.length }), { x: 0, y: 0 })
      : { x: rect.width / 2, y: rect.height / 2 }
    const x = rect.left + point.x
    const y = rect.top + point.y
    const top = document.elementFromPoint(x, y)
    return { targetOwnsPoint: Boolean(top && button.contains(top)), topClass: top?.className ?? null, x, y }
  })
}

test('About return exposes a real clickable Life object instead of its sticky stage', async ({ page }) => {
  test.setTimeout(120_000)
  await boot(page)
  await page.locator('.hero__screen-page').click()
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  const about = page.locator('#about')
  await expect(about).not.toHaveAttribute('inert', '')
  await about.locator('.about__block--manifesto').scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, 520)
  await page.getByRole('button', { name: 'RETURN TO OBJECT ↖', exact: true }).click()
  await expect(about).toHaveAttribute('inert', '')

  const lifeHit = page.locator('[data-archive-track="about-life"] .archive-bridge__room-hit')
  await page.mouse.move(640, 360)
  for (let index = 0; index < 30 && !(await lifeHit.isVisible()); index += 1) {
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(100)
  }
  await expect(lifeHit).toBeVisible()
  await expect(lifeHit).toBeEnabled()
  await expect(lifeHit).toHaveCSS('pointer-events', 'auto')
  const lifeOwner = await ownsProjectedPoint(lifeHit)
  expect(lifeOwner.targetOwnsPoint, `about-life top hit was ${String(lifeOwner.topClass)}`).toBe(true)
  await page.mouse.click(lifeOwner.x, lifeOwner.y)
  await expect(page.locator('#life')).not.toHaveAttribute('inert', '')
})

test('only the projected owner accepts input and every shared room entry supports a normal click', async ({ page }) => {
  test.setTimeout(150_000)
  await boot(page)

  const hits = page.locator('.archive-bridge__room-hit')
  await expect(hits).toHaveCount(roomEntries.length)
  for (const hit of await hits.all()) {
    await expect(hit).toBeHidden()
    await expect(hit).toBeDisabled()
    await expect(hit).toHaveAttribute('tabindex', '-1')
  }

  for (const entry of roomEntries) {
    const hit = entry.track === 'entry'
      ? page.locator('.archive-bridge--entry .archive-bridge__room-hit')
      : page.locator(`[data-archive-track="${entry.track}"] .archive-bridge__room-hit`)
    let owner: Awaited<ReturnType<typeof ownsProjectedPoint>> | null = null
    for (const progress of [.2, .35, .5, .65, .8]) {
      await seekStory(page, entry.segment, progress)
      if (await hit.isVisible()) {
        owner = await ownsProjectedPoint(hit)
        if (owner.targetOwnsPoint) break
      }
    }
    await expect(hit).toHaveAttribute('aria-label', entry.label)
    await expect(hit).toBeVisible()
    await expect(hit).toBeEnabled()
    await expect(hit).toHaveAttribute('tabindex', '0')
    await expect(hit).toHaveCSS('pointer-events', 'auto')
    expect(owner?.targetOwnsPoint, `${entry.track} top hit was ${String(owner?.topClass)}`).toBe(true)
    if (!owner) throw new Error(`Missing projected hit owner: ${entry.track}`)
    await page.mouse.click(owner.x, owner.y)
    await expect(page.locator(`#${entry.target}`)).not.toHaveAttribute('inert', '')
    await expect(page.locator('.archive-route-layer')).toHaveCount(0)
  }

  await page.getByRole('button', { name: 'RETURN TO OBJECT ↖', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Scroll to ABOUT', exact: true })).toBeEnabled()
  const fallback = page.locator('[data-archive-track="about-life"] .archive-bridge__footer a')
  await expect(fallback).toHaveCSS('pointer-events', 'auto')
})
