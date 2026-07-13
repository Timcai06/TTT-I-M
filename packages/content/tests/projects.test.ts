import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { portfolioProjects } from '../src/projects.ts'

void test('selected work keeps PulseGraph and SciScope single-sourced with real media', () => {
  assert.equal(portfolioProjects.length, 6)

  const ids = portfolioProjects.map((project) => project.id)
  assert.ok(ids.includes('pulsegraph'))
  assert.ok(ids.includes('sciscope'))
  assert.ok(!ids.includes('doc-for-agent'))
  assert.ok(!ids.includes('spm'))

  const pulseGraph = portfolioProjects.find((project) => project.id === 'pulsegraph')
  const sciScope = portfolioProjects.find((project) => project.id === 'sciscope')
  assert.equal(pulseGraph?.media?.shots[0]?.src, '/projects/pulsegraph/live-monitor.webp')
  assert.equal(sciScope?.media?.shots[0]?.src, '/projects/sciscope/tui-product.webp')

  for (const project of [pulseGraph, sciScope]) {
    assert.ok(project?.media?.shots.length)
    for (const shot of project?.media?.shots ?? []) {
      const mediaPath = join(process.cwd(), 'apps/landing/public', shot.src)
      assert.ok(existsSync(mediaPath), `Missing project media: ${mediaPath}`)
    }
  }
})
