/**
 * Plan 05 — Runtime performance gates.
 *
 * These tests run against the real dev/preview server (same as frame.spec.ts)
 * and assert budgets that build-time guards cannot catch. They are the
 * "build green ≠ prod healthy" safety net.
 *
 * Budgets are calibrated from local M-series baseline + 20% headroom.
 * Tighten them incrementally rather than all at once.
 */
import { expect, test, type Page } from '@playwright/test'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function openHome(page: Page) {
  page.on('pageerror', (error) => {
    if (/WebGL context|THREE\.Clock/i.test(error.message)) return
    throw error
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // Wait for the intro loader to clear (preload + exit animation, up to 8s).
  // The loader mounts .intro and removes it when done; presence of #hero content
  // at opacity 1 means we're live.
  await page.waitForFunction(
    () => {
      const intro = document.querySelector('.intro')
      return !intro || getComputedStyle(intro).opacity === '0' || !document.body.contains(intro)
    },
    { timeout: 12_000 },
  )
  await page.waitForTimeout(400)
}

// ── LCP ──────────────────────────────────────────────────────────────────────

test('LCP is within budget', async ({ page }) => {
  // Inject observer before navigation so it catches the very first paint.
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__lcpMs = null
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) (window as unknown as Record<string, unknown>).__lcpMs = last.startTime
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  })

  await openHome(page)

  const lcpMs = await page.evaluate(() =>
    (window as unknown as Record<string, number | null>).__lcpMs,
  )

  // NOTE: LCP here is *whole-site-preload-bound by design* — the loader gates the
  // hero paint until every curated image is preloaded (the deliberate no-pop-in
  // tradeoff, see plan/00-principles.md). Local warm baseline ≈ 3.3s, so this gate
  // catches regressions (budget = baseline + ~25% headroom) rather than chasing a
  // 2.5s number the preload model can't hit. If LCP ever becomes a priority, the
  // critical/deferred split in lib/resources can let the hero paint before the
  // full preload finishes — that's the lever, and this budget would then tighten.
  expect(lcpMs, `LCP ${lcpMs?.toFixed(0)}ms exceeds 4200ms budget`).toBeLessThan(4200)
})

// ── Long Tasks ────────────────────────────────────────────────────────────────

test('no long tasks (>200ms) block the main thread during load', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__longTasks = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as Record<string, {name: string; duration: number}[]>).__longTasks.push({
          name: entry.name,
          duration: Math.round(entry.duration),
        })
      }
    })
    observer.observe({ type: 'longtask', buffered: true })
  })

  await openHome(page)

  const longTasks = await page.evaluate(() =>
    (window as unknown as Record<string, {name: string; duration: number}[]>).__longTasks ?? [],
  )

  const violations = longTasks.filter((t) => t.duration > 200)
  expect(
    violations,
    `Long tasks over 200ms: ${JSON.stringify(violations)}`,
  ).toHaveLength(0)
})

// ── CLS ───────────────────────────────────────────────────────────────────────

test('CLS is below 0.05 after loader exits', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__clsScore = 0
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as unknown as { hadRecentInput: boolean; value: number }
        if (!shift.hadRecentInput) {
          (window as unknown as Record<string, number>).__clsScore += shift.value
        }
      }
    })
    observer.observe({ type: 'layout-shift', buffered: true })
  })

  await openHome(page)

  const cls = await page.evaluate(() =>
    (window as unknown as Record<string, number>).__clsScore,
  )

  expect(cls, `CLS ${cls?.toFixed(4)} exceeds 0.05`).toBeLessThan(0.05)
})

// ── JS Heap ───────────────────────────────────────────────────────────────────

test('JS heap stays under 80 MB after full load', async ({ page }) => {
  await openHome(page)
  await page.waitForLoadState('networkidle')

  const heapMB = await page.evaluate(() => {
    const perf = performance as unknown as {
      memory?: { usedJSHeapSize: number }
    }
    if (!perf.memory) return 0
    return perf.memory.usedJSHeapSize / 1024 / 1024
  })

  if (heapMB === 0) {
    // `performance.memory` is Chromium-only; skip gracefully in other browsers.
    test.skip()
    return
  }

  expect(heapMB, `JS heap ${heapMB.toFixed(1)} MB exceeds 80 MB`).toBeLessThan(80)
})

// ── Scroll: no layout thrash on scrub ─────────────────────────────────────────

test('hero scroll scrub produces no long tasks', async ({ page }) => {
  await openHome(page)

  // Arm a fresh long-task observer *after* the intro (load tasks already counted above).
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__scrollLongTasks = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as Record<string, {duration: number}[]>).__scrollLongTasks.push({
          duration: Math.round(entry.duration),
        })
      }
    })
    observer.observe({ type: 'longtask' })
  })

  // Simulate a fast scroll through the hero section.
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(200)
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(200)
  await page.mouse.wheel(0, -1600)
  await page.waitForTimeout(300)

  const scrollLongTasks = await page.evaluate(() =>
    (window as unknown as Record<string, {duration: number}[]>).__scrollLongTasks ?? [],
  )

  const violations = scrollLongTasks.filter((t) => t.duration > 100)
  expect(
    violations,
    `Long tasks during scroll: ${JSON.stringify(violations)}`,
  ).toHaveLength(0)
})

// ── Stage machine: no stale intro after load ───────────────────────────────────

test('stage is live after the intro exits', async ({ page }) => {
  await openHome(page)

  const stage = await page.evaluate(() =>
    // @ts-expect-error – accessing exposed module singleton for verification
    window.__stage ?? 'not-exposed',
  )

  // If the module doesn't expose __stage, verify via DOM: intro must be gone.
  if (stage === 'not-exposed') {
    await expect(page.locator('.intro')).not.toBeAttached()
    return
  }

  expect(stage).toMatch(/^(live|transitioning)$/)
})

// ── Chapter jump: no residual overlay ─────────────────────────────────────────

test('chapter transition overlay never blocks interaction once settled', async ({ page }) => {
  await openHome(page)

  const aboutLink = page.locator('.nav__link', { hasText: 'About' })
  if (await aboutLink.isVisible()) {
    await aboutLink.click()
  }

  // Poll until the transition has settled. "Non-blocking" is governed by the
  // overlay being hidden (autoAlpha → visibility:hidden / opacity:0), not by
  // pointer-events alone — the resting CSS pointer-events is `auto`. The full
  // transition timeline runs ~4s, so allow generous time.
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('.chapter-transition')
      if (!overlay) return true
      const style = getComputedStyle(overlay)
      const hidden = style.visibility === 'hidden' || Number(style.opacity) === 0
      const notActive = !overlay.classList.contains('is-active')
      return hidden && notActive
    },
    { timeout: 8000 },
  )

  // Sanity: a point at viewport center hits real page content, not the overlay.
  const topElementIsOverlay = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    return el?.closest('.chapter-transition') !== null
  })
  expect(topElementIsOverlay, 'overlay is intercepting clicks at viewport center').toBe(false)
})
