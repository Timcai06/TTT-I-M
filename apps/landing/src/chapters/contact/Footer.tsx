import ASCIIText from '../../components/ASCIIText'
import FooterLiquidCursor from '../../components/FooterLiquidCursor'
import ContactIris from './ContactIris'
import FooterContact from './FooterContact'
import FooterMeta from './FooterMeta'
import { useFooterReveal } from './useFooterReveal'

/** Contact chapter composition; effects and content remain independently testable. */
export default function Footer() {
  const { clockRef, liquidRef, root, svgRef, wrapRef } = useFooterReveal()

  return (
    <footer className="footer" id="contact" ref={root}>
      <ContactIris svgRef={svgRef} wrapRef={wrapRef} />
      <FooterLiquidCursor controllerRef={liquidRef} />
      <div className="container footer__content">
        <div className="footer__ascii" aria-hidden="true">
          <ASCIIText
            text="LET'S BUILD"
            asciiFontSize={7}
            textFontSize={260}
            textColor="#2d0806"
            planeBaseHeight={8.2}
            enableWaves
            gradient="linear-gradient(90deg, #240706 0%, #8f2117 52%, #123f3c 100%)"
          />
        </div>
        <div className="footer__inner">
          <FooterContact />
          <FooterMeta clockRef={clockRef} />
        </div>
      </div>
    </footer>
  )
}
