export default function FooterContact() {
  return (
    <>
      <div className="footer__kicker section__label">GET IN TOUCH · 联系方式</div>
      <h2 className="footer__title">
        <span className="split-line"><span className="split-line__inner">Let&apos;s build</span></span>
        <span className="split-line">
          <span className="split-line__inner">something</span>
        </span>
        <span className="split-line"><span className="split-line__inner">that <em>lasts.</em></span></span>
      </h2>
      <div className="contact__cta-field">
        <div className="contact__items">
          <a href="mailto:cairentian932@gmail.com" className="contact__btn contact__btn--email">
            <img className="contact__btn-icon" src="/design/approved-2d/envelope.svg" width="24" height="24" alt="" aria-hidden="true" />
            <span className="contact__btn-text">cairentian932@gmail.com</span>
            <span className="contact__btn-arrow">↗</span>
          </a>
          <a href="https://github.com/Timcai06" target="_blank" rel="noopener noreferrer" className="contact__btn contact__btn--github">
            <svg className="contact__btn-icon" width="24" height="24" aria-hidden="true"><use href="/icons.svg#github-icon" /></svg>
            <span className="contact__btn-text">github.com/Timcai06</span>
            <span className="contact__btn-arrow">↗</span>
          </a>
        </div>
      </div>
    </>
  )
}
