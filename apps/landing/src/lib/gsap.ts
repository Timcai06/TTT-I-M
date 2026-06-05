import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(ScrollTrigger, Flip)

// Mobile browsers fire resize when the URL bar shows/hides, which would
// otherwise trigger a full ScrollTrigger.refresh() mid-scroll and stutter the
// pinned sections. Ignoring it keeps scrubbing smooth on phones.
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger, Flip }
