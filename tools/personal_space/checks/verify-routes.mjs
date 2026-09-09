import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const url = process.env.ARCHIVE_BASE_URL ?? 'http://127.0.0.1:5173/'
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})

const errors = []
try {
  for (const viewport of [{ width: 1200, height: 760 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /personal-archive|THREE|GLSL|shader/i.test(message.text())) errors.push(message.text())
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
    const nav = label => page.locator('.nav').getByRole('button', { name: new RegExp(label, 'i') })
    const routeState = () => page.evaluate(async () => {
      const { getStage } = await import('/src/lib/stage.ts')
      const root = document.documentElement
      const matrices = ['--archive-route-source-matrix', '--archive-route-target-matrix']
        .map(name => getComputedStyle(root).getPropertyValue(name).trim())
      return {
        hash: location.hash,
        routing: root.dataset.archiveRouting === 'true',
        layers: document.querySelectorAll('.archive-route-layer').length,
        matrices,
        shot: document.querySelector('canvas[data-archive-shot]')?.dataset.archiveShot ?? '',
        stage: getStage(),
        y: Math.round(scrollY),
      }
    })
    const finiteMatrix = value => /^matrix3d\([\d.,e+ -]+\)$/.test(value)
      && value.slice(9, -1).split(',').every(part => Number.isFinite(Number(part)))

    await nav('WORK').click()
    await page.waitForFunction(() => document.documentElement.dataset.archiveRouting === 'true')
    let state = await routeState()
    assert.ok(state.matrices.every(finiteMatrix), `route matrices must be finite: ${JSON.stringify(state)}`)
    await page.waitForTimeout(160)
    await nav('CONTACT').click()
    await page.waitForFunction(() => location.hash === '#contact' && !document.documentElement.dataset.archiveRouting, null, { timeout: 10000 })
    state = await routeState()
    assert.equal(state.layers, 0)
    assert.equal(state.stage, 'live')
    assert.equal(state.hash, '#contact')

    await nav('Index').click()
    await page.waitForFunction(() => document.documentElement.dataset.archiveRouting === 'true')
    await page.setViewportSize({ width: viewport.width, height: viewport.height + 40 })
    await page.mouse.wheel(0, 120)
    await page.waitForFunction(() => !document.documentElement.dataset.archiveRouting, null, { timeout: 5000 })
    state = await routeState()
    assert.equal(state.layers, 0)
    assert.equal(state.stage, 'live')
    assert.ok(state.matrices.every(value => value === ''), `route matrices must be cleaned: ${JSON.stringify(state)}`)

    await page.keyboard.press('Home')
    await page.waitForFunction(() => scrollY === 0 && document.querySelector('canvas[data-archive-shot]')?.dataset.archiveShot === 'index')
    const screen = page.getByRole('group', { name: /Interactive Index/ })
    // Playwright positions are local to the projected monitor quadrilateral,
    // not viewport coordinates. Its actionable centre is the same hit target
    // a pointer user receives on the in-room screen.
    await screen.click()
    await page.waitForTimeout(600)
    state = await routeState()
    assert.equal(state.y, 0)
    assert.equal(state.shot, 'index')
    assert.ok(Math.abs(Number(await page.locator('canvas[data-archive-shot]').getAttribute('data-archive-progress')) - .18) < .005)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(360)
    assert.ok(Number(await page.locator('canvas[data-archive-shot]').getAttribute('data-archive-progress')) < .005)

    await screen.press('Enter')
    await page.waitForTimeout(600)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(1000)
    state = await routeState()
    assert.ok(state.y > 0 && state.shot === 'entry', `scroll must resume after close-out: ${JSON.stringify(state)}`)
    await page.mouse.wheel(0, -240)
    await page.waitForTimeout(1600)
    state = await routeState()
    assert.ok(state.y === 0 && state.shot === 'index', `reverse scroll must return ownership to Index: ${JSON.stringify(state)}`)
    console.log('ROUTE_RESIZE_CANCEL_INDEX_OWNERSHIP', viewport)
    await page.close()
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
