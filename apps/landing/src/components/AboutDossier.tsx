import { approvedArtwork } from '../content/approvedArtwork'
import ChapterAtmosphere from './ChapterAtmosphere'

/** Shared opening: the paper and the readable chapter have identical typography. */
export default function AboutDossier() {
  return (
        <div className="about__dossier">
          <div className="approved__index" aria-hidden="true"><span>01</span><span>// ABOUT</span></div>
          <div className="about__dossier-header">
            <div className="section__label">About — 个人简介</div>
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
            <img className="about__portrait-img" {...approvedArtwork.about} decoding="async" alt="Tim's Portrait — Build, Learn, Iterate, Repeat." />
            <ChapterAtmosphere variant="about" />
          </div>

          <dl className="about__dossier-meta">
            <div><dt>PROFILE</dt><dd>TIM CAI</dd></div>
            <div><dt>FOCUS</dt><dd>AI SYSTEMS × INTERACTION</dd></div>
            <div><dt>BASE</dt><dd>SHANGHAI / CN</dd></div>
          </dl>

          <div className="about__edition-note">// A MORE OPEN INTELLIGENCE</div>
        </div>
  )
}
