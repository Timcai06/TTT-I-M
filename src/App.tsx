import { useEffect } from 'react'
import { useLenis } from './lib/lenis'
import { gsap } from './lib/gsap'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ScrollIndicator from './components/ScrollIndicator'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import LifeGallery from './components/LifeGallery'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Footer from './components/Footer'
import './styles/app.css'

export default function App() {
  useEffect(() => {
    let scrollTimeout: number
    const onScroll = () => {
      if (!document.body.classList.contains('disable-hover')) {
        document.body.classList.add('disable-hover')
      }
      clearTimeout(scrollTimeout)
      scrollTimeout = window.setTimeout(() => {
        document.body.classList.remove('disable-hover')
      }, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

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
        <Hero />
        <About />
        <LifeGallery />
        <Skills />
        <Projects />
        <Footer />
      </main>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
