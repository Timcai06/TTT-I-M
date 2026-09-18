import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * The gates lane runs as three CI shards so its wall clock is a third of 40.8
 * minutes. Playwright's own --shard splits by file, and these six files hold
 * 8/6/5/3/1/1 tests, which it divided 9/14/1 - the longest shard saved nothing.
 * So the split is authored by hand, which creates exactly one hazard: a spec
 * added to test:e2e:gates and to no shard would silently stop running in CI.
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
  const shards = [1, 2, 3].map(index => specsOf(`test:e2e:gates:${index}`))
  for (const [index, shard] of shards.entries()) {
    assert.ok(shard.length > 0, `test:e2e:gates:${index + 1} lists no specs`)
  }
  const union = shards.flat()
  assert.deepEqual([...union].sort(), [...all].sort(), 'shards do not cover the gates lane exactly')
  assert.equal(new Set(union).size, union.length, 'a spec appears in more than one shard')
})
