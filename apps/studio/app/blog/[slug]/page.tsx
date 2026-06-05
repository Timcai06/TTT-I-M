import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
    <article className="studio-hero">
      <div className="studio-eyebrow">{post.meta.publishedAt} / {post.meta.author}</div>
      <h1 className="studio-title">{post.title}</h1>
      <p className="studio-copy">{post.body}</p>
    </article>
  )
}
