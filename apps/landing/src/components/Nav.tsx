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
