import { archiveIntro, archiveOutro, archiveThemes } from '../content'
import ArchiveTextPanel from './frame/ArchiveTextPanel'
import ArchiveThemeSection from './frame/ArchiveThemeSection'

export default function Frame() {
  return (
    <section className="frame-horizontal" id="frame" data-horizontal-section>
      <ArchiveTextPanel layout="intro" panel={archiveIntro} />
      {archiveThemes.map((theme, index) => (
        <ArchiveThemeSection key={theme.id} theme={theme} themeIndex={index} />
      ))}
      <ArchiveTextPanel layout="outro" panel={archiveOutro} />
    </section>
  )
}
