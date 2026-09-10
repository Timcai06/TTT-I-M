import { expect, test, type Page } from '@playwright/test'
import { Matrix4, Vector3 } from 'three'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'

type Projection = { matrix: number[]; corners: Array<{ x: number; y: number }>; offset: number; layout: { width: number; height: number; pageWidth: number; pageHeight: number; originX: number; originY: number } }
type Commit = { beforeRender: { animation: Commit['world']['animation']; nodes: Commit['world']['nodes'] }; kind: string; reason?: string; frameId: number; permit: { resourceGeneration: number; layoutVersion: number; requestId: number }; position: { segment: string; progress: number }; trace: string[]; camera: { position: number[]; quaternion: number[]; view: number[]; projection: number[]; fov: number }; world: { anchors: Record<string, number[][]>; animation: { actions: Array<{ clip: string; action: { time: number; effectiveTimeScale: number; effectiveWeight: number }; node: { position: number[]; quaternion: number[]; scale: number[]; matrixWorld: number[] } }> }; transferGeometryApplied: boolean; nodes: Array<{ name: string; visible: boolean }> }; target: Projection | null; source: Projection | null }
async function records(page: Page): Promise<Commit[]> {
  return page.evaluate(() => (window as unknown as { __portfolioArchiveExecution?: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution?.getSnapshot() ?? [])
}
async function boot(page: Page, url = '/', diagnostics = true, waitForIntroExit = true) {
  await page.addInitScript(enabled => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 4 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    if (enabled) (window as unknown as { __portfolioArchiveExecutionEnabled: boolean }).__portfolioArchiveExecutionEnabled = true
  }, diagnostics)
  await page.goto(url)
  if (waitForIntroExit) await expect(page.locator('.intro')).toHaveCount(0, { timeout: 20000 })
}
async function seek(page: Page, track: string, p: number) {
  await page.locator(`[data-archive-track="${track}"]`).evaluate((node, progress) => {
    const rect = node.getBoundingClientRect()
    window.scrollTo({ top: scrollY + rect.top - innerHeight + rect.height * progress, behavior: 'auto' })
  }, p)
  await expect.poll(async () => {
    const values = await records(page)
    const error = values.find(r => r.kind === 'execution-error')
    if (error) throw new Error(error.reason)
    return values.at(-1)?.position?.segment
  }).toBe(track)
  const scrollQuantum = await page.locator(`[data-archive-track="${track}"]`).evaluate(node => 1.1 / node.getBoundingClientRect().height)
  await expect.poll(async () => Math.abs(((await records(page)).at(-1)?.position?.progress ?? -1) - p)).toBeLessThan(scrollQuantum)
}
async function checkProjection(page: Page, track: string, value: Commit, source = false) {
  const projection = source ? value.source : value.target
  if (!projection) return
  const selector = source ? '.archive-bridge__page--source' : '.archive-chapter-bridge__page'
  const actual = await page.locator(`[data-archive-track="${track}"] ${selector}`).evaluate(node => {
    const m = new DOMMatrixReadOnly(getComputedStyle(node).transform)
    const width = (node as HTMLElement).clientWidth, height = (node as HTMLElement).clientHeight
    return [[0, 0], [width, 0], [width, height], [0, height]].map(([x,y]) => { const p = m.transformPoint(new DOMPoint(x,y)); return {x:p.x/p.w,y:p.y/p.w} })
  })
  const surface = source ? track === 'about-life' ? 'AboutReading' : 'LifeReading' : track === 'about-life' ? 'LifeReading' : 'FrameReading'
  const points = value.world.anchors[surface].map(p => new Vector3().fromArray(p))
  const normal = points[1].clone().sub(points[0]).cross(points[3].clone().sub(points[0])).normalize()
  if (normal.dot(new Vector3().fromArray(value.camera.position).sub(points[0])) < 0) normal.negate()
  const t = source ? Math.min(1, Math.max(0, value.position.progress / .08)) : Math.min(1, Math.max(0, (value.position.progress - .94) / .06))
  const expand = source ? 1 - t * t * (3 - 2*t) : t * t * (3 - 2*t)
  const l = projection.layout
  const corners = [[0,0],[l.width,0],[l.width,l.height],[0,l.height]]
  for (const [i, point] of points.entries()) {
    const projected = point.addScaledVector(normal, projection.offset).applyMatrix4(new Matrix4().fromArray(value.camera.view)).applyMatrix4(new Matrix4().fromArray(value.camera.projection))
    const x = (projected.x+1)*l.width/2, y = (1-projected.y)*l.height/2
    expect(Math.abs(actual[i].x - (x+(corners[i][0]-x)*expand-l.originX))).toBeLessThan(.5)
    expect(Math.abs(actual[i].y - (y+(corners[i][1]-y)*expand-l.originY))).toBeLessThan(.5)
  }
}
test('real sample submits actions, camera, projection and DOM in order across both bridges', async ({ page }) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await boot(page)
  const evidence: Commit[] = []
  const boundaries = [0, .08, .20, .23, .24, .26, .56, .60, .62, .72, .74, .77, .94, 1]
  const points = [...new Set(boundaries.flatMap(p => [p-.001, p, p+.001]).filter(p => p > 0 && p < 1))].sort((a,b) => a-b)
  for (const track of ['about-life', 'life-frame']) for (const p of points) {
    await seek(page, track, p)
    const value = (await records(page)).at(-1)!
    evidence.push(value)
    expect(value.trace).toEqual(['permit-check', 'actions/world', 'matrix/anchors', 'camera', 'projections', 'DOM/passes', 'render', 'publish'])
    expect(value.world.animation.actions).toHaveLength(11)
    expect(value.world.animation.actions.every(action => action.action.effectiveWeight === 1 && action.action.effectiveTimeScale === 0)).toBe(true)
    expect(value.world.transferGeometryApplied).toBe(true)
    expect(value.world.nodes).toHaveLength(38)
    const wall = track === 'life-frame' && value.position.progress >= .56
    expect(value.world.nodes.find(n => n.name === 'LifeMemoryPhoto')?.visible).toBe(track !== 'life-frame' || value.position.progress <= .24)
    expect(value.world.nodes.find(n => n.name === 'ArchivePhoto_04')?.visible).toBe(wall)
    expect(value.beforeRender).toEqual({ animation: value.world.animation, nodes: value.world.nodes })
    expect(value.world.nodes.filter(node => node.name.startsWith('MonitorState')).every(node => !node.visible)).toBe(true)
    checkActionOracle(value)
    await checkProjection(page, track, value)
    await checkProjection(page, track, value, true)
  }
  expect(errors).toEqual([])
  const directory = path.resolve('../../output/pm/NR-02B')
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, 'bridge-frames.json'), JSON.stringify(evidence, null, 2))
  await page.screenshot({ path: path.join(directory, 'frame-arrival.png') })
})

function checkActionOracle(value: Commit) {
  const bytes = readFileSync('src/assets/personal-archive/personal-space.glb')
  const raw = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()) as { animations: Array<{ name: string; samplers: Array<{ input: number }> }>; accessors: Array<{ max: number[] }> }
  const smooth = (p: number, a: number, b: number) => { const x = Math.min(1, Math.max(0, (p-a)/(b-a))); return x*x*(3-2*x) }
  const { segment, progress } = value.position
  for (const entry of value.world.animation.actions) {
    const clip = raw.animations.find(clip => clip.name === entry.clip)!
    const duration = Math.max(...clip.samplers.map(s => raw.accessors[s.input].max[0]))
    const drawer = /WorkDrawer|CinemaRail/.test(entry.clip), folder = entry.clip === 'WorkFolderLift'
    const start = drawer ? 1 : folder ? 74/30 : 0
    const end = drawer ? 2.4 : folder ? 110/30 : duration
    const amount = entry.clip === 'NotebookOpen' ? 1 : drawer || folder ? 0 : entry.clip.startsWith('FramePrint') ? (segment === 'frame-reading' ? 1 : segment === 'life-frame' ? smooth(progress,.24,.56) : 0) : segment === 'about-reading' ? 0 : segment === 'about-life' ? smooth(progress,.23,.62) : 1
    expect(Math.abs(entry.action.time - (start+amount*(end-start)))).toBeLessThanOrEqual(1e-6)
  }
}

async function seekReading(page: Page, chapter: string, progress: number) {
  await page.evaluate(({ chapter, progress }) => {
    const pair = chapter === 'about' ? ['#archive-entry','[data-archive-track="about-life"]'] : chapter === 'life' ? ['[data-archive-track="about-life"]','[data-archive-track="life-frame"]'] : ['[data-archive-track="life-frame"]','[data-archive-track="frame-stack"]']
    const left = document.querySelector(pair[0])!.getBoundingClientRect(), right = document.querySelector(pair[1])!.getBoundingClientRect()
    const start = scrollY+left.bottom-innerHeight, end = scrollY+right.top-innerHeight
    window.scrollTo(0,start+(end-start)*progress)
  }, { chapter, progress })
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe(`${chapter}-reading`)
}

test('fresh parsed scenes and long mixed histories reconstruct all five semantic segments identically', async ({ browser }) => {
  test.setTimeout(180000)
  const pairs: unknown[] = []
  for (const segment of ['about-reading','about-life','life-reading','life-frame','frame-reading']) {
    const samples: Commit[] = []
    for (const history of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
      try {
        const page = await context.newPage(); await boot(page)
        if (history) {
          await seek(page,'about-life',.72); await seek(page,'life-frame',.94)
          await page.getByRole('button', { name: 'Scroll to WORK', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
          await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot', /work-reading|stack-work/)
          for (const [track,p] of [['life-frame',.1],['about-life',.97],['life-frame',.62],['about-life',.24]] as const) await seek(page,track,p)
        }
        if (segment.endsWith('reading')) await seekReading(page,segment.split('-')[0],.4)
        else await seek(page,segment,.5)
        const value = (await records(page)).at(-1)!; checkActionOracle(value); samples.push(value)
      } finally { await context.close() }
    }
    const [a,b] = samples
    expect(a.position).toEqual(b.position)
    expect(a.world).toEqual({ ...b.world, animation: { ...b.world.animation, generation: (a.world.animation as unknown as {generation: number}).generation } })
    for (const key of ['position','quaternion','view','projection'] as const) a.camera[key].forEach((v,i) => expect(Math.abs(v-b.camera[key][i])).toBeLessThanOrEqual(key === 'position' ? 1e-5 : 1e-6))
    pairs.push({ segment, fresh:a, history:b })
  }
  writeFileSync('../../output/pm/NR-02B/fresh-history.json',JSON.stringify(pairs,null,2))
})

test('reading requests, same-chapter replacement and return preserve readable About content', async ({ page }) => {
  await boot(page)
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('about-reading')
  await expect(page.locator('#about')).not.toHaveAttribute('inert', '')
  const content = await page.locator('#about').innerText()
  expect(content.length).toBeGreaterThan(500)
  const top = await page.evaluate(() => scrollY)
  await page.evaluate(() => window.scrollBy(0, 180))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(top + 100)
  const bookmark = await page.evaluate(() => scrollY)
  await page.getByRole('button', { name: 'RETURN TO OBJECT ↖' }).click()
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot', 'entry')
  await expect.poll(() => page.locator('canvas[data-archive-shared]').getAttribute('data-archive-progress').then(Number)).toBeCloseTo(.48, 2)
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  await expect.poll(() => page.evaluate(saved => Math.abs(scrollY - saved), bookmark)).toBeLessThan(2)
  await page.getByRole('button', { name: 'Scroll to FRAME', exact: true }).click()
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('frame-reading')
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click()
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.getAttribute('aria-label') === 'Scroll to FRAME')
    target?.click()
  })
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('frame-reading')
  await expect(page.locator('.archive-route-layer')).toHaveCount(0)
})

test('resize and genuine WebGL loss restore the latest semantic position', async ({ page }) => {
  await boot(page)
  await seek(page, 'life-frame', .72)
  const before = (await records(page)).at(-1)!
  await page.setViewportSize({ width: 1376, height: 850 })
  await expect.poll(async () => (await records(page)).at(-1)?.permit.layoutVersion ?? 0).toBeGreaterThan(before.permit.layoutVersion)
  const resized = (await records(page)).at(-1)!
  expect(Math.abs(resized.position.progress - before.position.progress)).toBeLessThan(.002)
  await page.locator('canvas[data-archive-shared]').evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2')
    const extension = gl?.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('Real WebGL loss extension unavailable')
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 100)
  })
  await expect.poll(async () => (await records(page)).at(-1)?.permit?.resourceGeneration ?? 0, { timeout: 20000 }).toBeGreaterThan(before.permit.resourceGeneration)
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state', 'ready')
  const restored = (await records(page)).at(-1)!
  expect(restored.position.segment).toBe('life-frame')
  expect(Math.abs(restored.position.progress - resized.position.progress)).toBeLessThan(.002)
  expect(restored.world.animation.actions).toEqual(resized.world.animation.actions)
  await checkProjection(page, 'life-frame', restored)
})

test('sample renderer failure cannot be re-shown by activation or rest cleanup', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>
      const original = proto[method]
      proto[method] = function(this: WebGL2RenderingContext, ...args: unknown[]) {
        if ((this.canvas as HTMLCanvasElement).dataset.archiveShared && document.documentElement.dataset.rendererFault === 'armed') {
          document.documentElement.dataset.rendererFault = 'consumed'
          throw new Error('NR02B actual renderer fault')
        }
        return original.apply(this, args)
      }
    }
  })
  await boot(page)
  await seek(page, 'about-life', .62)
  const before = await page.evaluate(() => {
    const latest = (window as unknown as { __portfolioArchiveExecution: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution.getSnapshot().at(-1)!.frameId
    document.documentElement.dataset.rendererFault = 'armed'; window.scrollBy(0, 4)
    return latest
  })
  await expect(page.locator('html')).toHaveAttribute('data-renderer-fault', 'consumed')
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state', 'failed')
  await assertFallback(page)
  expect((await records(page)).filter(r => r.kind === 'sample-committed').at(-1)!.frameId).toBe(before)
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()
  await assertFallback(page)
  await expect(page.locator('#about')).not.toHaveAttribute('inert', '')
})

async function assertFallback(page: Page) {
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('html')).not.toHaveAttribute('data-archive-visible', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-archive-sample-fallback', 'true')
  for (const id of ['about', 'life', 'frame', 'skills', 'projects', 'contact']) await expect(page.locator(`#${id}`)).not.toHaveAttribute('inert', '')
  for (const bridge of ['about-life', 'life-frame', 'frame-stack', 'stack-work', 'work-contact']) {
    await expect(page.locator(`[data-archive-track="${bridge}"] .archive-bridge__room-hit`)).toBeDisabled()
  }
  expect((await page.locator('#about').innerText()).length).toBeGreaterThan(500)
}

test('illegal page projection fails before render and restores the complete readable fallback', async ({ page }) => {
  await boot(page)
  await seek(page, 'life-frame', .56)
  await page.locator('[data-archive-track="life-frame"] .archive-chapter-bridge__page').evaluate(node => Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => 0 }))
  await page.locator('[data-archive-track="life-frame"]').evaluate(node => {
    const r = node.getBoundingClientRect(); window.scrollTo(0, scrollY+r.top-innerHeight+r.height*.72)
  })
  await expect.poll(async () => (await records(page)).some(r => r.kind === 'execution-error')).toBe(true)
  await assertFallback(page)
  await expect(page.locator('[data-archive-track="life-frame"]')).toHaveAttribute('data-scene-ready', 'false')
})

test('transient page-size failure recovers after a valid layout refresh and current request', async ({ page }) => {
  await boot(page)
  await seek(page, 'life-frame', .56)
  const target = page.locator('[data-archive-track="life-frame"] .archive-chapter-bridge__page')
  await target.evaluate(node => Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => 0 }))
  await page.locator('[data-archive-track="life-frame"]').evaluate(node => {
    const rect = node.getBoundingClientRect()
    window.scrollTo(0, scrollY + rect.top - innerHeight + rect.height * .72)
  })
  await expect.poll(async () => (await records(page)).some(record => record.kind === 'execution-error' && record.reason === 'Page size changed without a valid layout refresh')).toBe(true)
  await assertFallback(page)
  const failedAttempts = (await records(page)).filter(record => record.kind === 'execution-error').length
  await page.waitForTimeout(400)
  expect((await records(page)).filter(record => record.kind === 'execution-error')).toHaveLength(failedAttempts)
  const failedFrame = (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!.frameId

  await target.evaluate(node => Reflect.deleteProperty(node, 'clientWidth'))
  await page.setViewportSize({ width: 1438, height: 899 })
  await page.evaluate(() => window.dispatchEvent(new Event('load')))
  await page.locator('[data-archive-track="life-frame"]').evaluate(node => {
    const rect = node.getBoundingClientRect()
    window.scrollTo(0, scrollY + rect.top - innerHeight + rect.height * .72)
  })
  await expect.poll(async () => (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)?.position?.segment).toBe('life-frame')
  const recoveredBridge = (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!
  expect(recoveredBridge.frameId).toBeGreaterThan(failedFrame)
  await checkProjection(page, 'life-frame', recoveredBridge)
  await expect(page.locator('[data-archive-track="life-frame"]')).toHaveAttribute('data-scene-ready', 'true')
  await expect(page.locator('[data-archive-track="life-frame"] .archive-bridge__room-hit')).toBeEnabled()

  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).click()

  await expect.poll(async () => (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)?.position?.segment).toBe('about-reading')
  const recovered = (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!
  expect(recovered.frameId).toBeGreaterThan(recoveredBridge.frameId)
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCSS('visibility', 'visible')
  await expect(page.locator('html')).not.toHaveAttribute('data-archive-sample-fallback', 'true')
  await expect(page.locator('#about')).not.toHaveAttribute('inert', '')
  await expect(page.locator('[data-archive-track="life-frame"]')).toHaveAttribute('data-failed', 'false')
  await page.locator('[data-archive-track="about-life"] .archive-bridge__footer a').evaluate(node => (node as HTMLAnchorElement).click())
  await expect.poll(async () => (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)?.position?.segment).toBe('life-reading')
  await expect(page.locator('#life')).not.toHaveAttribute('inert', '')
})

test('transient failure cache does not cross a WebGL resource generation', async ({ page }) => {
  await boot(page)
  await seek(page, 'life-frame', .56)
  const target = page.locator('[data-archive-track="life-frame"] .archive-chapter-bridge__page')
  await target.evaluate(node => Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => 0 }))
  await page.locator('[data-archive-track="life-frame"]').evaluate(node => {
    const rect = node.getBoundingClientRect()
    window.scrollTo(0, scrollY + rect.top - innerHeight + rect.height * .72)
  })
  await expect.poll(async () => (await records(page)).some(record => record.kind === 'execution-error' && record.reason === 'Page size changed without a valid layout refresh')).toBe(true)
  await assertFallback(page)
  const before = (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!
  await target.evaluate(node => Reflect.deleteProperty(node, 'clientWidth'))
  await page.locator('canvas[data-archive-shared]').evaluate(canvas => {
    const extension = (canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('Real WebGL loss extension unavailable')
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 100)
  })
  await expect.poll(async () => (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)?.permit?.resourceGeneration ?? 0, { timeout: 20000 }).toBeGreaterThan(before.permit.resourceGeneration)
  const recovered = (await records(page)).filter(record => record.kind === 'sample-committed').at(-1)!
  expect(recovered.position.segment).toBe('life-frame')
  await checkProjection(page, 'life-frame', recovered)
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCSS('visibility', 'visible')
  await expect(page.locator('html')).not.toHaveAttribute('data-archive-sample-fallback', 'true')
  await expect(page.locator('[data-archive-track="life-frame"]')).toHaveAttribute('data-scene-ready', 'true')
})

for (const fault of ['clip', 'node', 'parent', 'work-surface'] as const) test(`real GLB in-memory ${fault} fault refuses false spatial readiness and preserves readable chapters`, async ({ page }) => {
  const original = readFileSync('src/assets/personal-archive/personal-space.glb')
  const jsonSize = original.readUInt32LE(12)
  const json = JSON.parse(original.subarray(20, 20+jsonSize).toString()) as { animations: Array<{ name: string }>; nodes: Array<{ name: string; children?: number[] }> }
  if (fault === 'clip') json.animations = json.animations.filter(a => a.name !== 'LifePhotoExtract')
  if (fault === 'node') json.nodes.find(n => n.name === 'PhotoMount_04')!.name = 'FaultMissingPhotoMount'
  if (fault === 'work-surface') json.nodes.find(n => n.name === 'WorkReading_TL')!.name = 'FaultMissingWorkReadingTL'
  if (fault === 'parent') {
    const index = json.nodes.findIndex(n => n.name === 'Life_PhotoPaper')
    for (const node of json.nodes) if (node.children) node.children = node.children.filter(n => n !== index)
    const parent = json.nodes.find(n => n.name === 'FramePrintPivot')!
    parent.children = [...(parent.children ?? []), index]
  }
  const encoded = Buffer.from(JSON.stringify(json))
  const padded = Buffer.alloc(Math.ceil(encoded.length/4)*4, 32); encoded.copy(padded)
  const header = Buffer.from(original.subarray(0,20)); header.writeUInt32LE(padded.length,12)
  const bytes = Buffer.concat([header, padded, original.subarray(20+jsonSize)]); bytes.writeUInt32LE(bytes.length,8)
  await page.route('**/personal-space*.glb', route => route.fulfill({ body: bytes, contentType: 'model/gltf-binary' }))
  await boot(page)
  await expect(page.locator('.archive-stage')).toHaveAttribute('data-failed', 'true')
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCount(0)
  expect(await records(page)).toEqual([])
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
  await expect(page.locator('#about')).toBeVisible()
  await expect(page.locator('#about')).not.toHaveAttribute('inert', '')
  await page.setViewportSize({ width: 1370, height: 800 })
  await page.evaluate(() => window.dispatchEvent(new Event('load')))
  await page.getByRole('button', { name: 'Scroll to FRAME', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
  await expect(page.locator('#frame')).toBeVisible()
  await expect(page.locator('#frame')).not.toHaveAttribute('inert', '')
  await page.getByRole('button', { name: 'Scroll to WORK', exact: true }).evaluate(node => (node as HTMLButtonElement).click())
  await expect(page.locator('#projects')).toBeVisible()
  await expect(page.locator('#projects')).not.toHaveAttribute('inert', '')
  const fallback = await page.evaluate(() => ({
    introPresent: Boolean(document.querySelector('.intro')),
    archiveFailed: document.querySelector('.archive-stage')?.getAttribute('data-failed'),
    sharedCanvasCount: document.querySelectorAll('canvas[data-archive-shared]').length,
    readableChapters: ['about', 'life', 'frame', 'skills', 'projects', 'contact'].filter(id => !document.getElementById(id)?.inert),
    diagnosticPresent: '__portfolioArchiveExecution' in window,
    hash: location.hash,
  }))
  const directory = path.resolve('../../output/pm/NR-05')
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, `fallback-${fault}.json`), JSON.stringify(fallback, null, 2))
})

test('conflicting and throwing diagnostic slots do not change successful sample drawing', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, '__portfolioArchiveExecution', { configurable: false, get() { throw new Error('occupied diagnostic slot') } }))
  await boot(page)
  await page.getByRole('button', { name: 'Scroll to FRAME', exact: true }).click()
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot', 'frame-reading')
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCSS('visibility', 'visible')
  await expect(page.locator('#frame')).not.toHaveAttribute('inert', '')
})

test('Life and Frame bookmarks, second requests and user cancellation retain the latest destination', async ({ page }) => {
  await boot(page)
  for (const [id, bridge] of [['life','about-life'],['frame','life-frame']]) {
    await page.locator(`[data-archive-track="${bridge}"] .archive-bridge__footer a`).evaluate(node => (node as HTMLAnchorElement).click())
    await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe(`${id}-reading`)
    await page.evaluate(() => window.scrollBy(0,160))
    const bookmark = await page.evaluate(() => scrollY)
    await page.getByRole('button', { name: 'RETURN TO OBJECT ↖' }).click()
    await expect.poll(async () => Math.abs(((await records(page)).at(-1)?.position?.progress ?? 0)-.56)).toBeLessThan(.002)
    await page.locator(`[data-archive-track="${bridge}"] .archive-bridge__footer a`).evaluate(node => (node as HTMLAnchorElement).click())
    await expect.poll(() => page.evaluate(saved => Math.abs(scrollY-saved),bookmark)).toBeLessThan(2)
  }
  await page.getByRole('button', { name: 'Scroll to ABOUT', exact: true }).evaluate(node => {
    (node as HTMLButtonElement).click()
    window.dispatchEvent(new WheelEvent('wheel',{deltaY:200}))
    const target = document.querySelector<HTMLButtonElement>('button[aria-label="Scroll to FRAME"]')!
    target.click(); target.click()
  })
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('frame-reading')
  await expect(page.locator('.archive-route-layer')).toHaveCount(0)
  await expect(page.locator('#frame')).not.toHaveAttribute('inert','')
})

test('Frame subanchor deep link and Index inspection cancellation cannot replay an obsolete scroll', async ({ page }) => {
  await boot(page,'/#frame-cuisine')
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('frame-reading')
  await expect.poll(() => page.locator('#frame-cuisine').evaluate(node => Math.abs(node.getBoundingClientRect().top-40))).toBeLessThan(8)
  await page.evaluate(() => window.scrollTo(0,0))
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot', /index|rest:home/)
  const indexPage = page.locator('.hero__screen-page')
  await expect(indexPage).toHaveCount(1)
  await indexPage.evaluate(node => node.dispatchEvent(new MouseEvent('click',{bubbles:true})))
  await expect.poll(() => page.locator('canvas[data-archive-shared]').getAttribute('data-archive-progress').then(Number)).toBeGreaterThan(.08)
  await page.evaluate(() => {
    window.dispatchEvent(new WheelEvent('wheel',{deltaY:450,cancelable:true}))
    document.querySelector<HTMLButtonElement>('button[aria-label="Scroll to ABOUT"]')!.click()
  })
  await expect.poll(async () => (await records(page)).at(-1)?.position?.segment).toBe('about-reading')
  const top = await page.evaluate(() => scrollY)
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve,1300)))
  expect(Math.abs(await page.evaluate(() => scrollY)-top)).toBeLessThan(2)
})

test('GPU recovery takes the request issued during recovery, not its former bridge', async ({ page }) => {
  await boot(page); await seek(page,'about-life',.62)
  const before = (await records(page)).at(-1)!
  await page.locator('canvas[data-archive-shared]').evaluate(canvas => {
    const ext = (canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    ext.loseContext(); setTimeout(() => ext.restoreContext(),600)
  })
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-state','recovering')
  await page.getByRole('button',{name:'Scroll to FRAME',exact:true}).evaluate(node => (node as HTMLButtonElement).click())
  await expect.poll(async () => (await records(page)).at(-1)?.permit?.resourceGeneration ?? 0,{timeout:20000}).toBeGreaterThan(before.permit.resourceGeneration)
  const after = (await records(page)).at(-1)!
  expect(after.position.segment).toBe('frame-reading')
  expect(after.permit.requestId).toBeGreaterThan(before.permit.requestId)
  checkActionOracle(after)
  await expect(page.locator('#frame')).not.toHaveAttribute('inert','')
})

test('diagnostic serialization failure cannot suppress real sample ready or expose a mutable writer', async ({ page }) => {
  await boot(page); await seek(page,'about-life',.72)
  expect(await page.evaluate(() => {
    const api = (window as unknown as { __portfolioArchiveExecution: { getSnapshot(): Commit[] } }).__portfolioArchiveExecution
    return Object.isFrozen(api) && Object.isFrozen(api.getSnapshot()) && Object.isFrozen(api.getSnapshot().at(-1)!.world.animation.actions)
  })).toBe(true)
  await page.evaluate(() => {
    const original = JSON.stringify
    JSON.stringify = function(value, ...args) {
      if ((value as {kind?:string})?.kind === 'sample-committed') throw new Error('Diagnostic copy fault')
      return Reflect.apply(original,JSON,[value,...args]) as string
    } as typeof JSON.stringify
  })
  await page.getByRole('button',{name:'Scroll to FRAME',exact:true}).click()
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot','frame-reading')
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCSS('visibility','visible')
  await expect(page.locator('#frame')).not.toHaveAttribute('inert','')
})

test('default sample mode is functional without creating a diagnostic slot', async ({ page }) => {
  await boot(page,'/',false)
  await page.getByRole('button',{name:'Scroll to ABOUT',exact:true}).click()
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot','about-reading')
  expect(await page.evaluate(() => '__portfolioArchiveExecution' in window)).toBe(false)
  await expect(page.locator('#about')).not.toHaveAttribute('inert','')
})

test('load-triggered content growth preserves T and visibility suspension resumes the same world', async ({ page }) => {
  await boot(page); await seek(page,'life-frame',.72)
  const before = (await records(page)).at(-1)!
  await page.evaluate(() => {
    document.getElementById('about')!.style.paddingBottom = '240px'
    window.dispatchEvent(new Event('load'))
  })
  await expect.poll(async () => (await records(page)).at(-1)?.permit?.layoutVersion ?? 0).toBeGreaterThan(before.permit.layoutVersion)
  const grown = (await records(page)).at(-1)!
  expect(grown.position.segment).toBe(before.position.segment)
  expect(Math.abs(grown.position.progress-before.position.progress)).toBeLessThan(.001)
  const hiddenFrame = await page.evaluate(() => {
    Object.defineProperty(document,'hidden',{configurable:true,value:true})
    document.dispatchEvent(new Event('visibilitychange'))
    return (window as unknown as {__portfolioArchiveExecution:{getSnapshot():Commit[]}}).__portfolioArchiveExecution.getSnapshot().at(-1)!.frameId
  })
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve,350)))
  expect((await records(page)).at(-1)!.frameId).toBe(hiddenFrame)
  await page.evaluate(() => { Reflect.deleteProperty(document,'hidden'); document.dispatchEvent(new Event('visibilitychange')) })
  await expect.poll(async () => (await records(page)).at(-1)!.frameId).toBeGreaterThan(hiddenFrame)
  expect((await records(page)).at(-1)!.world.animation.actions).toEqual(grown.world.animation.actions)
})

for (const mode of ['reduced','narrow'] as const) test(`${mode} preserves the original readable DOM mode without mobile 3D`, async ({ page }) => {
  if (mode === 'reduced') await page.emulateMedia({reducedMotion:'reduce'})
  else await page.setViewportSize({width:390,height:844})
  await boot(page,'/#about')
  await expect(page.locator('canvas[data-archive-shared]')).toHaveCount(0)
  await expect(page.locator('#about')).not.toHaveAttribute('inert','')
  expect((await page.locator('#about').innerText()).length).toBeGreaterThan(500)
  await page.screenshot({path:`../../output/pm/NR-02B/${mode}.png`})
})

test('entry dossier mapping, full About and legacy Final Horizon Work Contact remain available', async ({ page }) => {
  test.setTimeout(60000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await boot(page)
  const directory = '../../output/pm/NR-02B'
  await expect(page.locator('.hero__screen-page')).toHaveAttribute('tabindex','0')
  await page.screenshot({path:`${directory}/index.png`})
  await page.locator('#archive-entry').evaluate(node => {
    const r = node.getBoundingClientRect(); window.scrollTo(0,scrollY+r.top-innerHeight+r.height*.96)
  })
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot','entry')
  await expect(page.locator('#archive-entry')).toHaveAttribute('data-scene-ready','true')
  const text = (value: string | null) => value?.replace(/\s+/g,'').trim()
  expect(text(await page.locator('#archive-entry .about__dossier').textContent())).toBe(text(await page.locator('#about .about__dossier').textContent()))
  await page.screenshot({path:`${directory}/entry-book.png`})
  await page.getByRole('button',{name:'Scroll to ABOUT',exact:true}).click()
  await expect(page.locator('#about .about__dossier')).toBeVisible()
  await page.screenshot({path:`${directory}/about-opening.png`})
  for (const block of ['vision','tech','manifesto','philosophy']) {
    const section = page.locator(`#about .about__block--${block}`)
    await section.scrollIntoViewIfNeeded(); await expect(section).toBeVisible()
    expect((await section.innerText()).length).toBeGreaterThan(15)
  }
  await page.screenshot({path:`${directory}/about-content.png`})
  await page.locator('[data-archive-track="frame-stack"]').evaluate(node => {
    const r = node.getBoundingClientRect(); window.scrollTo(0,scrollY+r.top-innerHeight+r.height*.44)
  })
  await expect(page.locator('canvas[data-archive-shared]')).toHaveAttribute('data-archive-shot','frame-stack')
  await expect(page.locator('[data-archive-track="frame-stack"]')).toHaveAttribute('data-scene-ready','true')
  expect(await page.locator('[data-archive-track="frame-stack"] img').count()).toBeGreaterThan(0)
  await page.screenshot({path:`${directory}/frame-stack.png`})
  for (const [label, id] of [['WORK','projects'],['CONTACT','contact']]) {
    await page.getByRole('button',{name:`Scroll to ${label}`,exact:true}).click()
    await expect(page.locator(`#${id}`)).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-archive-routing','true')
    await page.screenshot({path:`${directory}/${id}.png`})
  }
  expect(errors).toEqual([])
})
