import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePostSource, readPosts } from '../content/mdx'

const validPost = `---
title: A valid post
excerpt: A bounded public summary.
publishedAt: '2026-09-03'
updatedAt: '2026-09-03'
author: tim
publishState: published
---

# Evidence first

这是一段可验证的正文 with a small English sentence.
`

void test('repository posts are public, uniquely addressed, and fully validated', () => {
  const posts = readPosts()
  assert.ok(posts.length > 0)
  assert.equal(new Set(posts.map((post) => post.slug.toLowerCase())).size, posts.length)
  assert.ok(posts.every((post) => post.meta.publishState === 'published' || post.meta.publishState === 'approved'))
  assert.ok(posts.every((post) => Boolean(post.meta.publishedAt)))
})

void test('post parsing validates publish state, calendar dates, slug, and body', () => {
  const parsed = parsePostSource('valid-post.mdx', validPost)
  assert.equal(parsed.slug, 'valid-post')
  assert.equal(parsed.meta.publishState, 'published')
  assert.ok((parsed.readingMinutes ?? 0) >= 1)

  assert.throws(
    () => parsePostSource('valid-post.mdx', validPost.replace('publishState: published', 'publishState: publshed')),
    /Invalid "publishState"/,
  )
  assert.throws(
    () => parsePostSource('valid-post.mdx', validPost.replace('publishState: published\n', '')),
    /Missing "publishState"/,
  )
  assert.throws(
    () => parsePostSource('valid-post.mdx', validPost.replace('2026-09-03', '2026-02-30')),
    /Invalid "publishedAt"/,
  )
  assert.throws(() => parsePostSource('Bad Slug.mdx', validPost), /Invalid post filename/)
  assert.throws(
    () => parsePostSource('valid-post.mdx', validPost.replace(/# Evidence first[\s\S]*/, '')),
    /Post body is empty/,
  )
})
