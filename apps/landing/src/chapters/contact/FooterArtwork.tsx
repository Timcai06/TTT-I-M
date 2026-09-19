import { approvedArtwork } from '../../content/approvedArtwork'

/** Approved static artwork, shared by the reading page and its room handoff. */
export default function FooterArtwork() {
  return <>
    <img className="footer__art" {...approvedArtwork.contact} decoding="async" alt="" aria-hidden="true" />
    <div className="approved__index" aria-hidden="true"><span>05</span><span>// CONTACT</span></div>
    <p className="footer__art-caption" aria-hidden="true">SAME<br />CURIOSITY<br />DIFFERENT<br />TOMORROW.</p>
  </>
}
