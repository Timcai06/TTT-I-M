import { skillRows as rows } from '../content'
import { approvedArtwork } from '../content/approvedArtwork'
import ChapterAtmosphere from './ChapterAtmosphere'
import SkillRowItem from './skills/SkillRowItem'
import LogoLoop from './LogoLoop'
import type { LogoItem } from './LogoLoop'
import { resolveFinalHorizonImage } from '../content/narrativeObjects'

const workingSet = [
  ['01', 'React', 'Interface'],
  ['02', 'TypeScript', 'Language'],
  ['03', 'GSAP', 'Motion'],
  ['04', 'Three.js', 'Graphics'],
  ['05', 'Python', 'Systems'],
  ['06', 'FastAPI', 'Backend'],
  ['07', 'PostgreSQL', 'Data'],
  ['08', 'LangGraph', 'Agents'],
  ['09', 'PyTorch', 'ML'],
  ['10', 'Docker', 'Infra'],
] satisfies ReadonlyArray<readonly [string, string, string]>

const workingSetLogos: LogoItem[] = workingSet.map(([index, name, kind]) => ({
  node: (
    <span className="skills-working-set__mark">
      <span className="skills-working-set__index">{index}</span>
      <strong>{name}</strong>
      <small>{kind}</small>
    </span>
  ),
  title: `${name} — ${kind}`,
}))

/** The chapter's real closing composition, also used when Stack folds back into the room. */
export function SkillsWorkingSet() {
  return (
    <div className="skills-working-set">
      <div className="skills-working-set__header">
        <span>当前工具链 / IN ROTATION</span>
        <small>2026</small>
      </div>
      <h3 className="skills-working-set__title">Working<br /><em>set.</em><span aria-hidden="true">↗</span></h3>
      <LogoLoop
        className="skills-working-set__loop"
        logos={workingSetLogos}
        speed={38}
        direction="left"
        logoHeight={24}
        gap={56}
        hoverSpeed={8}
        // Alpha masking in the chapter CSS lets the actual surface show through.
        fadeOut={false}
        ariaLabel="Tools used across shipped systems"
      />
      <p className="skills-working-set__foot"><span>10 TOOLS</span><span>INTERFACE → SYSTEM</span></p>
    </div>
  )
}

/** Shared chapter heading; the spatial bridge reuses the exact line breaks and emphasis. */
export function SkillsHeading() {
  return (
    <>
      <div className="section__label">Stack — 技术栈</div>
      <h2 className="section__title">
        <span className="split-line"><span className="split-line__inner">The stack</span></span>
        <span className="split-line"><span className="split-line__inner"><em>I work</em> with<span className="skills__period">.</span></span></span>
      </h2>
    </>
  )
}

/**
 * The last Frame photograph is also the first physical surface of Stack.
 * Keeping this as one shared component means the spatial bridge and the real
 * chapter use the same asset, crop and viewport geometry at the handoff.
 */
export function StackContinuityFrame() {
  const image = resolveFinalHorizonImage()
  return (
    <div className="skills-continuity" aria-hidden="true">
      <img src={image.src} srcSet={image.srcSet} sizes={image.sizes} width={image.width} height={image.height} alt="" decoding="async" />
      <div className="skills-continuity__shade" />
      <div className="skills-continuity__trace">
        <span>FRAME / FINAL HORIZON</span>
        <span>IMAGE → INTERFACE</span>
      </div>
    </div>
  )
}

/** Continuous artwork, with an asymmetric inventory and shared tool-loop closing. */
export default function Skills() {
  return (
    <section className="section skills container" id="skills" style={{ position: 'relative' }}>
      <StackContinuityFrame />
      <div className="skills__body" data-chapter-reading-target>
        <div className="skills__folio">
          <div className="approved__index" aria-hidden="true"><span>03</span><span>// STACK</span></div>
          <img className="skills__art" {...approvedArtwork.stack} decoding="async" alt="" aria-hidden="true" />
          <ChapterAtmosphere variant="stack" />
          <div className="skills__opening">
            <SkillsHeading />
            <p className="skills__caption">TOOLS FOR<br />IDEAS THAT<br />RUN.</p>
            <p className="skills__caption skills__caption--right">SAME<br />TOOLS<br />DIFFERENT<br />POSSIBILITIES.</p>
          </div>
          <div className="skills__inventory">
            <div className="skills__list">
              {rows.map((row) => (
                <SkillRowItem key={row.index} row={row} compact />
              ))}
            </div>
            <SkillsWorkingSet />
          </div>
          <div className="skills__edition-note">// BUILD A MORE OPEN TOMORROW</div>
        </div>
      </div>
    </section>
  )
}
