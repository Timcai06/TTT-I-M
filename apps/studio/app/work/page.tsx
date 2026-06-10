import Link from 'next/link'
import { works } from '../../content'

export const metadata = {
  title: 'Work',
  description: 'Repository-backed work index for future detail pages.',
}

export default function WorkIndex() {
  return (
    <>
      <section className="studio-hero studio-hero--editorial">
        <div className="studio-eyebrow">Studio / Work</div>
        <h1 className="studio-title">Case notes for systems that shipped.</h1>
        <p className="studio-copy">
          A quieter index of projects, prototypes, and infrastructure decisions behind the public portfolio.
        </p>
      </section>

      <section className="studio-work-ledger" aria-label="Work archive">
        <div className="studio-section-label">Selected Systems</div>
        <div className="studio-work-ledger__list">
          {works.all().map((work, index) => (
            <Link className="studio-work-row" href={`/work/${work.slug}`} key={work.slug}>
              <span className="studio-work-row__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="studio-work-row__meta">
                {work.year ?? work.meta.publishedAt ?? 'Now'} · {work.status ?? 'Case study'}
              </span>
              <span className="studio-work-row__body">
                <strong>{work.title}</strong>
                <span>{work.summary ?? work.description}</span>
                <span className="studio-pills" aria-label="Tags">
                  {work.tags.map((tag) => (
                    <span className="studio-pill" key={tag}>{tag}</span>
                  ))}
                </span>
              </span>
              <span className="studio-work-row__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
