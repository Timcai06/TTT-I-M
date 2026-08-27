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

test('reduced motion: site loads with the static fallback and real text intact', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

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

// ── 3. Missing asset (A1: render-ready failure is non-fatal) ──────────────────

test('a 404 frame image does not strand the loader (A1)', async ({ page }) => {
  // Abort one selected responsive image; render-ready must skip it, not block forever.
  await page.route('**/frame/**/*.webp', (route) => {
    if (route.request().url().includes('scenery-01')) return route.abort()
    return route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // The decisive assertion: the loader still hands off despite the failed asset.
  await waitForLive(page)
  await expect(page.locator('#hero')).toBeVisible()
})

test('loader hands off after render-ready tasks without downloading every frame variant', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForLive(page)

  const state = await page.evaluate(() => {
    const preloadDebug = (window as unknown as {
      __portfolioPreloadDebug?: {
        snapshot: () => {
          failed: Array<{ id: string }>
          pending: Array<{ id: string }>
        }
      }
    }).__portfolioPreloadDebug
    const preload = preloadDebug?.snapshot()

    const frameRequests = performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name).pathname)
      .filter((pathname) => pathname.startsWith('/frame/') && pathname.endsWith('.webp'))

    const candidatesByPhoto = new Map<string, Set<string>>()
    frameRequests.forEach((pathname) => {
      const logical = pathname.replace(/-(?:720|1080)(?=\.webp$)/, '')
      const candidates = candidatesByPhoto.get(logical) ?? new Set<string>()
      candidates.add(pathname)
      candidatesByPhoto.set(logical, candidates)
    })

    return {
      failedTasks: preload?.failed.map((task) => task.id) ?? ['missing debug snapshot'],
      pendingTasks: preload?.pending.map((task) => task.id) ?? ['missing debug snapshot'],
      overfetchedCandidates: Array.from(candidatesByPhoto.entries())
        // A handful of archive photographs are deliberately reused as 720px
        // Life tiles, so two URLs can be valid. Three means the preload layer
        // expanded the complete 720/1080/original srcset again.
        .filter(([, candidates]) => candidates.size > 2)
        .map(([logical, candidates]) => ({ logical, candidates: Array.from(candidates) })),
    }
  })

  expect(state.pendingTasks, `preload tasks still pending at hand-off: ${state.pendingTasks.join(', ')}`).toEqual([])
  expect(state.failedTasks, `preload tasks skipped unexpectedly: ${state.failedTasks.join(', ')}`).toEqual([])
  expect(
    state.overfetchedCandidates,
    `all srcset variants downloaded for one photograph: ${JSON.stringify(state.overfetchedCandidates)}`,
  ).toEqual([])
})
