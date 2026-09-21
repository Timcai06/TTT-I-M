import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * A task the reader cannot enter without must never sit on the generic deadline.
 *
 * `preloadController` falls back to TASK_TIMEOUT_MS (12 s) for any task that does
 * not name its own budget. That number was written for a fast path, and the
 * manifest has since grown a 22.9 MB room, a film/sound prewarm and ~150 images
 * that all share one bandwidth window. Under that contention whichever task gets
 * squeezed blows 12 s — measured on production, `chunks:pretext`, `texture:hero`
 * and `chunks:chapters` each burned the whole three-attempt critical budget and
 * were reported failed while every request had in fact returned 200.
 *
 * When the squeezed task is a required one the cost is not fidelity, it is the
 * site: `isReadingFallbackReady` admits a visitor only if every failure is
 * optional, so one such timeout answers a cold visit with the retry panel.
 *
 * Optional tasks are deliberately left free to use the short default — losing
 * them is supposed to be cheap and quick.
 *
 * Parsed from source rather than from `buildResourceManifest()`, which reaches
 * for `matchMedia` and pulls in the three.js loaders; the rule being guarded is
 * a property of the declarations, so the declarations are what is read.
 */
const source = readFileSync(
  fileURLToPath(new URL('../src/lib/resources/manifest.ts', import.meta.url)),
  'utf8',
)

/** Each `{ id: '…', … }` task literal, flattened to one line. */
function taskDeclarations() {
  const starts: { id: string; at: number }[] = []
  for (const match of source.matchAll(/\bid:\s*[`'"]([\w:${}./-]+)[`'"]/g)) {
    starts.push({ id: match[1], at: match.index ?? 0 })
  }
  return starts.map(({ id, at }, index) => ({
    id,
    body: source.slice(at, starts[index + 1]?.at ?? source.length).replace(/\s+/g, ' '),
  }))
}

void test('every required preload task names its own deadline', () => {
  const tasks = taskDeclarations()
  assert.ok(tasks.length >= 6, `expected to parse the manifest, found ${tasks.length} tasks`)

  const required = tasks.filter((task) => !/optional:\s*true/.test(task.body))
  assert.ok(required.length >= 4, `expected required tasks, found ${required.length}`)

  for (const task of required) {
    assert.match(
      task.body,
      /timeoutMs:/,
      `${task.id} is required but has no timeoutMs, so it inherits the 12s default — a timeout there locks the reader out`,
    )
  }
})

void test('the required deadline is generous enough to outlast the room download', () => {
  // The room is the slowest thing sharing the window; a required task has to be
  // able to wait behind it rather than give up while it is still streaming.
  const deadline = /const CODE_DEADLINE_MS = ([\d_]+)/.exec(source)
  assert.ok(deadline, 'CODE_DEADLINE_MS is missing')
  assert.ok(
    Number(deadline[1].replaceAll('_', '')) >= 60_000,
    'a required task needs a deadline measured against a slow connection, not a fast one',
  )
})
