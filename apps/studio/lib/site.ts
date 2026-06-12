/**
 * Canonical public origin for absolute URLs (sitemap, RSS, metadataBase).
 * NEXT_PUBLIC_SITE_URL overrides per environment; the fallback is the real
 * production main domain — never a placeholder, because crawlers consume
 * whatever lands here (the old `timcai.example` fallback produced dead links
 * whenever the env var was missing). Canonical is www.crt-dsg.com (the apex
 * 307s to www); the *.vercel.app project domains must never be advertised.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.crt-dsg.com'
