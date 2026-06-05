import '@timcai/tokens/css'
import './studio.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://timcai.example'),
  title: {
    default: 'Tim Cai Studio',
    template: '%s · Tim Cai Studio',
  },
  description: 'A quiet content platform for essays, work details, and future publishing workflows.',
}

const navItems = [
  { href: '/blog', label: 'Blog' },
  { href: '/work', label: 'Work' },
  { href: '/dashboard', label: 'Dashboard' },
]

const landingHref = process.env.NEXT_PUBLIC_LANDING_URL ?? '/'

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
      </body>
    </html>
  )
}
