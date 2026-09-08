/** Shared opening: the paper and the readable chapter have identical typography. */
export default function AboutDossier() {
  return (
        <div className="about__dossier">
          <div className="about__dossier-header">
            <div className="section__label">About — 自述</div>
            <div className="about__dossier-kicker">IDENTITY DOSSIER / 00—06</div>
          </div>

          <div className="about__dossier-copy">
            <h2 className="about__lead">
              <span>上海大一在读，</span>
              <span>我把模型、数据和交互</span>
              <span><em>做成能运行、能复盘的</em></span>
              <span><em>系统。</em></span>
            </h2>
            <p className="about__dossier-summary">
              我关心的不只是模型有没有跑通，而是证据从哪来、运行时发生了什么，以及别人能不能复现。
            </p>
          </div>

          <div className="about__portrait-frame">
            <div className="about__portrait-glow" />
            <img className="about__portrait-img" src="/portrait/about_me.jpg" alt="Tim's Portrait" />
            <div className="about__portrait-vignette" />
            <div className="about__portrait-meta">PROFILE CAPTURE → V3.0</div>
          </div>

          <dl className="about__dossier-meta">
            <div><dt>PROFILE</dt><dd>TIM CAI</dd></div>
            <div><dt>FOCUS</dt><dd>AI SYSTEMS × INTERACTION</dd></div>
            <div><dt>BASE</dt><dd>SHANGHAI / CN</dd></div>
          </dl>

          <div className="about__decrypt-hint" aria-hidden="true">
            <span>MOVE TO DECRYPT</span>
            <span>移动以解密</span>
          </div>
        </div>
  )
}
