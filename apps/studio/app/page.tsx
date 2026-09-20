import Link from 'next/link'
import { works } from '../content'

/**
 * 首页给每个系统一句英文主张。内容层的 tagline 是中文，这里是编辑层的转写，
 * 只压缩不添加——每一句都能在 projects.ts 的 tagline / highlights 里找到出处。
 */
const CLAIMS: Record<string, string> = {
  bdi: 'Six classes of bridge pathology, segmented out of drone photos.',
  pulsegraph: 'A run leaves its graph behind.',
  earnlytics: '30 companies. 109 filings. Still answerable.',
  'formula-lab': 'Photograph an equation. Prove it once. Export the LaTeX.',
  'modeling-lab': 'Four questions, four models, each keeping its own assumptions.',
  sciscope: 'Answers walk back to the sentence they came from.',
}

const EMAIL = 'cairentian932@gmail.com'

export default function StudioHome() {
  const catalogue = works.all()

  return (
    <>
      <section className="lede">
        <p className="lede__scope">
          <span>Index of six, 2026</span>
          <span>Shanghai</span>
        </p>
        <h1 className="lede__title">
          <span>A system that cannot show</span>
          <span>its work is not finished.</span>
        </h1>

        <p className="lede__copy">
          Case notes from the systems below — bridge inspection, training telemetry,
          earnings answers that walk back to the filing. Written here because the part
          that survives into a README is never the part that mattered.
        </p>

        {/* 证据是页面自己画的，不是别人 UI 的截图：同一套字体、同一条灰阶，
            失败那一段是整条里最亮的，因为它才是这块要说的事。 */}
        <figure className="proof">
          <div className="proof__count">7</div>
          <p className="proof__note">
            of 23 recognition jobs failed on the last Formula Lab run. Fourteen went
            through, one was running, one was still queued.
          </p>
          <div className="proof__bar" aria-hidden="true">
            <span className="proof__seg proof__seg--done" />
            <span className="proof__seg proof__seg--failed" />
            <span className="proof__seg proof__seg--running" />
            <span className="proof__seg proof__seg--queued" />
          </div>
          <figcaption className="proof__caption">Formula Lab, recognition queue</figcaption>
        </figure>
      </section>

      <nav className="catalogue" aria-label="Selected work">
        {catalogue.map((work) => (
          <Link className="catalogue__row" href={`/work/${work.slug}`} key={work.slug}>
            <span className="catalogue__name">{work.title}</span>
            <span className="catalogue__claim">{CLAIMS[work.slug] ?? work.summary}</span>
            <span className="catalogue__stack">
              {(work.stack ?? []).slice(0, 3).join(' · ')}
            </span>
          </Link>
        ))}
      </nav>

      <section className="say" aria-label="Contact">
        <p className="say__lead">Working on something that has to hold up?</p>
        <a className="say__address" href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </section>
    </>
  )
}
