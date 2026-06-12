import type { MetadataRoute } from 'next'
import { posts, works } from '../content'
import { siteUrl as baseUrl } from '../lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/blog', '/work', '/dashboard'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }))

  const postRoutes = posts.all().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.meta.updatedAt ?? post.meta.publishedAt ?? new Date(),
  }))

  const workRoutes = works.all().map((work) => ({
    url: `${baseUrl}/work/${work.slug}`,
    lastModified: work.meta.updatedAt ?? work.meta.publishedAt ?? new Date(),
  }))

  return [...staticRoutes, ...postRoutes, ...workRoutes]
}
