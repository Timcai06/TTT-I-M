import Link from 'next/link'
import { posts } from '../../content'

export const metadata = {
  title: 'Blog',
  description: 'Studio essays and platform notes.',
}

export default function BlogIndex() {
  return (
    <>
      <section className="studio-hero">
        <div className="studio-eyebrow">Studio / Blog</div>
        <h1 className="studio-title">Notes without landing-runtime weight.</h1>
        <p className="studio-copy">Posts are authored as local MDX files, then rendered through the Studio content repository.</p>
      </section>
      <section className="studio-grid" aria-label="Posts">
        {posts.all().map((post) => (
          <Link className="studio-card" href={`/blog/${post.slug}`} key={post.slug}>
            <span className="studio-card__meta">
              {post.meta.publishedAt} · {post.readingMinutes ?? 1} min
            </span>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </section>
    </>
  )
}
