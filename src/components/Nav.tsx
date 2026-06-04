import { navChapters } from '../chapters/registry'
import { scrollToChapter } from '../lib/chapterScroll'
import { useChapterState } from '../lib/chapterState'

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))

export default function Nav() {
  const { activeId } = useChapterState()

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
                  className={`nav__link${activeId === l.id ? ' is-active' : ''}`}
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
