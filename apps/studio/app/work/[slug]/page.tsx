import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { works } from '../../../content'

export function generateStaticParams() {
  return works.all().map((work) => ({ slug: work.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const work = works.get(params.slug)
  if (!work) return {}

  return {
    title: work.title,
    description: work.description,
  }
}

export default function WorkDetail({ params }: { params: { slug: string } }) {
  const work = works.get(params.slug)
  if (!work) notFound()

  return (
    <>
      <Link href="/work" className="studio-back">All work</Link>
      <article className="studio-article studio-case-study">
        <header className="studio-article__header">
          <div className="studio-eyebrow">Studio Case Study</div>
          <h1 className="studio-title">{work.title}</h1>
          <p className="studio-copy">{work.summary ?? work.description}</p>
          <dl className="studio-meta-strip" aria-label="Work metadata">
            <div>
              <dt>Year</dt>
              <dd>{work.year ?? work.meta.publishedAt ?? 'Now'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{work.status ?? 'Case study'}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{work.tags.slice(0, 2).join(' / ')}</dd>
            </div>
          </dl>
        </header>

        <section className="studio-case-section">
          <div className="studio-section-label">Overview</div>
          <p>{work.description}</p>
        </section>

        {work.stack?.length ? (
          <section className="studio-case-section">
            <div className="studio-section-label">Stack</div>
            <div className="studio-pills" aria-label="Stack">
              {work.stack.map((item) => (
                <span className="studio-pill" key={item}>{item}</span>
              ))}
            </div>
          </section>
        ) : null}

        {work.notes?.length ? (
          <section className="studio-case-section">
            <div className="studio-section-label">Notes</div>
            <ul className="studio-case-notes">
              {work.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="studio-case-section studio-case-links" aria-label="Project links">
          {work.liveUrl ? <Link href={work.liveUrl}>Open live surface ↗</Link> : null}
          {work.repository ? <Link href={work.repository}>Open repository ↗</Link> : null}
        </section>
      </article>
    </>
  )
}
