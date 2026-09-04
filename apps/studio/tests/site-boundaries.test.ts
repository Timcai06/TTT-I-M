import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSafeHref, requireWebNavigationHref } from '../lib/safeHref'
import { normalizeSiteUrl } from '../lib/site'

void test('site origins are canonical and fail closed on unsafe deployment values', () => {
  assert.equal(normalizeSiteUrl(undefined), 'https://www.crt-dsg.com')
  assert.equal(normalizeSiteUrl('https://example.com/'), 'https://example.com')
  assert.equal(normalizeSiteUrl('http://localhost:5174'), 'http://localhost:5174')
  assert.throws(() => normalizeSiteUrl('http://example.com'), /must use HTTPS/)
  assert.throws(() => normalizeSiteUrl('https://user:secret@example.com'), /cannot contain credentials/)
  assert.throws(() => normalizeSiteUrl('https://example.com/studio'), /origin only/)
})

void test('authored links allow explicit navigation protocols and block executable URLs', () => {
  assert.deepEqual(resolveSafeHref('/work/bdi'), { href: '/work/bdi', external: false })
  assert.deepEqual(resolveSafeHref('https://github.com/Timcai06'), {
    href: 'https://github.com/Timcai06',
    external: true,
  })
  assert.deepEqual(resolveSafeHref('mailto:hello@example.com'), {
    href: 'mailto:hello@example.com',
    external: false,
  })
  assert.equal(resolveSafeHref('javascript:alert(1)'), null)
  assert.equal(resolveSafeHref('data:text/html,unsafe'), null)
  assert.equal(resolveSafeHref('https://user:secret@example.com'), null)
})

void test('deployment navigation accepts only root-relative or HTTP(S) destinations', () => {
  assert.equal(requireWebNavigationHref('/'), '/')
  assert.equal(requireWebNavigationHref('https://www.crt-dsg.com'), 'https://www.crt-dsg.com')
  assert.throws(() => requireWebNavigationHref('mailto:hello@example.com'), /root-relative/)
  assert.throws(() => requireWebNavigationHref('../relative'), /root-relative/)
})
