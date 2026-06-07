/**
 * Plan 05 — Degradation-path gates.
 *
 * Deterministic (no scroll dependency): they assert the site stays usable when
 * the cinematic layers can't run — reduced motion, no WebGL, a missing asset.
 * Because they only exercise load-time behaviour (the stable part of CI), they
 * are CI-BLOCKING (run via `npm run test:e2e:gates`), unlike the scroll-driven
 * suite which is advisory.
 */
import { expect, test, type Page } from '@playwright/test'

async function waitForLive(page: Page, timeout = 20000) {
  // Loader mounts .intro and unmounts it when the intro hands off.
  await page.waitForFunction(
    () => {
      const intro = document.querySelector('.intro')
      return !intro || !document.body.contains(intro) || getComputedStyle(intro).opacity === '0'
    },
    { timeout },
  )
}

// ── 1. Reduced motion ──────────────────────────────────────────────────────────

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('site loads with the hero particle layer skipped and real text intact', async ({ page }) => {
    const fatal: string[] = []
    page.on('pageerror', (e) => {
      if (!/WebGL context|THREE\.Clock/i.test(e.message)) fatal.push(e.message)
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForLive(page)

    await expect(page.locator('#hero')).toBeVisible()
    // The static ghost photo carries the composition when motion is reduced.
    await expect(page.locator('.hero__ghost')).toBeVisible()
    // The real hero name text remains present (not a particle-only render).
    await expect(page.locator('.hero__name')).toContainText('Tim')
    expect(fatal, `uncaught errors under reduced motion:\n${fatal.join('\n')}`).toHaveLength(0)
  })
})

// ── 2. WebGL unavailable ────────────────────────────────────────────────────────

test('WebGL unavailable: app still loads, fallbacks hold, no uncaught crash', async ({ page }) => {
  // Force every WebGL context request to fail; 2D (text rasterisation) still works.
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype
    // eslint-disable-next-line @typescript-eslint/unbound-method -- re-bound via .call below
    const original = proto.getContext as (id: string, options?: unknown) => RenderingContext | null
    proto.getContext = function patched(this: HTMLCanvasElement, type: string, options?: unknown) {
      if (typeof type === 'string' && type.toLowerCase().includes('webgl')) return null
      return original.call(this, type, options)
    } as typeof proto.getContext
  })

  const fatal: string[] = []
  page.on('pageerror', (e) => {
    // WebGL/Three errors are expected and caught by CanvasErrorBoundary.
    if (!/webgl|three|context|getContext/i.test(e.message)) fatal.push(e.message)
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForLive(page)

  await expect(page.locator('#hero')).toBeVisible()
  await expect(page.locator('.hero__name')).toContainText('Tim')
  expect(fatal, `uncaught non-WebGL errors:\n${fatal.join('\n')}`).toHaveLength(0)
})

// ── 3. Missing asset (A1: whole-site preload failure is non-fatal) ───────────────

test('a 404 frame image does not strand the loader (A1)', async ({ page }) => {
  // Abort one image family; the whole-site preload must skip it, not block forever.
  await page.route('**/frame/**/*.webp', (route) => {
    if (route.request().url().includes('scenery-01')) return route.abort()
    return route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // The decisive assertion: the loader still hands off despite the failed asset.
  await waitForLive(page)
  await expect(page.locator('#hero')).toBeVisible()
})
