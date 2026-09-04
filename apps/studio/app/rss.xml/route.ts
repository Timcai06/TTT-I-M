import { posts } from '../../content'
import { siteUrl as baseUrl } from '../../lib/site'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function GET() {
  const items = posts.all().map((post) => {
    const postUrl = escapeXml(new URL(`/blog/${post.slug}`, baseUrl).href)
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.meta.publishedAt ? `<pubDate>${new Date(post.meta.publishedAt).toUTCString()}</pubDate>` : ''}
    </item>
  `
  }).join('')

  const escapedBaseUrl = escapeXml(baseUrl)

  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Tim Cai Studio</title>
        <link>${escapedBaseUrl}</link>
        <description>Studio essays and platform notes.</description>
        ${items}
      </channel>
    </rss>`, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
    },
  })
}
