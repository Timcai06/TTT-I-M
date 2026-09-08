import WorkTransition from '../../components/WorkTransition'
import ArchiveChapterBridge from '../../components/personal-archive/ArchiveChapterBridge'
import { useMobileExperience } from '../../lib/device'
import { useReducedMotion } from '../../lib/motion'
export default function ArchiveWorkTransition() {
  const mobile = useMobileExperience(), reduced = useReducedMotion()
  return mobile || reduced ? <WorkTransition /> : <ArchiveChapterBridge track="stack-work" id="work-transition" />
}
