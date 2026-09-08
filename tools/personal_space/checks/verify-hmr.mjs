// A separate local dev server exercises HMR without changing any source file.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = fileURLToPath(new URL('../../../apps/landing', import.meta.url))
const server = await createServer({ root, configFile: `${root}/vite.config.ts`, logLevel: 'error', server: { host: '127.0.0.1', port: 5181, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
 const errors = []; page.on('pageerror', error => errors.push(error.message))
 await page.goto('http://127.0.0.1:5181/', { waitUntil: 'domcontentloaded' })
 await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
 const navigated = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: 15000 })
 server.watcher.emit('change', `${root}/src/components/personal-archive/archiveRuntime.ts`)
 await navigated
 await page.waitForSelector('#archive-entry', { state: 'attached' })
 await page.waitForSelector('.intro', { state: 'detached', timeout: 120000 })
 await page.evaluate(async () => {
  const el = document.querySelector('#archive-entry'); const { getLenis } = await import('/src/lib/lenis.ts')
  getLenis().scrollTo(el.getBoundingClientRect().top + scrollY + .65 * (el.offsetHeight - innerHeight), { immediate: true, force: true })
 })
 await page.waitForSelector('#archive-entry canvas[data-archive-shared]')
 assert.equal(await page.locator('#archive-entry').getAttribute('data-failed'), 'false')
 assert.deepEqual(errors, [])
 console.log('RUNTIME_HMR_REENTERS_BOOT_AND_RESTORES_ROOM')
} finally { await browser.close(); await server.close() }
