import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { landingPortfolioProjects, portfolioProjects } from '../src/projects.ts'

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

void test('Landing promotes EduCanvas while Studio keeps its current catalogue', () => {
  assert.equal(landingPortfolioProjects.length, 6)
  assert.equal(landingPortfolioProjects[0]?.id, 'educanvas')
  assert.ok(!landingPortfolioProjects.some((project) => project.id === 'earnlytics'))
  assert.ok(portfolioProjects.some((project) => project.id === 'earnlytics'))
  assert.ok(!portfolioProjects.some((project) => project.id === 'educanvas'))

  const eduCanvas = landingPortfolioProjects[0]
  assert.equal(eduCanvas?.github, 'https://github.com/Timcai06/EduCanvas')
  assert.equal(eduCanvas?.media?.shots[0]?.src, '/projects/educanvas/home.webp')
  assert.equal(eduCanvas?.media?.shots.length, 3)
  for (const shot of eduCanvas?.media?.shots ?? []) {
    const mediaPath = join(process.cwd(), 'apps/landing/public', shot.src)
    assert.ok(existsSync(mediaPath), `Missing EduCanvas media: ${mediaPath}`)
  }
})

void test('Modeling Lab groups four real studies behind one landing project', () => {
  const modelingLab = landingPortfolioProjects.find((project) => project.id === 'modeling-lab')

  assert.ok(modelingLab)
  assert.equal(modelingLab.name, 'Modeling Lab')
  assert.equal(modelingLab.media?.shots.length, 1)
  assert.deepEqual(
    modelingLab.caseStudies?.map((study) => study.id),
    ['tunnel', 'desert', 'glass', 'agriculture'],
  )

  for (const study of modelingLab.caseStudies ?? []) {
    assert.match(study.repository, /^https:\/\/github\.com\/Timcai06\/26_MathModel_/)
    const mediaPath = join(process.cwd(), 'apps/landing/public', study.shot.src)
    assert.ok(existsSync(mediaPath), `Missing Modeling Lab media: ${mediaPath}`)
  }
})
