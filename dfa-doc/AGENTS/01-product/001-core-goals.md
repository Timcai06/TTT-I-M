# Core Goals

## Top Rules (Read First)

- Rule 1: State repository scope and user value as explicit rules before writing broad product narrative.
- Rule 2: Use lifecycle language (`init/refresh/doctor/migrate`) to keep docs maintainable over one-shot generation.

## Confirmed Facts

- English | [简体中文](README.zh.md)
- This repository is currently best understood as a `unknown`.
- The core product is the reusable agent-documentation workflow, not only the generated files themselves.

## Constraints To Preserve

- Avoid drifting away from the repository's real code, scripts, and naming conventions.
- Prefer stable entrypoints and contracts over broad structural churn.

## Supporting Doc Synthesis (Product)

### Confirmed

- | 技术 | Node CLI, pipx, Codex, Claude Code, i18n | (sources: `docs/05-projects/project-data.md`)
- | 描述 | 面向 Claude Code / Codex / Continue / Copilot 的多代理仓库文档技能包 | (sources: `docs/05-projects/project-data.md`)

### Conflicting

- Supporting docs disagree on runtime/framework (`django`, `fastapi`).

### Unresolved

- No unresolved product items were synthesized from supporting docs.

## Referenced Historical Docs

- `README.md`
- `docs/01-architecture/overview.md`
- `docs/01-architecture/tech-stack.md`
- `docs/02-components/about.md`
- `docs/02-components/cursor.md`
- `docs/02-components/footer.md`
- `docs/02-components/hero.md`
- `docs/02-components/loader.md`
- `docs/02-components/nav.md`
- `docs/02-components/overview.md`
- `docs/02-components/particle-portrait.md`
- `docs/02-components/projects.md`
- `docs/02-components/scroll-indicator.md`
- `docs/02-components/skills.md`
- `docs/03-styles/design-system.md`
- `docs/04-animation/animation-system.md`
- `docs/05-projects/project-data.md`
- `docs/06-scripts/setup-assets.md`
- `docs/README.md`
