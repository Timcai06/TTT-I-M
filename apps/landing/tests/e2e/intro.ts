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
// Must stay comfortably under playwright.config.ts's per-test timeout, which is
// what actually stops a test. 120s here against a 45s test timeout was a budget
// that could never be spent.
//
// 90s then missed by seconds. Two screencast frames from the same CI run measured
// it: the counter was at 54 around 45s, and the last frame caught the exit
// already running - counter and hairline faded, title not yet lifted - which is
// the first half-second of a ~2.5s exit animation. Linear from 54% at 45s puts
// the hand-off near 83s, and the test gave up at 90.
//
// So 180s: roughly twice the measured cost, not another guess one notch up.
// 180s was still short: a run hit the 240s per-test cap with the intro up, so the
// preload passed three minutes on that runner. The cost varies by runner, and the
// only durable fix is to stop the intro waiting on the room at all - see the note
// in playwright.config.ts. Until then the budget covers the observed spread.
export const INTRO_TIMEOUT_MS = process.env.CI ? 300_000 : 20_000
