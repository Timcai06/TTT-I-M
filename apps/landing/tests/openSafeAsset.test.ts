import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSafeAssetUrl } from '../src/shared/media/openSafeAsset.ts'

void test('asset fallback accepts only same-origin HTTP(S) URLs', () => {
  const origin = 'https://portfolio.example'

  assert.equal(resolveSafeAssetUrl('/frame/photo.webp', origin)?.href, 'https://portfolio.example/frame/photo.webp')
  assert.equal(resolveSafeAssetUrl('https://portfolio.example/projects/shot.webp', origin)?.href, 'https://portfolio.example/projects/shot.webp')
  assert.equal(resolveSafeAssetUrl('https://phishing.example/shot.webp', origin), null)
  assert.equal(resolveSafeAssetUrl('javascript:alert(1)', origin), null)
  assert.equal(resolveSafeAssetUrl('data:text/html,unsafe', origin), null)
  assert.equal(resolveSafeAssetUrl('https://[invalid', origin), null)
})
