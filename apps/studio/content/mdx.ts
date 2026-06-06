import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { defaultMeta, type ContentMeta, type Post, type PublishState } from '@timcai/content'

const postsDirectory = path.join(process.cwd(), 'content/posts')

type Frontmatter = Record<string, unknown>

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function requireString(data: Frontmatter, key: string, filePath: string): string {
  const value = asString(data[key])
  if (!value) {
    throw new Error(`Missing "${key}" frontmatter in ${filePath}`)
  }
  return value
}

function getMeta(data: Frontmatter): ContentMeta {
  return {
    ...defaultMeta,
    author: asString(data.author) ?? defaultMeta.author,
    publishedAt: asString(data.publishedAt),
    publishState: (asString(data.publishState) ?? defaultMeta.publishState) as PublishState,
    updatedAt: asString(data.updatedAt),
  }
}

function getReadingMinutes(body: string) {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function readPosts(): Post[] {
  return readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const filePath = path.join(postsDirectory, fileName)
      // gray-matter: robust YAML frontmatter (arrays, nested, multiline) — replaces
      // the previous hand-rolled flat string:value parser.
      const { content, data } = matter(readFileSync(filePath, 'utf8'))
      const frontmatter = data as Frontmatter
      const slug = fileName.replace(/\.mdx$/, '')

      return {
        // Raw MDX body; compiled to React at render time by MdxContent (real MDX,
        // not a markdown subset) so posts can embed components.
        body: content.trim(),
        excerpt: requireString(frontmatter, 'excerpt', filePath),
        meta: getMeta(frontmatter),
        readingMinutes: getReadingMinutes(content),
        slug,
        sourcePath: `content/posts/${fileName}`,
        title: requireString(frontmatter, 'title', filePath),
      }
    })
    .sort((a, b) => (b.meta.publishedAt ?? '').localeCompare(a.meta.publishedAt ?? ''))
}
