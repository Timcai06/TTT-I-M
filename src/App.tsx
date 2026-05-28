import { useLenis } from './lib/lenis'
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
  useLenis()

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
