import { navChapters } from '../chapters/registry'
import { useChapterState } from '../lib/chapterState'
import { transitionToChapter } from '../lib/chapterTransition'

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))
const studioUrl = import.meta.env.VITE_STUDIO_URL
const blogHref = studioUrl ? new URL('/blog', studioUrl).toString() : '/blog'

export default function Nav() {
  const { activeId } = useChapterState()

  return (
    <header className="nav">
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
                  onClick={() => transitionToChapter(l.id, { updateHash: true })}
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
