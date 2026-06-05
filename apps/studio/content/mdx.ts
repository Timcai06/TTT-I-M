import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defaultMeta, type ContentMeta, type Post, type PublishState } from '@timcai/content'

const postsDirectory = path.join(process.cwd(), 'content/posts')

type FrontmatterValue = string | undefined

interface ParsedFrontmatter {
  body: string
  data: Record<string, FrontmatterValue>
}

function parseFrontmatter(source: string): ParsedFrontmatter {
  if (!source.startsWith('---\n')) {
    return { body: source.trim(), data: {} }
  }

  const closeIndex = source.indexOf('\n---', 4)
  if (closeIndex === -1) {
    return { body: source.trim(), data: {} }
  }

  const frontmatter = source.slice(4, closeIndex).trim()
  const body = source.slice(closeIndex + 5).trim()
  const data = Object.fromEntries(
    frontmatter
      .split('\n')
      .map((line) => {
        const separatorIndex = line.indexOf(':')
        if (separatorIndex === -1) return undefined

        const key = line.slice(0, separatorIndex).trim()
        const value = line.slice(separatorIndex + 1).trim()
        return [key, value.replace(/^["']|["']$/g, '')]
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  )

  return { body, data }
}

function getRequiredValue(data: Record<string, FrontmatterValue>, key: string, filePath: string) {
  const value = data[key]
  if (!value) {
    throw new Error(`Missing "${key}" frontmatter in ${filePath}`)
  }

  return value
}

function getMeta(data: Record<string, FrontmatterValue>): ContentMeta {
  return {
    ...defaultMeta,
    author: data.author ?? defaultMeta.author,
    publishedAt: data.publishedAt,
    publishState: (data.publishState ?? defaultMeta.publishState) as PublishState,
    updatedAt: data.updatedAt,
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
      const { body, data } = parseFrontmatter(readFileSync(filePath, 'utf8'))
      const slug = fileName.replace(/\.mdx$/, '')

      return {
        body,
        excerpt: getRequiredValue(data, 'excerpt', filePath),
        meta: getMeta(data),
        readingMinutes: getReadingMinutes(body),
        slug,
        sourcePath: `content/posts/${fileName}`,
        title: getRequiredValue(data, 'title', filePath),
      }
    })
    .sort((a, b) => (b.meta.publishedAt ?? '').localeCompare(a.meta.publishedAt ?? ''))
}
