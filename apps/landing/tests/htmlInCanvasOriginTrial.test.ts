import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HTML_IN_CANVAS_ORIGIN_TRIAL_ENV,
  createOriginTrialMeta,
  normalizeOriginTrialToken,
} from '../config/htmlInCanvasOriginTrial.ts'

const validToken = `A${'b'.repeat(63)}=`

void test('Origin Trial stays absent when no production token is configured', () => {
  assert.equal(normalizeOriginTrialToken(undefined), null)
  assert.equal(normalizeOriginTrialToken('   '), null)
  assert.equal(createOriginTrialMeta(undefined), null)
})

void test('Origin Trial meta is emitted before app feature detection', () => {
  assert.deepEqual(createOriginTrialMeta(`  ${validToken}  `), {
    tag: 'meta',
    attrs: {
      'http-equiv': 'origin-trial',
      content: validToken,
      'data-feature': 'html-in-canvas',
    },
    injectTo: 'head-prepend',
  })
})

void test('malformed tokens fail closed without echoing their value', () => {
  const malformedToken = '<script>alert(1)</script>'

  assert.throws(
    () => normalizeOriginTrialToken(malformedToken),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, new RegExp(HTML_IN_CANVAS_ORIGIN_TRIAL_ENV))
      assert.doesNotMatch(error.message, /script|alert/)
      return true
    },
  )
})
