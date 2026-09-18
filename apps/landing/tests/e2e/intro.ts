/**
 * How long a test may wait for the loader to hand off.
 *
 * 20s was written against a local machine, and on CI it was the single reason
 * e2e-gates and e2e were red for weeks: every spec waits for `.intro` to clear
 * on its first line, so all of them timed out together and the e2e lane spent
 * 94 minutes a push doing it.
 *
 * A trace frame recovered from a CI run settled what was actually happening. The
 * loader was at 69%, not 99 and not stalled - a two-core runner with software GL
 * preparing a 22.9 MB room simply takes longer than twenty seconds. Nothing was
 * broken; the budget was written for different hardware.
 *
 * So CI gets a budget that matches CI. Local keeps 20s, where anything slower is
 * a real regression worth failing on.
 */
export const INTRO_TIMEOUT_MS = process.env.CI ? 120_000 : 20_000
