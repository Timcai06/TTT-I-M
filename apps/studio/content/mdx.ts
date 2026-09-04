import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { type ContentMeta, type Post, type PublishState } from '@timcai/content'

const postsDirectory = join(dirname(fileURLToPath(import.meta.url)), 'posts')
const PUBLISH_STATES = new Set<PublishState>([
  'draft',
  'submitted',
  'in-review',
  'approved',
  'published',
  'rejected',
])
const PUBLIC_STATES = new Set<PublishState>(['approved', 'published'])
const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** MDX frontmatter 的原始解析结果；具体字段由 requireString/getMeta 收窄。 */
type Frontmatter = Record<string, unknown>

/**
 * @description 将 frontmatter 字段安全收窄为非空字符串
 */
function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

/**
 * @description 读取必填字符串 frontmatter，缺失时抛出带文件路径的错误
 * @dependencies gray-matter 解析后的 Frontmatter
 * @caveats title/excerpt 属于内容生产硬要求，构建期失败比线上空字段更安全
 */
function requireString(data: Frontmatter, key: string, filePath: string): string {
  const value = asString(data[key])
  if (!value) {
    throw new Error(`Missing "${key}" frontmatter in ${filePath}`)
  }
  return value
}

/**
 * @description 将 publishState 收窄到共享枚举；任何未知值在构建期失败
 * @dependencies @timcai/content 的 PublishState
 */
function requirePublishState(data: Frontmatter, filePath: string): PublishState {
  const value = requireString(data, 'publishState', filePath)
  if (!PUBLISH_STATES.has(value as PublishState)) {
    throw new Error(`Invalid "publishState" frontmatter in ${filePath}: ${value}`)
  }
  return value as PublishState
}

function optionalIsoDate(data: Frontmatter, key: string, filePath: string): string | undefined {
  const rawValue = data[key]
  if (rawValue instanceof Date) {
    throw new Error(`Invalid "${key}" frontmatter in ${filePath}: quote YYYY-MM-DD so YAML cannot normalize it`)
  }
  const value = asString(rawValue)
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!ISO_DATE.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid "${key}" frontmatter in ${filePath}: expected YYYY-MM-DD`)
  }
  return value
}

function getMeta(data: Frontmatter, filePath: string): ContentMeta {
  const publishState = requirePublishState(data, filePath)
  const publishedAt = optionalIsoDate(data, 'publishedAt', filePath)
  const updatedAt = optionalIsoDate(data, 'updatedAt', filePath)
  if (PUBLIC_STATES.has(publishState) && !publishedAt) {
    throw new Error(`Missing "publishedAt" frontmatter for public post ${filePath}`)
  }
  if (publishedAt && updatedAt && updatedAt < publishedAt) {
    throw new Error(`Invalid "updatedAt" frontmatter in ${filePath}: cannot precede publishedAt`)
  }

  return {
    author: requireString(data, 'author', filePath),
    publishedAt,
    publishState,
    updatedAt,
  }
}

/**
 * @description 同时按拉丁词数与汉字数估算阅读时间，最低 1 分钟
 */
function getReadingMinutes(body: string) {
  const cjkCharacters = body.match(/\p{Script=Han}/gu)?.length ?? 0
  const latinWords = body
    .replace(/\p{Script=Han}/gu, ' ')
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  return Math.max(1, Math.ceil(latinWords / 220 + cjkCharacters / 300))
}

export function parsePostSource(fileName: string, source: string): Post {
  const filePath = join(postsDirectory, fileName)
  const slug = fileName.replace(/\.mdx$/, '')
  if (!fileName.endsWith('.mdx') || !POST_SLUG.test(slug)) {
    throw new Error(`Invalid post filename ${fileName}: use a lowercase kebab-case .mdx slug`)
  }

  const { content, data: frontmatter } = matter(source)
  const body = content.trim()
  if (!body) throw new Error(`Post body is empty in ${filePath}`)

  return {
    body,
    excerpt: requireString(frontmatter, 'excerpt', filePath),
    meta: getMeta(frontmatter, filePath),
    readingMinutes: getReadingMinutes(body),
    slug,
    sourcePath: `content/posts/${fileName}`,
    title: requireString(frontmatter, 'title', filePath),
  }
}

/**
 * @description 读取 apps/studio/content/posts 下的 MDX 博文，解析 frontmatter 并按发布时间倒序返回
 * @dependencies node:fs、node:path、gray-matter、@timcai/content 共享类型
 * @performance 当前在构建/服务端读取本地文件；不进入 landing bundle，也不触发 GSAP/R3F 平台依赖
 * @steps
 * step1: 遍历 postsDirectory 下的 .mdx 文件
 * step2: 使用 gray-matter 解析 YAML frontmatter 和正文
 * step3: 校验 title/excerpt，生成 slug/sourcePath/readingMinutes/meta
 * step4: 按 publishedAt 倒序排序，供 blog index 和详情页使用
 */
export function readPosts(): Post[] {
  const posts = readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => parsePostSource(fileName, readFileSync(join(postsDirectory, fileName), 'utf8')))

  const seenSlugs = new Set<string>()
  for (const post of posts) {
    const canonicalSlug = post.slug.toLowerCase()
    if (seenSlugs.has(canonicalSlug)) throw new Error(`Duplicate post slug: ${post.slug}`)
    seenSlugs.add(canonicalSlug)
  }

  return posts
    .filter((post) => PUBLIC_STATES.has(post.meta.publishState))
    .sort((a, b) => (b.meta.publishedAt ?? '').localeCompare(a.meta.publishedAt ?? ''))
}
