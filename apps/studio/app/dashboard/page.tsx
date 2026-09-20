export const metadata = {
  title: 'Dashboard',
  description: 'Future authenticated publishing dashboard.',
}

/** 发布生命周期。顺序即状态机的推进顺序，rejected 是唯一的回退出口。 */
const states = [
  { name: 'draft', gloss: 'Written, saved, visible to nobody but its author.' },
  { name: 'submitted', gloss: 'Handed over. The author can no longer edit it in place.' },
  { name: 'in review', gloss: 'Someone has it open and is answerable for what happens next.' },
  { name: 'approved', gloss: 'Cleared, but not yet on the public site.' },
  { name: 'published', gloss: 'Readable by anyone with the URL.' },
  { name: 'rejected', gloss: 'Sent back with a reason attached. The only way out that goes backwards.' },
]

export default function Dashboard() {
  return (
    <>
      <section className="studio-hero">
        <div className="studio-eyebrow">Studio / Dashboard</div>
        <h1 className="studio-title">Publishing state is explicit from day one.</h1>
        <p className="studio-copy">
          Auth, database adapters, uploads, moderation and quotas are later-stage work.
          The lifecycle this surface will enforce is already named in full.
        </p>
      </section>

      <section className="catalogue" aria-label="Publish states">
        <div className="catalogue__head">
          <span>Publish lifecycle</span>
          <span>{states.length} states</span>
        </div>
        <div className="catalogue__list">
          {states.map((state, position) => (
            <div className="catalogue__row" key={state.name}>
              <span className="catalogue__name">{state.name}</span>
              <span className="catalogue__body">
                <span className="catalogue__claim">{state.gloss}</span>
              </span>
              <span className="catalogue__num">{String(position + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
