import Link from 'next/link'
import { builderGraph } from '../../content'

export const metadata = {
  title: 'Builder Graph',
  description: 'Demo Builder Graph surface generated from selected repository evidence.',
}

export default async function GraphPage() {
  const graph = await builderGraph.getSnapshot('user_tim')

  if (!graph) {
    return (
      <section className="studio-hero">
        <div className="studio-eyebrow">Studio / Graph</div>
        <h1 className="studio-title">No graph is available yet.</h1>
        <p className="studio-copy">The graph surface is ready, but this owner has no readable snapshot.</p>
      </section>
    )
  }

  const totals = [
    { label: 'Projects', value: graph.projects.length },
    { label: 'Repositories', value: graph.repositories.length },
    { label: 'Evidence', value: graph.evidence.length },
    { label: 'Signals', value: graph.skillSignals.length },
  ]

  const topSignals = graph.skillSignals
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 8)

  return (
    <>
      <section className="studio-hero studio-hero--editorial studio-graph-hero">
        <div className="studio-eyebrow">Studio / Builder Graph</div>
        <h1 className="studio-title">Your code has a memory. This is the first map.</h1>
        <p className="studio-copy">
          A demo read model generated from selected public project evidence. No GitHub login, token,
          private repository, or raw diff is involved in this surface.
        </p>
        <div className="studio-graph-hero__note" role="note">
          Demo snapshot · {graph.owner.displayName} · Generated {new Date(graph.generatedAt).toLocaleDateString('en-US')}
        </div>
        <Link className="studio-preview-link" href="/graph/preview">
          Try public preview ↗
        </Link>
      </section>

      <section className="studio-graph-stats" aria-label="Builder Graph totals">
        {totals.map((total) => (
          <div className="studio-stat" key={total.label}>
            <div className="studio-stat__label">{total.label}</div>
            <div className="studio-stat__value">{total.value}</div>
          </div>
        ))}
      </section>

      <section className="studio-graph-layout" aria-label="Builder Graph overview">
        <div className="studio-graph-panel studio-graph-panel--wide">
          <div className="studio-section-label">Project Constellation</div>
          <div className="studio-graph-projects">
            {graph.projects.map((project, index) => {
              const repositories = project.repositoryIds
                .map((repositoryId) => graph.repositories.find((repository) => repository.id === repositoryId))
                .filter(Boolean)
              const evidenceCount = project.evidenceIds.length

              return (
                <article className="studio-graph-project" key={project.id}>
                  <span className="studio-graph-project__index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{project.title}</h2>
                    <p>{project.summary ?? 'Imported repository evidence waiting for user narration.'}</p>
                    <div className="studio-pills" aria-label={`${project.title} graph metadata`}>
                      <span className="studio-pill">{project.lifecycle}</span>
                      <span className="studio-pill">{evidenceCount} evidence</span>
                      {repositories.map((repository) => (
                        <span className="studio-pill" key={repository!.id}>{repository!.primaryLanguage ?? 'repo'}</span>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="studio-graph-panel">
          <div className="studio-section-label">Skill Signals</div>
          <div className="studio-signal-list">
            {topSignals.map((signal) => (
              <div className="studio-signal" key={signal.id}>
                <div className="studio-signal__header">
                  <span>{signal.name}</span>
                  <span>{Math.round(signal.weight * 100)}%</span>
                </div>
                <div className="studio-signal__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(signal.weight * 100)}%` }} />
                </div>
                <div className="studio-signal__category">{signal.category}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="studio-graph-layout studio-graph-layout--lower" aria-label="Evidence and growth timeline">
        <div className="studio-graph-panel">
          <div className="studio-section-label">Repository Evidence</div>
          <div className="studio-repo-list">
            {graph.repositories.map((repository) => (
              <Link className="studio-repo-card" href={repository.url} key={repository.id}>
                <span>{repository.fullName}</span>
                <strong>{repository.name}</strong>
                <small>{repository.topics.slice(0, 3).join(' / ') || 'metadata'}</small>
              </Link>
            ))}
          </div>
        </div>

        <div className="studio-graph-panel studio-graph-panel--wide">
          <div className="studio-section-label">Growth Events</div>
          <div className="studio-growth-list">
            {graph.growthEvents.map((event) => (
              <article className="studio-growth-event" key={event.id}>
                <span>{event.kind}</span>
                <h2>{event.title}</h2>
                <p>{event.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
