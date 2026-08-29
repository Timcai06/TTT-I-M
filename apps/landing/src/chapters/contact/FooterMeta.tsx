import type { RefObject } from 'react'
import SignatureMark from '../../components/SignatureMark'
import { transitionToChapter } from '../../lib/chapterTransition'

export default function FooterMeta({ clockRef }: { clockRef: RefObject<HTMLTimeElement | null> }) {
  return (
    <div className="footer__meta">
      <div className="footer__meta-left">
        <span className="footer__now">
          <i className="footer__now-dot" aria-hidden="true" />
          Shanghai{' '}
          <time ref={clockRef} className="footer__now-time" aria-label="Local time in Shanghai">--:--</time>
          {' · available for work'}
        </span>
        <span>© 2026 · Tim Cai</span>
      </div>
      <div className="footer__links">
        <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
        <a href="mailto:cairentian932@gmail.com">Email ↗</a>
        <a href="#hero" onClick={(event) => {
          event.preventDefault()
          transitionToChapter('hero', { updateHash: true })
        }}>↑ top</a>
      </div>
      <SignatureMark tone="light" variant="corner" className="footer__signature" />
    </div>
  )
}
