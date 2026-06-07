import { useState } from 'react'
import { navChapters } from '../chapters/registry'
import { useChapterState } from '../lib/chapterState'
import { transitionToChapter } from '../lib/chapterTransition'

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))
// In prod the blog is served same-origin at /blog (vercel.json proxies it to the
// studio origin). Linking to the relative path keeps the user on the main domain
// (同域) AND enables cross-document View Transitions, which require same-origin
// navigation. Only dev points cross-origin at the local studio dev server.
const devStudioUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_STUDIO_URL ?? 'http://localhost:5174')
  : undefined
const blogHref = devStudioUrl ? new URL('/blog', devStudioUrl).toString() : '/blog'

export default function Nav() {
  const { activeId } = useChapterState()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleChapterClick = (id: string) => {
    setMobileOpen(false)
    transitionToChapter(id, { updateHash: true })
  }

  return (
    <header className={`nav${mobileOpen ? ' nav--mobile-open' : ''}`}>
      <div className="container nav__inner">
        <a className="nav__brand" href={blogHref} aria-label="Open Tim Cai blog">
          Tim · 蔡
        </a>
        <nav>
          <ul className="nav__links">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  className={`nav__link${activeId === l.id ? ' is-active' : ''}`}
                  onClick={() => handleChapterClick(l.id)}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav__counter">
          SHA <span style={{ color: 'var(--accent)' }}>● </span>1
          <span style={{ marginLeft: 8 }}>—</span> ZJGSU
        </div>
        <button
          className="nav__menu-button"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          Menu
        </button>
      </div>
      <nav
        className="nav__mobile-panel"
        id="mobile-navigation"
        aria-label="Mobile chapter navigation"
      >
        {links.map((l) => (
          <button
            className={`nav__mobile-link${activeId === l.id ? ' is-active' : ''}`}
            key={l.id}
            onClick={() => handleChapterClick(l.id)}
            type="button"
          >
            <span>{l.label.slice(0, 2)}</span>
            <strong>{l.label.replace(/^\d+\s*·\s*/, '')}</strong>
          </button>
        ))}
      </nav>
    </header>
  )
}
