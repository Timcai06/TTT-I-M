import FooterArtwork from './FooterArtwork'
import ContactIris from './ContactIris'
import FooterContact from './FooterContact'
import FooterMeta from './FooterMeta'
import { useFooterReveal } from './useFooterReveal'

/** Contact chapter composition; effects and content remain independently testable. */
export default function Footer() {
  const { clockRef, root, svgRef, wrapRef } = useFooterReveal({ staticArtwork: true })

  return (
    <footer className="footer" id="contact" ref={root}>
      <ContactIris svgRef={svgRef} wrapRef={wrapRef} />
      <FooterArtwork />
      <div className="container footer__content">
        <div className="footer__inner">
          <FooterContact />
          <FooterMeta clockRef={clockRef} />
        </div>
      </div>
    </footer>
  )
}
