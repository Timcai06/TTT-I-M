import { useRef } from 'react'
import { archiveIntro } from '../../content'
import { ProjectsHeader } from '../../chapters/projects/ProjectsIntro'
import ProjectsBento from '../../chapters/projects/ProjectsBento'
import FooterContact from '../../chapters/contact/FooterContact'
import FooterMeta from '../../chapters/contact/FooterMeta'
import FooterArtwork from '../../chapters/contact/FooterArtwork'
import { LifeIntro } from '../LifeGallery'
import { StackContinuityFrame } from '../Skills'
import ArchiveTextPanel from '../frame/ArchiveTextPanel'
import type { ArchiveTrack } from './chapterTracks'

/**
 * A non-interactive copy of each chapter's real first-screen composition.
 * Content components are shared with the live chapter so line breaks,
 * emphasis, assets and typography cannot drift into a separate title card.
 */
export default function ArchiveHandoffPage({ track }: { track: ArchiveTrack }) {
  const contactClock = useRef<HTMLTimeElement>(null)
  if (track === 'about-life') {
    return <div className="archive-handoff-page archive-handoff-page--life life" data-archive-reading-theme="life"><LifeIntro /></div>
  }
  if (track === 'life-frame') {
    return <div className="archive-handoff-page archive-handoff-page--frame frame-horizontal" data-archive-reading-theme="frame">
      <ArchiveTextPanel layout="intro" panel={archiveIntro} preview />
    </div>
  }
  if (track === 'frame-stack') {
    return <div className="archive-handoff-page archive-handoff-page--stack" data-archive-reading-theme="stack">
      <StackContinuityFrame />
    </div>
  }
  if (track === 'stack-work') {
    // Structurally identical to the live Work first screen, wrapper for wrapper.
    //
    // It used to be the header alone, dropped into `.projects__intro-content` —
    // the slot the bento occupies — with `justify-content: flex-start` bolted on
    // in personal-archive.css to stop it collapsing. Two divergences, and
    // `.projects__intro-sticky` is a centred flex column, so its content height
    // decides where the title sits: the replica pinned the heading at y=335
    // while the live chapter had it at y=146 by the same scroll position. The
    // hand-off is an opacity swap, so that 189px gap was a visible jump of the
    // headline — measured at 12x the median frame-to-frame delta, the only
    // discontinuity of its size in the whole scroll.
    //
    // The bento comes along because it is what gives the sticky column its
    // height. Rendering it also means the six tiles are already on screen when
    // the swap happens instead of appearing with it; the page is `inert` and
    // `aria-hidden`, so the tiles are markup here, not controls. The live
    // chapter wraps the bento in ProjectGlassSurface — that is an effect, not
    // layout, and it stays out of the replica.
    return <div className="archive-handoff-page archive-handoff-page--work" data-archive-reading-theme="work">
      <div className="projects container" data-archive-reading-theme="work">
        <div className="projects__intro">
          <div className="projects__intro-sticky">
            <div className="projects__local-title"><ProjectsHeader preview /></div>
            <div className="projects__intro-content"><ProjectsBento /></div>
          </div>
        </div>
      </div>
    </div>
  }
  return <div className="archive-handoff-page archive-handoff-page--contact footer" data-archive-reading-theme="contact">
    <FooterArtwork />
    <div className="container footer__content"><div className="footer__inner">
      <FooterContact />
      <FooterMeta clockRef={contactClock} />
    </div></div>
  </div>
}
