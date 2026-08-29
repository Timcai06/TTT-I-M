import { useState } from 'react'
import NumberFlow from '@number-flow/react'
import BorderGlow from '../components/BorderGlow'
import { LiquidMetalButton } from '../shaders/liquid-metal-button/LiquidMetalButton'
import { WORK_TRANSITION_NARRATIVE } from '../core/narrative/index.ts'
import { visualEffectManifest } from '../shared/effects/index.ts'
import './visual-lab.css'

function EffectCatalog() {
  return (
    <div className="visual-lab__effect-grid">
      {visualEffectManifest.map((effect) => (
        <article className="visual-lab__effect" key={effect.id}>
          <header>
            <span>{effect.chapter}</span>
            <strong>{effect.contextCost === 0 ? 'DOM' : `${effect.contextCost} GL`}</strong>
          </header>
          <h3>{effect.id}</h3>
          <dl>
            <div><dt>Trigger</dt><dd>{effect.trigger}</dd></div>
            <div><dt>Fallback</dt><dd>{effect.fallback}</dd></div>
            <div><dt>Motion</dt><dd>{effect.reducedMotion}</dd></div>
            <div><dt>License</dt><dd>{effect.license}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  )
}

function NarrativeMap() {
  const phases = WORK_TRANSITION_NARRATIVE.phases
  const gate = WORK_TRANSITION_NARRATIVE.gate

  return (
    <div className="visual-lab__narrative" aria-label="Work transition narrative timeline">
      <div className="visual-lab__narrative-track" aria-hidden="true">
        {phases.map((phase) => (
          <span
            key={phase.id}
            style={{
              insetInlineStart: `${phase.enter * 100}%`,
              inlineSize: `${(phase.exit - phase.enter) * 100}%`,
            }}
          />
        ))}
        <i style={{ insetInlineStart: `${gate.progress * 100}%` }} />
      </div>
      <ol>
        {phases.map((phase) => (
          <li key={phase.id}>
            <span>{phase.id}</span>
            <code>{phase.enter.toFixed(3)} → {phase.exit.toFixed(3)}</code>
          </li>
        ))}
        <li><span>explicit CTA gate</span><code>{gate.progress.toFixed(3)}</code></li>
      </ol>
      <p>{WORK_TRANSITION_NARRATIVE.desktopHeight} desktop · {WORK_TRANSITION_NARRATIVE.mobileHeight} mobile</p>
    </div>
  )
}

function PrimitiveStage() {
  const [metric, setMetric] = useState(46)

  return (
    <div className="visual-lab__primitive-grid">
      <BorderGlow className="visual-lab__glow-card" animated>
        <span>Evidence metric</span>
        <strong aria-label={`${metric} verified checks`}>
          <NumberFlow value={metric} aria-hidden="true" />
        </strong>
        <button type="button" onClick={() => setMetric((value) => value === 46 ? 22 : 46)}>
          Toggle verified value
        </button>
      </BorderGlow>

      <div className="visual-lab__metal-stage">
        <span>Explicit handoff control</span>
        <LiquidMetalButton text="ENTER THE WORK" variant="pill" rendering="colored" />
      </div>
    </div>
  )
}

export default function VisualLab() {
  return (
    <main className="visual-lab">
      <header className="visual-lab__header">
        <div>
          <p>TTT I&apos;M / DEV ONLY</p>
          <h1>Visual systems lab</h1>
        </div>
        <a href="/">Return to narrative</a>
      </header>

      <section>
        <div className="visual-lab__section-heading">
          <span>01</span>
          <h2>Production primitives</h2>
        </div>
        <PrimitiveStage />
      </section>

      <section>
        <div className="visual-lab__section-heading">
          <span>02</span>
          <h2>Narrative contract</h2>
        </div>
        <NarrativeMap />
      </section>

      <section>
        <div className="visual-lab__section-heading">
          <span>03</span>
          <h2>Effect manifest</h2>
        </div>
        <EffectCatalog />
      </section>
    </main>
  )
}
