import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
 const page = await b.newPage()
 await page.goto('http://127.0.0.1:5173/lab?scene=personal-space', { waitUntil: 'domcontentloaded' })
 const collisions = await page.evaluate(async () => (await import('/src/lab/personal-space/archiveClearance.ts')).inspectCameraClearance())
 assert.deepEqual(collisions, [], 'A camera path approaches furniture within 10 cm')
 console.log('CAMERA_CLEARANCE: six paths, 101 positions each, nine viewport rays; no near-furniture obstruction')
} finally { await b.close() }
