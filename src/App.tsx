import { useEffect } from 'react'
import { useLenis } from './lib/lenis'
import { gsap } from './lib/gsap'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ScrollIndicator from './components/ScrollIndicator'
import Nav from './components/Nav'
import { chapters } from './chapters/registry'
import './styles/app.css'

export default function App() {
  // Smooth scroll + scroll-driven side effects (incl. the disable-hover
  // throttle) are owned by useLenis, so there's a single scroll subscription.
  useLenis()

  useEffect(() => {
    const ctx = gsap.context(() => {
      const inner = gsap.utils.toArray<HTMLElement>('.hero__split .split-line__inner')
      if (inner.length < 2) return

      gsap.to(inner[0], {
        xPercent: -45,
        scale: 0.75,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      })

      gsap.to(inner[1], {
        xPercent: 45,
        scale: 0.75,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <>
      <Loader />
      <Cursor />
      <ScrollIndicator />
      <Nav />
      <main>
        {chapters.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </main>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
