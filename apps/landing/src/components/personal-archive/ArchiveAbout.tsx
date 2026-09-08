import { useState } from 'react'
import About from '../About'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
import PersonalArchiveBridge from './PersonalArchiveBridge'
import ArchiveChapterBridge from './ArchiveChapterBridge'

export default function ArchiveAbout() {
  const [reading, setReading] = useState(false)
  const mobile = useMobileExperience()
  const reduced = useReducedMotion()
  if (mobile || reduced) return <About />
  return <div className="archive-sequence">
    <PersonalArchiveBridge onReadingChange={setReading} />
    <About decryptEnabled={reading} />
    <ArchiveChapterBridge track="about-life" />
  </div>
}
