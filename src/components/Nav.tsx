import { useEffect, useState } from 'react'
import { getLenis } from '../lib/lenis'

const links = [
  { id: 'hero', label: '00 · Index' },
  { id: 'about', label: '01 · About' },
  { id: 'skills', label: '02 · Stack' },
  { id: 'projects', label: '03 · Work' },
  { id: 'contact', label: '04 · Contact' },
]

export default function Nav() {
  const [active, setActive] = useState('hero')

  useEffect(() => {
    const sections = links.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { threshold: 0.35 }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
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
