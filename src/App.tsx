import { useLenis } from './lib/lenis'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
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
      <Nav />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Footer />
      </main>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
