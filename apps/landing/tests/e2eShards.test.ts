import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * The gates lane runs as one CI shard per spec file.
 *
 * Measured on a runner: every test reloads the page and pays the room preload
 * again, 1.7 to 3 minutes each, so three balanced shards still ran 24 minutes
 * against a 30 minute cap. One file per shard is the split that needs no hand
 * balancing to stay correct, and it leaves the longest file - effects-context,
 * eight tests - as the only long pole.
 *
 * Authoring the split at all creates exactly one hazard: a spec added to
 * test:e2e:gates and to no shard would silently stop running in CI.
 *
 * This is that hazard's guard. It is a data check, so it runs in `verify` with
 * the rest of the unit suite rather than costing a browser.
 */
const scripts = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
}).scripts
const specsOf = (script: string) => (scripts[script] ?? '').split(/\s+/).filter(part => part.endsWith('.spec.ts'))

void test('the gates shards partition the gates lane exactly', () => {
  const all = specsOf('test:e2e:gates')
  assert.ok(all.length > 0, 'test:e2e:gates lists no specs')
  const shards = [1, 2, 3, 4, 5, 6].map(index => specsOf(`test:e2e:gates:${index}`))
  for (const [index, shard] of shards.entries()) {
    assert.ok(shard.length > 0, `test:e2e:gates:${index + 1} lists no specs`)
  }
  const union = shards.flat()
  assert.deepEqual([...union].sort(), [...all].sort(), 'shards do not cover the gates lane exactly')
  assert.equal(new Set(union).size, union.length, 'a spec appears in more than one shard')
})
