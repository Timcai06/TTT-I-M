import type { Metadata } from 'next'
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
    <article className="studio-hero">
      <div className="studio-eyebrow">{work.meta.publishState} / {work.meta.author}</div>
      <h1 className="studio-title">{work.title}</h1>
      <p className="studio-copy">{work.description}</p>
      <div className="studio-pills" aria-label="Tags">
        {work.tags.map((tag) => (
          <span className="studio-pill" key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  )
}
