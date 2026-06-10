import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { defaultMeta, type ContentMeta, type Post, type PublishState } from '@timcai/content'

const postsDirectory = path.join(process.cwd(), 'content/posts')

/** MDX frontmatter 的原始解析结果；具体字段由 requireString/getMeta 收窄。 */
type Frontmatter = Record<string, unknown>

/**
 * @description 将 frontmatter 字段安全收窄为非空字符串
 */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
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
 * @description 从 MDX frontmatter 组装共享 ContentMeta，并用 defaultMeta 兜底
 * @dependencies @timcai/content 的 ContentMeta/defaultMeta/PublishState
 * @caveats publishState 当前只做类型断言，不做枚举校验；未来 Studio 审核流应在写入侧校验
 */
function getMeta(data: Frontmatter): ContentMeta {
  return {
    ...defaultMeta,
    author: asString(data.author) ?? defaultMeta.author,
    publishedAt: asString(data.publishedAt),
    publishState: (asString(data.publishState) ?? defaultMeta.publishState) as PublishState,
    updatedAt: asString(data.updatedAt),
  }
}

/**
 * @description 基于英文词数估算阅读时间，最低 1 分钟
 * @caveats 中文内容按空白分词不够精确；如果 Studio 转向中文长文，应替换为 CJK-aware 估算
 */
function getReadingMinutes(body: string) {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
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
