/**
 * @description Studio 内容面的公开 canonical origin，用于 sitemap、RSS、metadataBase
 *   等绝对 URL。生产默认指向真实主域，避免 env 缺失时输出 `timcai.example`
 *   或 Vercel 子域名这类会污染搜索/分享卡片的地址。
 * @dependencies NEXT_PUBLIC_SITE_URL；Next metadata、RSS route、sitemap 统一从这里取值
 * @caveats canonical 当前选择 `https://www.crt-dsg.com`；apex 会 307 到 www，
 *   `*.vercel.app` 只允许作为部署目标，不允许进入公开 metadata。
 */
const DEFAULT_SITE_URL = 'https://www.crt-dsg.com'

export function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_SITE_URL
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) origin.')
  }

  const localHttp = url.protocol === 'http:'
    && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS (except localhost) and cannot contain credentials.')
  }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must contain an origin only, without a path, query, or fragment.')
  }
  return url.origin
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
