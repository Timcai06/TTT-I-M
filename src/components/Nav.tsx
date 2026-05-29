import { useEffect, useState } from 'react'
import { getLenis } from '../lib/lenis'
import { navChapters } from '../chapters/registry'
import { onChaptersReady } from '../lib/chaptersReady'

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))

export default function Nav() {
  const [active, setActive] = useState(links[0]?.id ?? '')

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
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

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(el, { offset: -40, duration: 1.4 })
    } else {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="nav">
      <div className="container nav__inner">
        <a className="nav__brand" href="#hero" onClick={(e) => { e.preventDefault(); scrollTo('hero') }}>
          Tim · 蔡
        </a>
        <nav>
          <ul className="nav__links">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  className={`nav__link${active === l.id ? ' is-active' : ''}`}
                  onClick={() => scrollTo(l.id)}
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
