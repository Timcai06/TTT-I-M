import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import {
  HTML_IN_CANVAS_ORIGIN_TRIAL_ENV,
  createOriginTrialMeta, htmlInCanvasOriginTrial,
  normalizeOriginTrialToken, parseOriginTrialPayload,
} from '../config/htmlInCanvasOriginTrial.ts'

const options = { expectedOrigin: 'https://www.crt-dsg.com', now: 1790000000000 }
const payload = { origin: 'https://www.crt-dsg.com:443', feature: 'HTMLInCanvas', expiry: 1792454400 }
// Fixtures deliberately have zero signatures. No real token is needed or verified.
function encode(data: unknown = payload, version = 3, raw?: Buffer): string {
  const body = raw ?? Buffer.from(JSON.stringify(data))
  const header = Buffer.alloc(69)
  header[0] = version
  header.writeUInt32BE(body.length, 65)
  return Buffer.concat([header, body]).toString('base64')
}
function rejects(token: string, reason: RegExp, settings = options) {
  assert.throws(() => createOriginTrialMeta(token, settings), (error: unknown) => {
    assert.ok(error instanceof Error)
    assert.ok(error.message.includes(HTML_IN_CANVAS_ORIGIN_TRIAL_ENV))
    assert.match(error.message, reason)
    assert.ok(!error.message.includes(token))
    assert.match(error.message, /signature not verified/)
    return true
  })
}

void test('missing token permits local and Preview builds without a target origin', () => {
  for (const token of [undefined, '', '   ']) {
    assert.equal(normalizeOriginTrialToken(token), null)
    assert.equal(createOriginTrialMeta(token), null)
  }
})

void test('v2 and v3 public structures produce early meta without claiming signature verification', () => {
  for (const version of [2, 3]) {
    const token = encode(payload, version)
    assert.deepEqual(parseOriginTrialPayload(token), {
      ...payload, origin: options.expectedOrigin, version,
      isSubdomain: false, isThirdParty: false, usage: '',
    })
    assert.deepEqual(createOriginTrialMeta(`  ${token}  `, options), {
      tag: 'meta', attrs: { 'http-equiv': 'origin-trial', content: token, 'data-feature': 'html-in-canvas' },
      injectTo: 'head-prepend',
    })
    const plugin = htmlInCanvasOriginTrial(token, options)
    assert.equal(plugin.enforce, 'pre')
    assert.equal(typeof plugin.transformIndexHtml, 'function')
  }
})

void test('bounds, encoding, header and byte length are checked before JSON', () => {
  rejects('<script>PRIVATE_VALUE</script>', /Base64/)
  rejects('A'.repeat(6145), /size limit/)
  rejects('AAAA', /truncated/)
  rejects(encode(payload, 1), /version/)
  const bytes = Buffer.from(encode(), 'base64')
  bytes.writeUInt32BE(bytes.readUInt32BE(65) + 1, 65)
  rejects(bytes.toString('base64'), /length/)
  rejects(encode(null, 3, Buffer.alloc(4097)), /size limits/)
  rejects(encode(null, 3, Buffer.alloc(0)), /size limits/)
  rejects(encode(null, 3, Buffer.from([0xff])), /UTF-8 JSON/)
  rejects(encode(null, 3, Buffer.from('{PRIVATE_VALUE')), /UTF-8 JSON/)
  rejects(encode().slice(0, -1), /Base64/)
  rejects('AB==', /noncanonical/)
})

void test('JSON shape and all interpreted fields are bounded', () => {
  for (const value of [null, [], 12, 'PRIVATE_VALUE']) rejects(encode(value), /JSON object/)
  for (const origin of [null, 'http://www.crt-dsg.com', 'https://www.crt-dsg.com/path', 'https://x:y@www.crt-dsg.com', 'https://www.crt-dsg.com/?q=x', 'https:////www.crt-dsg.com', 'https://www.crt-dsg.com\n']) {
    rejects(encode({ ...payload, origin }), /origin/)
  }
  for (const feature of [undefined, 123, '']) rejects(encode({ ...payload, feature }), /feature/)
  for (const expiry of [undefined, '1792454400', 0, -1, 1.5, 2147483648]) rejects(encode({ ...payload, expiry }), /expiry/)
  rejects(encode({ ...payload, isSubdomain: 'true' }), /isSubdomain/)
  rejects(encode({ ...payload, isThirdParty: 1 }), /isThirdParty/)
  rejects(encode({ ...payload, usage: 'PRIVATE_VALUE' }), /usage/)
})

void test('feature, target origin and expiry policy fail closed for explicit tokens', () => {
  rejects(encode({ ...payload, feature: 'PRIVATE_VALUE' }), /feature must be HTMLInCanvas/)
  rejects(encode(), /target origin/, { ...options, expectedOrigin: 'https://crt-dsg.com' })
  rejects(encode(), /target origin/, { ...options, expectedOrigin: 'https://preview.vercel.app' })
  rejects(encode(), /ORIGIN must be an HTTPS origin/, { ...options, expectedOrigin: '' })
  rejects(encode(), /target origin/, { ...options, expectedOrigin: 'https://www.crt-dsg.com:444' })
  rejects(encode(), /expiry has passed/, { ...options, now: payload.expiry * 1000 })
  rejects(encode(), /expiry has passed/, { ...options, now: payload.expiry * 1000 + 1 })
  assert.ok(createOriginTrialMeta(encode(), { ...options, now: payload.expiry * 1000 - 1 }))
  rejects(encode(), /clock/, { ...options, now: NaN })
})

void test('subdomain matching respects host boundary and port; Preview may have its own token', () => {
  const token = encode({ ...payload, origin: 'https://crt-dsg.com:443', isSubdomain: true })
  assert.ok(createOriginTrialMeta(token, options))
  rejects(token, /target origin/, { ...options, expectedOrigin: 'https://evilcrt-dsg.com' })
  rejects(token, /target origin/, { ...options, expectedOrigin: 'https://crt-dsg.com.evil.example' })
  rejects(token, /target origin/, { ...options, expectedOrigin: 'https://www.crt-dsg.com:444' })
  const origin = 'https://preview.vercel.app'
  assert.ok(createOriginTrialMeta(encode({ ...payload, origin }), { ...options, expectedOrigin: origin }))
})

void test('v3 third-party and subset restrictions cannot silently pass first-party policy', () => {
  rejects(encode({ ...payload, isThirdParty: true }), /third-party/)
  rejects(encode({ ...payload, usage: 'subset' }), /subset-restricted/)
  assert.ok(createOriginTrialMeta(encode({ ...payload, isThirdParty: false, usage: '' }), options))
  assert.equal(parseOriginTrialPayload(encode({ ...payload, isThirdParty: true, usage: 'subset' }, 2)).isThirdParty, false)
  assert.equal(parseOriginTrialPayload(encode({ ...payload, usage: 'subset' }, 2)).usage, '')
})

void test('existing Production token-only configuration reuses canonical without a new env var', () => {
  assert.ok(createOriginTrialMeta(encode(), { deploymentEnvironment: 'production', now: options.now }))
  assert.equal(createOriginTrialMeta(undefined, { deploymentEnvironment: 'production' }), null)
  assert.throws(() => createOriginTrialMeta(encode(), { deploymentEnvironment: 'production', expectedOrigin: 'https://wrong.example', now: options.now }), /target origin/)
})

void test('non-target Preview inherits no production capability claim, even with inherited override', () => {
  const preview = { deploymentEnvironment: 'preview', deploymentOrigin: 'https://preview.vercel.app', now: options.now }
  assert.equal(createOriginTrialMeta(encode(), preview), null)
  assert.equal(createOriginTrialMeta(encode(), { ...preview, expectedOrigin: options.expectedOrigin }), null)
  assert.equal(createOriginTrialMeta(encode(), { deploymentEnvironment: 'preview', now: options.now }), null)
  assert.equal(createOriginTrialMeta(undefined, preview), null)
  assert.equal(createOriginTrialMeta(encode(), { now: options.now }), null)
  const token = encode({ ...payload, origin: preview.deploymentOrigin })
  assert.ok(createOriginTrialMeta(token, preview))
  assert.ok(createOriginTrialMeta(token, { ...preview, expectedOrigin: preview.deploymentOrigin }))
  assert.throws(() => createOriginTrialMeta(encode(), { ...preview, expectedOrigin: preview.deploymentOrigin }), /target origin/)
})
