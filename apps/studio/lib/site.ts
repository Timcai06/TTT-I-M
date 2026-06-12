/**
 * @description Studio 内容面的公开 canonical origin，用于 sitemap、RSS、metadataBase
 *   等绝对 URL。生产默认指向真实主域，避免 env 缺失时输出 `timcai.example`
 *   或 Vercel 子域名这类会污染搜索/分享卡片的地址。
 * @dependencies NEXT_PUBLIC_SITE_URL；Next metadata、RSS route、sitemap 统一从这里取值
 * @caveats canonical 当前选择 `https://www.crt-dsg.com`；apex 会 307 到 www，
 *   `*.vercel.app` 只允许作为部署目标，不允许进入公开 metadata。
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.crt-dsg.com'
