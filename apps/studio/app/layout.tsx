import '@timcai/tokens/css'
import '@timcai/tokens/view-transitions.css'
import '@fontsource-variable/bodoni-moda/standard.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import './studio.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { siteUrl } from '../lib/site'
import { requireWebNavigationHref } from '../lib/safeHref'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Tim Cai Studio',
    template: '%s · Tim Cai Studio',
  },
  description: 'Case notes on evidence-grounded AI systems, PyTorch observability, research intelligence, and visual engineering.',
}

const navItems = [
  { href: '/work', label: 'Work' },
  { href: '/graph', label: 'Graph' },
  { href: '/blog', label: 'Blog' },
  { href: '/dashboard', label: 'Dashboard' },
]

const landingHref = requireWebNavigationHref(
  process.env.NEXT_PUBLIC_LANDING_URL
    ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '/'),
)

/** 页脚那条外链要说出它真正去的地方，而不是一个说了等于没说的 “Portfolio”。
 *  名字取自 canonical 站点，不取自 dev 的 localhost —— 目的地是同一个站点。 */
const landingLabel = new URL(siteUrl).host.replace(/^www\./, '')

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="shell-header">
          <div className="shell-header__inner">
            <Link className="shell-brand" href={landingHref}>
              Tim Cai Studio
            </Link>
            <nav className="shell-nav" aria-label="Studio navigation">
              {navItems.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="shell-main">{children}</main>

        <footer className="shell-footer">
          <div className="shell-footer__inner">
            <span className="shell-footer__mark">© {new Date().getFullYear()} Tim Cai</span>
            <div className="shell-footer__meta">
              <Link className="shell-footer__link" href={landingHref}>
                {landingLabel}
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
