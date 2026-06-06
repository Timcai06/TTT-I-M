import Link from 'next/link'
import { works } from '../../content'

export const metadata = {
  title: 'Work',
  description: 'Repository-backed work index for future detail pages.',
}

export default function WorkIndex() {
  return (
    <>
      <section className="studio-hero">
        <div className="studio-eyebrow">Studio / Work</div>
        <h1 className="studio-title">Project detail pages start here.</h1>
        <p className="studio-copy">The list uses the same repository contract that can later point to static data, MDX, or a database adapter.</p>
      </section>
      <section className="studio-grid" aria-label="Works">
        {works.all().map((work) => (
          <Link className="studio-card" href={`/work/${work.slug}`} key={work.slug}>
            <span className="studio-card__meta">{work.tags.slice(0, 2).join(' · ')}</span>
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <span className="studio-pills" aria-label="Tags">
              {work.tags.map((tag) => (
                <span className="studio-pill" key={tag}>{tag}</span>
              ))}
            </span>
            <span className="studio-card__arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
    </>
  )
}
