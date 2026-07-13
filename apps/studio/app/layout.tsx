import '@timcai/tokens/css'
import '@timcai/tokens/view-transitions.css'
import './studio.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { siteUrl } from '../lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Tim Cai Studio',
    template: '%s · Tim Cai Studio',
  },
  description: 'Case notes on evidence-grounded AI systems, PyTorch observability, research intelligence, and visual engineering.',
}

const navItems = [
  { href: '/blog', label: 'Blog' },
  { href: '/work', label: 'Work' },
  { href: '/graph', label: 'Graph' },
  { href: '/dashboard', label: 'Dashboard' },
]

const landingHref = process.env.NEXT_PUBLIC_LANDING_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '/')

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="studio-shell__header">
          <Link className="studio-shell__brand" href={landingHref}>
            Tim Cai Studio
          </Link>
          <nav className="studio-shell__nav" aria-label="Studio navigation">
            {navItems.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="studio-shell">{children}</main>
        <footer className="studio-shell">
          <div className="studio-footer">
            <span>© {new Date().getFullYear()} Tim Cai</span>
            <nav aria-label="Footer navigation">
              <Link href={landingHref}>← Portfolio</Link>
              {navItems.map((item) => (
                <Link href={item.href} key={item.href} style={{ marginLeft: '20px' }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}
