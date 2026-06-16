import Link from 'next/link'

const surfaces = [
  {
    href: '/blog',
    title: 'Blog',
    body: 'MDX-ready writing surface for notes and essays, kept separate from the landing runtime.',
  },
  {
    href: '/work',
    title: 'Work',
    body: 'Repository-backed project index and future detail pages for deeper case studies.',
  },
  {
    href: '/graph',
    title: 'Graph',
    body: 'A demo Builder Graph that turns repository evidence into projects, skills, and growth events.',
  },
  {
    href: '/dashboard',
    title: 'Dashboard',
    body: 'Future authenticated publishing surface with explicit publish-state semantics.',
  },
]

export default function StudioHome() {
  return (
    <>
      <section className="studio-hero">
        <div className="studio-eyebrow">Platform / Studio</div>
        <h1 className="studio-title">Quiet content surfaces beside the cinematic landing.</h1>
        <p className="studio-copy">
          The landing stays as the tuned Vite experience. Studio owns SSG/SSR content,
          feeds, metadata, and future publishing workflows without importing GSAP, R3F, or Lenis.
        </p>
      </section>
      <section className="studio-grid" aria-label="Studio surfaces">
        {surfaces.map((surface) => (
          <Link className="studio-card" href={surface.href} key={surface.href}>
            <span className="studio-card__meta">{surface.href}</span>
            <h2>{surface.title}</h2>
            <p>{surface.body}</p>
          </Link>
        ))}
      </section>
    </>
  )
}
