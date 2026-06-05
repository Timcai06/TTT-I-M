export const metadata = {
  title: 'Dashboard',
  description: 'Future authenticated publishing dashboard.',
}

const states = ['draft', 'submitted', 'in-review', 'approved', 'published', 'rejected']

export default function Dashboard() {
  return (
    <>
      <section className="studio-hero">
        <div className="studio-eyebrow">Studio / Dashboard</div>
        <h1 className="studio-title">Publishing state is explicit from day one.</h1>
        <p className="studio-copy">
          Auth, database adapters, uploads, moderation, and quotas are later-stage work,
          but the surface already names the lifecycle it will enforce.
        </p>
      </section>
      <section className="studio-grid" aria-label="Publish states">
        {states.map((state) => (
          <div className="studio-card" key={state}>
            <span className="studio-card__meta">publish state</span>
            <h2>{state}</h2>
            <p>Reserved state for future review and publishing workflows.</p>
          </div>
        ))}
      </section>
    </>
  )
}
