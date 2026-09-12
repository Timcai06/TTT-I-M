import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Span = { segment: string; start: number; end: number }
type Commit = {
  kind: string
  frameId: number
  position: { segment: string; progress: number }
  permit: { owner: string; requestId: number; layoutVersion: number; resourceGeneration: number }
  layout: { spans: Span[] }
  story: { world: { screen: { mode: string; contentId?: string } }; camera: unknown; presentation: { readingOwner: string | null } }
  world: { nodes: Array<{ name: string; visible: boolean; scale: number[] }>; animation: { actions: unknown[] } }
  camera: { position: number[]; quaternion: number[]; view: number[]; projection: number[] }
  signal: { contentId: string; src: string; srcSet: string; width: number; height: number; targets: Array<{ name: string; fit: string; maxWidth: number; maxHeight: number }> }
  trace: string[]
}

const output = path.resolve('../../output/pm/NR-05')

async function boot(page: Page, url = '/') {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    ;(window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
  })
  await page.goto(url)
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect.poll(async () => (await commits(page)).length).toBeGreaterThan(0)
}

async function commits(page: Page): Promise<Commit[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { __portfolioArchiveExecution?: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution
    return api?.getSnapshot().filter(record => record.kind === 'sample-committed') ?? []
  })
}

async function latest(page: Page) {
  return (await commits(page)).at(-1)!
}

async function seekStory(page: Page, segment: string, progress: number) {
  const layout = (await latest(page)).layout
  const span = layout.spans.find(item => item.segment === segment)
  if (!span) throw new Error(`Missing story span: ${segment}`)
  await page.evaluate(top => window.scrollTo({ top, behavior: 'auto' }), span.start + (span.end - span.start) * progress)
  await expect.poll(async () => (await latest(page)).position.segment).toBe(segment)
  const quantum = 1.1 / (span.end - span.start)
  await expect.poll(async () => Math.abs((await latest(page)).position.progress - progress)).toBeLessThan(quantum)
  return latest(page)
}

function stable(value: Commit) {
  return {
    position: value.position,
    story: value.story,
    actions: value.world.animation.actions,
    nodes: value.world.nodes,
    camera: value.camera,
    signal: value.signal,
  }
}

test('one global T owns Index, entry, Frame to Stack and Stack reading in both directions', async ({ page }) => {
  test.setTimeout(120_000)
  await boot(page)
  const expected = ['index','entry','about-reading','about-life','life-reading','life-frame','frame-reading','frame-stack','stack-reading','stack-work','work-reading','work-contact','contact-reading']
  expect((await latest(page)).layout.spans.map(span => span.segment)).toEqual(expected)

  const evidence: Commit[] = []
  for (const segment of ['index', 'entry', 'frame-stack', 'stack-reading']) {
    for (const progress of [0, .5, .999]) {
      const value = await seekStory(page, segment, progress)
      evidence.push(value)
      expect(value.permit.owner).toBe('sample')
      expect(value.trace).toEqual(['permit-check','actions/world','matrix/anchors','camera','projections','DOM/passes','render','publish'])
      expect(value.world.animation.actions).toHaveLength(11)
      expect(value.world.nodes).toHaveLength(38)
      expect([...value.camera.position, ...value.camera.quaternion, ...value.camera.view, ...value.camera.projection].every(Number.isFinite)).toBe(true)
    }
  }

  const stack = evidence.find(value => value.position.segment === 'stack-reading' && value.position.progress > .4)!
  expect(stack.story.presentation.readingOwner).toBe('skills')
  expect(stack.story.world.screen).toEqual({ mode: 'photo', contentId: 'frame-final-horizon' })
  expect(stack.world.nodes.find(node => node.name === 'MonitorState_photo')?.visible).toBe(true)
  expect(stack.world.nodes.find(node => node.name === 'MonitorState_project')?.visible).toBe(false)
  expect(stack.signal).toEqual({
    contentId: 'frame-final-horizon',
    src: '/frame/scenery/scenery-11.webp',
    srcSet: expect.stringContaining('scenery-11-720.webp'),
    width: 1400,
    height: 1050,
    targets: [
      { name: 'StackPhotoViewerSurface', fit: 'contain', maxWidth: .462, maxHeight: .303 },
      { name: 'MonitorPhoto_Thumbnail', fit: 'contain', maxWidth: .067, maxHeight: .073 },
    ],
  })
  await expect(page.locator('#skills')).not.toHaveAttribute('inert', '')
  mkdirSync(output, { recursive: true })
  await page.screenshot({ path: path.join(output, 'stack-reading.png'), fullPage: false })

  const fresh = stable(await seekStory(page, 'frame-stack', .5))
  for (const [segment, progress] of [['entry',.8],['about-life',.3],['life-frame',.9],['stack-reading',.7],['frame-stack',.1]] as const) await seekStory(page, segment, progress)
  const history = stable(await seekStory(page, 'frame-stack', .5))
  expect(history).toEqual(fresh)

  writeFileSync(path.join(output, 'global-story-samples.json'), JSON.stringify(evidence, null, 2))
  await page.screenshot({ path: path.join(output, 'frame-stack-final-horizon.png'), fullPage: false })
})

test('global requests cover a Frame subanchor, project card offset, Index cancellation and the Work Contact takeover', async ({ page }) => {
  test.setTimeout(90_000)
  await boot(page, '/#frame-cuisine')
  await expect.poll(async () => (await latest(page)).position.segment).toBe('frame-reading')
  await expect.poll(() => page.locator('#frame-cuisine').evaluate(node => Math.abs(node.getBoundingClientRect().top - 40))).toBeLessThan(8)

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(async () => (await latest(page)).position.segment).toBe('index')
  await expect(page.locator('.hero__screen-page')).toHaveCount(1)
  // Scrolling into the pull-back raises index progress; the panel is no longer a
  // control that could do it with a click.
  await page.evaluate(() => window.scrollTo(0, Math.round(innerHeight * .2)))
  await expect.poll(() => page.locator('canvas[data-archive-shared]').getAttribute('data-archive-progress').then(Number)).toBeGreaterThan(.08)
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 360, cancelable: true }))
    document.querySelector<HTMLButtonElement>('button[aria-label="Scroll to WORK"]')!.click()
  })
  await expect(page.locator('#projects')).toBeVisible()
  const layout = (await latest(page)).layout
  for (const segment of ['stack-work','work-reading','work-contact','contact-reading']) {
    const span = layout.spans.find(item => item.segment === segment)!
    await page.evaluate(top => window.scrollTo({ top, behavior: 'auto' }), span.start + (span.end - span.start) * .5)
    await expect.poll(async () => (await latest(page)).position.segment).toBe(segment)
    const value = await latest(page)
    expect(value.permit.owner).toBe('sample')
    expect(value.world.animation.actions).toHaveLength(11)
    expect(value.world.nodes).toHaveLength(38)
  }
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot', 'contact-reading')
  await expect(page.locator('#contact')).not.toHaveAttribute('inert', '')

  const tile = page.locator('#project-educanvas button')
  await tile.evaluate(node => (node as HTMLButtonElement).click())
  await expect.poll(() => page.locator('#project-educanvas').evaluate(node => Math.abs(node.getBoundingClientRect().top - 72))).toBeLessThan(8)
  await expect(page.locator('html')).not.toHaveAttribute('data-archive-routing', 'true')
  const settled = await page.evaluate(() => scrollY)
  await page.waitForTimeout(1_300)
  expect(Math.abs((await page.evaluate(() => scrollY)) - settled)).toBeLessThan(2)
})

test('Frame to Stack survives layout growth and restores the latest request after WebGL loss', async ({ page }) => {
  test.setTimeout(90_000)
  await boot(page)
  const before = await seekStory(page, 'frame-stack', .62)
  await page.evaluate(() => {
    document.getElementById('about')!.style.paddingBottom = '210px'
    window.dispatchEvent(new Event('load'))
  })
  await expect.poll(async () => (await latest(page)).permit.layoutVersion).toBeGreaterThan(before.permit.layoutVersion)
  const grown = await latest(page)
  expect(grown.position.segment).toBe('frame-stack')
  expect(Math.abs(grown.position.progress - before.position.progress)).toBeLessThan(.002)

  await page.locator('canvas[data-archive-shared]').evaluate(canvas => {
    const extension = (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('WEBGL_lose_context unavailable')
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 550)
  })
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state', 'recovering')
  await page.getByRole('button', { name: 'Scroll to STACK', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
  await expect.poll(async () => (await latest(page)).permit.resourceGeneration, { timeout: 20_000 }).toBeGreaterThan(before.permit.resourceGeneration)
  const restored = await latest(page)
  expect(restored.position.segment).toBe('stack-reading')
  expect(restored.permit.requestId).toBeGreaterThan(before.permit.requestId)
  expect(restored.story.world.screen).toEqual({ mode: 'photo', contentId: 'frame-final-horizon' })
  await expect(page.locator('#skills')).not.toHaveAttribute('inert', '')
})
