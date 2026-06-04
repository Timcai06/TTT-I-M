/**
 * WebGL context budget.
 *
 * The site runs up to three independent contexts (Hero portrait, About text
 * particles, the chapter-transition field). Browsers cap live contexts (~16) and
 * each one is real GPU pressure, especially on mobile. This registry tracks how
 * many are live so *optional* surfaces (the transition field) can ask before
 * acquiring and gracefully skip when the budget is tight, instead of blindly
 * spawning a fourth/fifth context at the heaviest moment.
 *
 * Required surfaces (Hero, About) still register so the count is accurate, but
 * they don't gate on it — only ambient/optional surfaces call `canAcquire()`.
 */
const MAX_CONTEXTS = 3

let active = 0

export function activeContextCount(): number {
  return active
}

/** Can an *optional* surface afford a new context right now? */
export function canAcquire(): boolean {
  return active < MAX_CONTEXTS
}

export function acquireContext(): void {
  active += 1
}

export function releaseContext(): void {
  active = Math.max(0, active - 1)
}
