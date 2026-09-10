import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Commit = {
  kind: string
  frameId: number
  position: { segment: string; progress: number }
  permit: { owner: string; requestId: number; layoutVersion: number; resourceGeneration: number }
  story: { world: { cabinet: { drawerOpenness: number; folderLift: number } }; presentation: { readingOwner: string | null } }
  world: { animation: { actions: unknown[] }; nodes: Array<{ name: string; visible: boolean }>; anchors: Record<string, number[][]> }
  camera: { position: number[]; quaternion: number[]; view: number[]; projection: number[] }
  trace: string[]
}

const output = path.resolve('../../output/pm/NR-05')

async function records(page: Page): Promise<Commit[]> {
  return page.evaluate(() => (window as unknown as { __portfolioArchiveExecution?: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution?.getSnapshot() ?? [])
}

async function latest(page: Page) {
  return (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!
}

async function boot(page: Page, url = '/') {
  mkdirSync(output, { recursive: true })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    ;(window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
  })
  await page.goto(url)
  await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20_000 })
  await expect.poll(async () => (await latest(page))?.position.segment).toBeTruthy()
}

async function seek(page: Page, segment: string, progress: number) {
  const layout = await page.evaluate(() => {
    const api = (window as unknown as { __portfolioArchiveExecution: { getSnapshot(): Array<{ kind:string; layout:{ spans:Array<{ segment:string; start:number; end:number }> } }> } }).__portfolioArchiveExecution
    return api.getSnapshot().filter(record => record.kind === 'sample-committed').at(-1)!.layout
  })
  const span = layout.spans.find(item => item.segment === segment)
  if (!span) throw new Error(`Missing segment ${segment}`)
  await page.evaluate(top => window.scrollTo({ top, behavior:'auto' }), span.start + (span.end - span.start) * progress)
  await expect.poll(async () => (await latest(page)).position.segment).toBe(segment)
  await expect.poll(async () => Math.abs((await latest(page)).position.progress - progress)).toBeLessThan(1.1 / (span.end - span.start))
  return latest(page)
}

function stable(value: Commit) {
  return { story:value.story, actions:value.world.animation.actions, nodes:value.world.nodes, anchors:value.world.anchors, camera:value.camera }
}

test('the last four segments are history-independent, with Contact reading using its real terminal scroll boundary', async ({ page }) => {
  test.setTimeout(120_000)
  await boot(page)
  const evidence: Commit[] = []
  const segments = ['stack-work','work-reading','work-contact']
  for (const segment of segments) for (const progress of [.001,.5,.999]) {
    const value = await seek(page, segment, progress)
    evidence.push(value)
    expect(value.permit.owner).toBe('sample')
    expect(value.world.animation.actions).toHaveLength(11)
    expect(value.world.nodes).toHaveLength(38)
    expect(value.world.anchors.WorkReading).toHaveLength(4)
    expect(value.world.anchors.ContactReading).toHaveLength(4)
    expect([...value.camera.position, ...value.camera.quaternion, ...value.camera.view, ...value.camera.projection].every(Number.isFinite)).toBe(true)
    expect(value.trace).toEqual(['permit-check','actions/world','matrix/anchors','camera','projections','DOM/passes','render','publish'])
  }
  const contactReading = await seek(page, 'contact-reading', 0)
  evidence.push(contactReading)
  expect(contactReading.permit.owner).toBe('sample')
  expect(contactReading.story.presentation.readingOwner).toBe('contact')
  const contactBoundary = await page.evaluate(() => {
    const snapshot = (window as unknown as { __portfolioArchiveExecution: { getSnapshot(): Array<{ kind:string; layout:{ spans:Array<{ segment:string; start:number; end:number }> } }> } }).__portfolioArchiveExecution
      .getSnapshot().filter(record => record.kind === 'sample-committed').at(-1)!
    const span = snapshot.layout.spans.find(item => item.segment === 'contact-reading')!
    return { span, scrollY, maxScroll: document.documentElement.scrollHeight - innerHeight }
  })
  expect(contactBoundary.span.end - contactBoundary.span.start).toBe(1)
  expect(Math.abs(contactBoundary.maxScroll - contactBoundary.span.start)).toBeLessThanOrEqual(1)
  expect(Math.abs(contactBoundary.scrollY - contactBoundary.maxScroll)).toBeLessThanOrEqual(1)
  const fresh = stable(await seek(page, 'work-contact', .5))
  for (const [segment, progress] of [['contact-reading',0],['stack-work',.2],['work-reading',.7]] as const) await seek(page, segment, progress)
  expect(stable(await seek(page, 'work-contact', .5))).toEqual(fresh)
  expect((await seek(page, 'work-reading', .5)).story.presentation.readingOwner).toBe('projects')
  await expect(page.locator('#projects')).not.toHaveAttribute('inert', '')
  expect((await seek(page, 'contact-reading', 0)).story.presentation.readingOwner).toBe('contact')
  await expect(page.locator('#contact')).not.toHaveAttribute('inert', '')
  await page.screenshot({ path:path.join(output, 'contact-reading.png') })
  writeFileSync(path.join(output, 'work-contact-samples.json'), JSON.stringify({ scrollSamples:evidence, contactReadingBoundary:contactBoundary }, null, 2))
})

test('Work and Contact direct routes, returns, bookmarks and project content share the current request', async ({ page }) => {
  test.setTimeout(120_000)
  await boot(page)
  await page.getByRole('button', { name:'Scroll to WORK', exact:true }).click()
  await expect.poll(async () => (await latest(page)).position.segment).toBe('work-reading')
  await expect(page.locator('#projects')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#projects [id^="project-"]')).toHaveCount(6)
  await page.evaluate(() => window.scrollBy(0, 180))
  const workBookmark = await page.evaluate(() => scrollY)
  await page.getByRole('button', { name:'RETURN TO OBJECT ↖' }).click()
  await expect.poll(async () => {
    const value = await latest(page)
    return value.position.segment === 'stack-work' ? Math.abs(value.position.progress - .56) : 1
  }).toBeLessThan(.003)
  await page.getByRole('button', { name:'Scroll to WORK', exact:true }).click()
  await expect.poll(() => page.evaluate(saved => Math.abs(scrollY - saved), workBookmark)).toBeLessThan(2)

  await page.getByRole('button', { name:'Scroll to CONTACT', exact:true }).click()
  await expect.poll(async () => (await latest(page)).position.segment).toBe('contact-reading')
  await expect(page.locator('#contact')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#contact .contact__btn')).toHaveCount(2)
  await expect(page.locator('#contact')).not.toHaveClass(/is-iris-reveal/)
  const contactBookmark = await page.evaluate(() => scrollY)
  await page.getByRole('button', { name:'RETURN TO OBJECT ↖' }).click()
  await expect.poll(async () => {
    const value = await latest(page)
    return value.position.segment === 'work-contact' ? Math.abs(value.position.progress - .56) : 1
  }).toBeLessThan(.003)
  await page.getByRole('button', { name:'Scroll to CONTACT', exact:true }).click()
  await expect.poll(() => page.evaluate(saved => Math.abs(scrollY - saved), contactBookmark)).toBeLessThan(2)
  const settled = await page.evaluate(() => scrollY)
  await page.waitForTimeout(900)
  expect(Math.abs((await page.evaluate(() => scrollY)) - settled)).toBeLessThan(2)
  await expect(page.locator('.archive-route-layer--reading')).toHaveCount(0)
})

test('GPU recovery commits the newest Contact request and never revives a legacy owner', async ({ page }) => {
  test.setTimeout(90_000)
  await boot(page)
  const before = await seek(page, 'work-contact', .4)
  await page.locator('canvas[data-archive-shared]').evaluate(canvas => {
    const extension = (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('WEBGL_lose_context unavailable')
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 350)
  })
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state', 'recovering')
  await page.getByRole('button', { name:'Scroll to CONTACT', exact:true }).evaluate(node => (node as HTMLButtonElement).click())
  await expect.poll(async () => (await latest(page)).permit.resourceGeneration, { timeout:20_000 }).toBeGreaterThan(before.permit.resourceGeneration)
  const restored = await latest(page)
  expect(restored.position.segment).toBe('contact-reading')
  expect(restored.permit.owner).toBe('sample')
  expect(restored.permit.requestId).toBeGreaterThan(before.permit.requestId)
  await expect(page.locator('#contact')).not.toHaveAttribute('inert', '')
})
