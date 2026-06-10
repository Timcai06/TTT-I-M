import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MdxContent from '../../../components/MdxContent'
import { posts } from '../../../content'

export function generateStaticParams() {
  return posts.all().map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = posts.get(params.slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = posts.get(params.slug)
  if (!post) notFound()

  return (
    <>
      <Link href="/blog" className="studio-back">All posts</Link>
      <article className="studio-article studio-article--post">
        <header className="studio-article__header">
          <div className="studio-eyebrow">Studio Essay</div>
          <h1 className="studio-title">{post.title}</h1>
          <p className="studio-copy">{post.excerpt}</p>
          <dl className="studio-meta-strip" aria-label="Article metadata">
            <div>
              <dt>Date</dt>
              <dd>{post.meta.publishedAt}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{post.meta.author}</dd>
            </div>
            <div>
              <dt>Read</dt>
              <dd>{post.readingMinutes ?? 1} min</dd>
            </div>
          </dl>
        </header>
        <MdxContent body={post.body} />
      </article>
    </>
  )
}
