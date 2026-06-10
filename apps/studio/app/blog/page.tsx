import Link from 'next/link'
import { posts } from '../../content'

export const metadata = {
  title: 'Blog',
  description: 'Studio essays and platform notes.',
}

export default function BlogIndex() {
  const allPosts = posts.all()
  const [featuredPost, ...archivePosts] = allPosts

  return (
    <>
      <section className="studio-hero studio-hero--editorial">
        <div className="studio-eyebrow">Studio / Blog</div>
        <h1 className="studio-title">Notes from the building table.</h1>
        <p className="studio-copy">
          Essays, platform notes, and quiet records from the systems behind Tim Cai Studio.
        </p>
      </section>

      {featuredPost ? (
        <section className="studio-feature" aria-label="Featured post">
          <div className="studio-section-label">Latest Dispatch</div>
          <Link className="studio-feature__card" href={`/blog/${featuredPost.slug}`}>
            <span className="studio-feature__meta">
              {featuredPost.meta.publishedAt} · {featuredPost.readingMinutes ?? 1} min read
            </span>
            <h2>{featuredPost.title}</h2>
            <p>{featuredPost.excerpt}</p>
            <span className="studio-feature__arrow" aria-hidden="true">Read essay ↗</span>
          </Link>
        </section>
      ) : null}

      <section className="studio-archive" aria-label="Post archive">
        <div className="studio-section-label">Archive</div>
        <div className="studio-archive__list">
          {archivePosts.map((post, index) => (
            <Link className="studio-archive-row" href={`/blog/${post.slug}`} key={post.slug}>
              <span className="studio-archive-row__index">{String(index + 2).padStart(2, '0')}</span>
              <span className="studio-archive-row__meta">
                {post.meta.publishedAt} · {post.readingMinutes ?? 1} min
              </span>
              <span className="studio-archive-row__body">
                <strong>{post.title}</strong>
                <span>{post.excerpt}</span>
              </span>
              <span className="studio-archive-row__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
