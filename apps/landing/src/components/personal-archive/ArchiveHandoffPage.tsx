import { useRef } from 'react'
import { archiveIntro } from '../../content'
import { ProjectsHeader } from '../../chapters/projects/ProjectsIntro'
import FooterContact from '../../chapters/contact/FooterContact'
import FooterMeta from '../../chapters/contact/FooterMeta'
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
    return <div className="archive-handoff-page archive-handoff-page--life life"><LifeIntro /></div>
  }
  if (track === 'life-frame') {
    return <div className="archive-handoff-page archive-handoff-page--frame frame-horizontal">
      <ArchiveTextPanel layout="intro" panel={archiveIntro} preview />
    </div>
  }
  if (track === 'frame-stack') {
    return <div className="archive-handoff-page archive-handoff-page--stack">
      <StackContinuityFrame />
    </div>
  }
  if (track === 'stack-work') {
    return <div className="archive-handoff-page archive-handoff-page--work">
      <div className="projects container">
        <div className="projects__intro">
          <div className="projects__intro-sticky">
            <div className="projects__intro-content"><ProjectsHeader preview /></div>
          </div>
        </div>
      </div>
    </div>
  }
  return <div className="archive-handoff-page archive-handoff-page--contact footer">
    <div className="container footer__content"><div className="footer__inner">
      <FooterContact />
      <FooterMeta clockRef={contactClock} />
    </div></div>
  </div>
}
