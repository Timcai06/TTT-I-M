import { useEffect, useState } from 'react'
import { navChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'
import { scrollToChapter } from '../lib/chapterScroll'

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))

export default function Nav() {
  const [active, setActive] = useState(links[0]?.id ?? '')

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(e.target.id)
            window.history.replaceState(null, '', `#${e.target.id}`)
          }
        })
      },
      { threshold: 0.35 }
    )
    // Sections are lazy-loaded; observe them only once they're in the DOM.
    const cancel = onChaptersReady(() => {
      links
        .map((l) => document.getElementById(l.id))
        .filter(Boolean)
        .forEach((s) => io.observe(s as HTMLElement))
    })
    return () => {
      cancel()
      io.disconnect()
    }
  }, [])

  return (
    <header className="nav">
      <div className="container nav__inner">
        <a className="nav__brand" href="#hero" onClick={(e) => { e.preventDefault(); scrollToChapter('hero', { updateHash: true }) }}>
          Tim · 蔡
        </a>
        <nav>
          <ul className="nav__links">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  className={`nav__link${active === l.id ? ' is-active' : ''}`}
                  onClick={() => scrollToChapter(l.id, { updateHash: true })}
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
      </div>
    </header>
  )
}
