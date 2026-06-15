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

// Hardware-sensitive budgets are env-tunable so CI runners (slower than local
// M-series) get headroom without making the gate meaningless. Local defaults are
// calibrated baselines + headroom; CI sets generous values in the workflow.
// Functional assertions (CLS, overlay-clears, stage-live) stay hardware-agnostic.
function budget(envKey: string, localDefault: number): number {
  const raw = process.env[envKey]
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : localDefault
}

const LCP_BUDGET_MS = budget('PERF_LCP_MS', 2800)
const HEAP_BUDGET_MB = budget('PERF_HEAP_MB', 80)
const LOAD_LONGTASK_MS = budget('PERF_LOAD_LONGTASK_MS', 200)
const SCROLL_LONGTASK_MS = budget('PERF_SCROLL_LONGTASK_MS', 100)
const INP_BUDGET_MS = budget('PERF_INP_MS', 200)
const FRAME_P95_BUDGET_MS = budget('PERF_FRAME_P95_MS', 34)
const FRAME_MIN_SAMPLES = budget('PERF_FRAME_MIN_SAMPLES', 30)

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

async function sampleFrameP95(page: Page, drive: () => Promise<void>) {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__frameDeltas = []
    let last = performance.now()
    let stopped = false
    w.__stopFrameSampler = () => {
      stopped = true
    }
    const loop = (t: number) => {
      (w.__frameDeltas as number[]).push(t - last)
      last = t
      if (!stopped) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })

  await drive()

  const deltas = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    ;(w.__stopFrameSampler as () => void)()
    return w.__frameDeltas as number[]
  })
  const samples = deltas.slice(3)
  expect(samples.length, 'frame sampler collected too few frames').toBeGreaterThan(FRAME_MIN_SAMPLES)
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0
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

  // NOTE: since the critical/deferred gate split (2026-06-10, 00-principles
  // fix ②), the loader exits once the critical tier (hero texture / fonts /
  // chunks / particles) is ready — deferred images keep fetching in the
  // background. LCP is therefore critical-tier-bound, not whole-archive-bound:
  // the old whole-gate warm baseline was ≈3.3s (budget 4200); the critical-only
  // gate budget is 2800ms. If this fails, either the critical tier grew (check
  // manifest.ts) or the gate regressed to full-manifest ready (guarded in
  // loader-preload-guards.mjs).
  expect(lcpMs, `LCP ${lcpMs?.toFixed(0)}ms exceeds ${LCP_BUDGET_MS}ms budget`).toBeLessThan(LCP_BUDGET_MS)
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

  const violations = longTasks.filter((t) => t.duration > LOAD_LONGTASK_MS)
  expect(
    violations,
    `Long tasks over ${LOAD_LONGTASK_MS}ms: ${JSON.stringify(violations)}`,
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
  try {
    const client = await page.context().newCDPSession(page)
    await client.send('HeapProfiler.collectGarbage')
    await client.detach()
  } catch {
    // Non-Chromium browsers may not expose CDP. The test falls back to the
    // browser's current memory sample below.
  }

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

  expect(heapMB, `JS heap ${heapMB.toFixed(1)} MB exceeds ${HEAP_BUDGET_MB} MB`).toBeLessThan(HEAP_BUDGET_MB)
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

  const violations = scrollLongTasks.filter((t) => t.duration > SCROLL_LONGTASK_MS)
  expect(
    violations,
    `Long tasks during scroll: ${JSON.stringify(violations)}`,
  ).toHaveLength(0)
})

// ── INP: interaction latency ──────────────────────────────────────────────────

test('interaction latency stays within the INP budget', async ({ page }) => {
  await openHome(page)

  // Event Timing API: each entry's duration spans input delay → handlers →
  // next paint, which is exactly what INP scores. We drive the heaviest real
  // interactions (a chapter-jump click starts the GSAP shutter transition)
  // and assert the worst observed interaction stays under budget — with so few
  // interactions, worst-case IS the INP.
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__interactionDurations = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as Record<string, { name: string; duration: number }[]>).__interactionDurations.push({
          name: entry.name,
          duration: Math.round(entry.duration),
        })
      }
    })
    observer.observe({ type: 'event', durationThreshold: 16 } as PerformanceObserverInit)
  })

  const aboutLink = page.locator('.nav__link', { hasText: 'About' })
  if (await aboutLink.isVisible()) {
    await aboutLink.click()
  }
  // Let the click's full effect (transition start) present, then a second
  // interaction while the page is busiest: mid-transition pointer activity.
  await page.waitForTimeout(700)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(500)

  const interactions = await page.evaluate(() =>
    (window as unknown as Record<string, { name: string; duration: number }[]>).__interactionDurations ?? [],
  )

  const worst = interactions.reduce((max, entry) => Math.max(max, entry.duration), 0)
  expect(
    worst,
    `Worst interaction ${worst}ms exceeds INP budget ${INP_BUDGET_MS}ms: ${JSON.stringify(interactions)}`,
  ).toBeLessThan(INP_BUDGET_MS)
})

// ── FPS: p95 frame time during scroll scrub ───────────────────────────────────

test('scroll scrub frame time p95 stays within budget', async ({ page }) => {
  await openHome(page)

  // Long-task gates catch single >100ms stalls; this catches sustained jank —
  // many 40-80ms frames feel terrible yet never trip the long-task observer.
  // Sample rAF deltas while scrubbing through the hero/about pin range and
  // assert the 95th percentile frame interval (≈ p95 frame time, the inverse
  // of FPS-p95) stays under budget. 34ms local ≈ one dropped 60Hz frame.
  const p95 = await sampleFrameP95(page, async () => {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(250)
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(250)
    await page.mouse.wheel(0, -1800)
    await page.waitForTimeout(400)
  })

  expect(
    p95,
    `p95 frame time ${p95.toFixed(1)}ms exceeds ${FRAME_P95_BUDGET_MS}ms (≈${(1000 / p95).toFixed(0)}fps p95)`,
  ).toBeLessThan(FRAME_P95_BUDGET_MS)
})

test('Continuum visible forms keep p95 frame time within budget', async ({ page }) => {
  await openHome(page)

  const sections = [
    { nav: 'About', label: 'About/disintegrate' },
    { nav: 'Work', label: 'Work/mathSurface' },
    { nav: 'Contact', label: 'Contact/gerstner' },
  ]

  for (const section of sections) {
    await page.locator('.nav__link', { hasText: section.nav }).click()
    await page.waitForTimeout(1000)
    const p95 = await sampleFrameP95(page, async () => {
      await page.mouse.wheel(0, 220)
      await page.waitForTimeout(250)
      await page.mouse.wheel(0, -220)
      await page.waitForTimeout(350)
    })

    expect(
      p95,
      `${section.label} p95 frame time ${p95.toFixed(1)}ms exceeds ${FRAME_P95_BUDGET_MS}ms`,
    ).toBeLessThan(FRAME_P95_BUDGET_MS)
  }
})

// ── Stage machine: no stale intro after load ───────────────────────────────────

test('stage is live after the intro exits', async ({ page }) => {
  await openHome(page)

  // The stage machine flips to `live` only when the loader hands off and unmounts
  // its panel. The observable contract: the .intro overlay is gone from the DOM.
  await expect(page.locator('.intro')).not.toBeAttached()
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
