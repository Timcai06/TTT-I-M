import Link from 'next/link'
import {
  createPublicPreviewDraft,
  fetchPublicGitHubPreviewSnapshot,
  type PublicPreviewRepositoryChoice,
} from '@timcai/content'

export const metadata = {
  title: 'Graph Preview',
  description: 'Public Builder Graph preview flow before GitHub authorization.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valuesFromSearchParam(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const repositoryGroups: Array<{ id: PublicPreviewRepositoryChoice['group']; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'fresh', label: 'Fresh Signals' },
  { id: 'forked', label: 'Forked' },
  { id: 'archived', label: 'Archived' },
]

export default async function GraphPreviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const handle = typeof params.handle === 'string' ? params.handle : 'Timcai06'
  const selectedRepositoryIds = valuesFromSearchParam(params.repo)
  const previewResult = await fetchPublicGitHubPreviewSnapshot(handle)

  if (previewResult.status !== 'ready' || !previewResult.snapshot) {
    return (
      <section className="studio-hero studio-hero--editorial studio-preview-hero">
        <div className="studio-eyebrow">Studio / Public Preview</div>
        <h1 className="studio-title">GitHub public preview is not ready.</h1>
        <p className="studio-copy">
          {previewResult.message ?? 'The public GitHub service could not build a preview right now.'}
          {previewResult.rateLimitResetAt ? ` Rate limit resets at ${new Date(previewResult.rateLimitResetAt).toLocaleTimeString('en-US')}.` : ''}
        </p>
        <form className="studio-preview-form" action="/graph/preview" method="get">
          <label>
            <span>GitHub handle</span>
            <input name="handle" defaultValue={previewResult.handle} placeholder="Timcai06" />
          </label>
          <button type="submit">Try another handle</button>
        </form>
        <Link className="studio-preview-link" href="/graph">Back to demo graph ↗</Link>
      </section>
    )
  }

  const draft = createPublicPreviewDraft(previewResult.snapshot, { handle: previewResult.handle, selectedRepositoryIds })

  return (
    <>
      <section className="studio-hero studio-hero--editorial studio-preview-hero">
        <div className="studio-eyebrow">Studio / Public Preview</div>
        <h1 className="studio-title">Try the graph before you connect anything.</h1>
        <p className="studio-copy">
          Type a GitHub handle, choose repositories, and preview the Builder Graph draft. This page reads GitHub
          public profile and public repositories only — no OAuth, no token, no private repository access.
        </p>
        <form className="studio-preview-form" action="/graph/preview" method="get">
          <label>
            <span>GitHub handle</span>
            <input name="handle" defaultValue={draft.handle} placeholder="Timcai06" />
          </label>
          <button type="submit">Refresh preview</button>
        </form>
        <div className="studio-graph-hero__note" role="note">{draft.sourceLabel}</div>
      </section>

      <section className="studio-graph-layout" aria-label="Public preview builder">
        <form className="studio-graph-panel studio-preview-repos" action="/graph/preview" method="get">
          <input type="hidden" name="handle" value={draft.handle} />
          <div className="studio-section-label">Choose Repositories</div>
          <div className="studio-preview-repo-list">
            {repositoryGroups.map((group) => {
              const repositories = draft.repositoryChoices.filter((repository) => repository.group === group.id)
              if (repositories.length === 0) return null

              return (
                <div className="studio-preview-repo-group" key={group.id}>
                  <div className="studio-preview-repo-group__label">{group.label}</div>
                  {repositories.map((repository) => (
                    <label className="studio-preview-repo" key={repository.id}>
                      <input name="repo" type="checkbox" value={repository.id} defaultChecked={repository.selected} />
                      <span>
                        <strong>{repository.title}</strong>
                        <small>{repository.fullName}</small>
                        <em>
                          {repository.primaryLanguage ?? 'metadata'} · {repository.evidenceCount} evidence · ★ {repository.stars} · forks {repository.forks}
                        </em>
                        {repository.readmeExcerpt ? <b>{repository.readmeExcerpt}</b> : null}
                      </span>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
          <button className="studio-preview-button" type="submit">Build draft map</button>
        </form>

        <aside className="studio-graph-panel">
          <div className="studio-section-label">Draft Signals</div>
          <div className="studio-signal-list">
            {draft.topSignals.map((signal) => (
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

      <section className="studio-preview-draft" aria-label="Graph draft preview">
        <div className="studio-section-label">Draft Map For @{draft.handle}</div>
        <div className="studio-preview-draft__grid">
          {draft.projectDrafts.length > 0 ? draft.projectDrafts.map((project, index) => (
            <article className="studio-preview-project" key={project.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <div className="studio-pills" aria-label={`${project.title} preview metadata`}>
                <span className="studio-pill">{project.evidenceCount} evidence</span>
                {project.signals.map((signal) => (
                  <span className="studio-pill" key={signal}>{signal}</span>
                ))}
              </div>
            </article>
          )) : (
            <article className="studio-preview-project studio-preview-project--empty">
              <span>00</span>
              <h2>No repositories selected yet.</h2>
              <p>Choose one or more public repositories, then build a draft map again.</p>
            </article>
          )}
        </div>
      </section>

      <section className="studio-preview-next" aria-label="Next actions">
        <div>
          <div className="studio-section-label">Next Product Step</div>
          <h2>Turn this into a private draft, then decide what becomes public.</h2>
        </div>
        <ul>
          {draft.nextActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        <Link href="/graph">Back to demo graph ↗</Link>
      </section>
    </>
  )
}
