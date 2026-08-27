import { lazy, Suspense, useState, type CSSProperties } from 'react'
import { navChapters } from '../chapters/registry'
import { useChapterState } from '../lib/chapterState'
import { transitionToChapter } from '../lib/chapterTransition'
import { useSound } from '../lib/sound/SoundProvider'
import type { StaggeredSectionMenuItem } from './StaggeredSectionMenu'

const StaggeredSectionMenu = lazy(() => import('./StaggeredSectionMenu'))

/**
 * 字符翻转 hover（lukebaffait 滚动门模式）：每个字符与它的 ::after 副本
 * （content: attr(data-ch)）上下堆叠，hover 时整列上移一字高，
 * transition-delay 按 --ch-i 级联出波浪感。第二份用伪元素而非真实节点，
 * 让 innerText 保持单份语义 —— 复制、a11y、e2e 文本断言都不受影响。
 */
function rollChars(label: string) {
  return (
    <span className="nav__link-roll">
      {label.split('').map((ch, i) => {
        const display = ch === ' ' ? ' ' : ch
        return (
          <span
            className="nav__link-ch"
            key={`${ch}-${i}`}
            data-ch={display}
            style={{ '--ch-i': i } as CSSProperties}
          >
            {display}
          </span>
        )
      })}
    </span>
  )
}

const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))
const sectionSummaries: Record<string, string> = {
  hero: 'Landing signal',
  about: 'Profile / systems',
  frame: 'Visual archive',
  skills: 'Tools I trust',
  projects: 'Six things I made',
  contact: 'Build something',
}
const sectionMenuItems: StaggeredSectionMenuItem[] = navChapters.map((chapter) => {
  const [index = '', label = chapter.nav.label] = chapter.nav.label.split(/\s*·\s*/)
  return {
    id: chapter.id,
    index,
    label,
    summary: sectionSummaries[chapter.id] ?? chapter.progress?.name ?? label,
  }
})
// In prod the blog is served same-origin at /blog (vercel.json proxies it to the
// studio origin). Linking to the relative path keeps the user on the main domain
// (同域) AND enables cross-document View Transitions, which require same-origin
// navigation. Only dev points cross-origin at the local studio dev server.
const devStudioUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_STUDIO_URL ?? 'http://localhost:5174')
  : undefined
const blogHref = devStudioUrl ? new URL('/blog', devStudioUrl).toString() : '/blog'
const sectionSocialItems = [
  { label: 'GitHub', href: 'https://github.com/Timcai06' },
  { label: 'Email', href: 'mailto:cairentian932@gmail.com' },
  { label: 'Blog', href: blogHref },
]

export default function Nav() {
  const { activeId } = useChapterState()
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuHasOpened, setMenuHasOpened] = useState(false)

  const handleChapterClick = (id: string) => {
    setMenuOpen(false)
    transitionToChapter(id, { updateHash: true })
  }

  return (
    <>
      <header className={`nav${menuOpen ? ' nav--menu-open' : ''}`}>
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
                    aria-label={l.label}
                  >
                    {rollChars(l.label)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav__meta">
            <div className="nav__counter">
              SHA <span style={{ color: 'var(--accent)' }}>● </span>1
              <span style={{ marginLeft: 8 }}>—</span> ZJGSU
            </div>
            <button
              className="nav__sound-button"
              type="button"
              aria-label={soundEnabled ? 'Turn portfolio sound off' : 'Turn portfolio sound on'}
              aria-pressed={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <span className="nav__sound-indicator" aria-hidden="true" />
              <span className="nav__sound-label nav__sound-label--long">Sound {soundEnabled ? 'On' : 'Off'}</span>
              <span className="nav__sound-label nav__sound-label--short">Snd</span>
            </button>
            <button
              className="nav__menu-button"
              type="button"
              aria-label={menuOpen ? 'Close section menu' : 'Open section menu'}
              aria-expanded={menuOpen}
              aria-controls="section-map"
              onClick={() => {
                setMenuHasOpened(true)
                setMenuOpen((open) => !open)
              }}
            >
              <span className="nav__menu-text">{menuOpen ? 'Close' : 'Map'}</span>
              <span className="nav__menu-plus" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {menuHasOpened && (
        <Suspense fallback={null}>
          <StaggeredSectionMenu
            activeId={activeId}
            items={sectionMenuItems}
            socialItems={sectionSocialItems}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onSelect={handleChapterClick}
          />
        </Suspense>
      )}
    </>
  )
}
