import test from 'node:test'
import assert from 'node:assert/strict'

import { landingPortfolioProjects } from '../../../packages/content/src/projects.ts'

const retiredAiPhrases = ['值得注意的是', '至关重要', '赋能', '闭环', '底层逻辑']

void test('Landing project copy keeps six concrete, humanized introductions', () => {
  assert.equal(landingPortfolioProjects.length, 6)

  for (const project of landingPortfolioProjects) {
    const copy = [project.tagline, project.description, ...project.highlights].join('\n')
    for (const phrase of retiredAiPhrases) {
      assert.equal(copy.includes(phrase), false, `${project.name} still contains ${phrase}`)
    }
  }
})
