# Layered AGENTS Blueprint

This document captures the next-step template direction for `doc-for-agent`.
It is based on what worked well in `/Users/tim/BDI/AGENTS`: agent docs stop being a flat summary and become a persistent project operating system.

## Why This Exists

The current `doc-for-agent` output is strong at bootstrap:

- `product.md`
- `architecture.md`
- `frontend.md`
- `backend.md`
- `workflows.md`
- `glossary.md`
- `README.md`

That works well for:

- new repositories
- small to medium repos
- fast onboarding
- agent refresh against code reality

It becomes weaker when a project is:

- long-lived
- phase-driven
- cross-functional
- evolving under repeated agent sessions

In those cases, agents need more than a static summary. They need:

- a reading order
- a clear fact hierarchy
- execution state
- durable lessons
- explicit compatibility rules

## Core Insight

The BDI-style structure is valuable because it externalizes project cognition into files:

- what the project is
- what must not break
- what phase the project is in
- what should happen next
- what was already learned the hard way

This reduces:

- goal drift
- repeated mistakes
- document ambiguity
- agent-to-agent handoff loss

## Proposed Profiles

`doc-for-agent` should support two documentation profiles.

### 1. Bootstrap Profile

Use for early-stage repos and light agent onboarding.

Suggested output:

- `AGENTS/README.md`
- `AGENTS/product.md`
- `AGENTS/architecture.md`
- `AGENTS/frontend.md`
- `AGENTS/backend.md`
- `AGENTS/workflows.md`
- `AGENTS/glossary.md`

This is the current default.

### 2. Layered Profile

Use for multi-phase repositories, productized apps, and long-running agent collaboration.

Suggested output:

```text
AGENTS/
├── 00-entry/
│   └── AGENTS.md
├── 01-product/
│   ├── 001-core-goals.md
│   ├── 002-prd.md
│   └── 003-app-flow.md
├── 02-architecture/
│   ├── 004-tech-stack.md
│   ├── 005-frontend-guidelines.md
│   ├── 006-backend-structure.md
│   └── 007-architecture-compatibility.md
├── 03-execution/
│   └── 008-implementation-plan.md
└── 04-memory/
    ├── 009-progress.md
    └── 010-lessons.md
```

This profile treats `AGENTS/` as a durable operating layer, not just onboarding notes.

## File Roles In The Layered Profile

### `00-entry/AGENTS.md`

Purpose:

- define reading order
- define rules before implementation
- define current project phase
- point to the canonical fact sources

This is the most important addition. It turns the doc set into a navigable system.

### `01-product/*`

Purpose:

- capture target outcome
- define scope
- define user flow and value

The key change from the flat profile is separation:

- core goals stay stable
- PRD can evolve
- app flow stays UX-oriented

### `02-architecture/*`

Purpose:

- capture stack facts
- define UI/UX rendering constraints
- define backend layering
- define compatibility and protocol boundaries

This category should emphasize what agents must preserve, not only what the stack contains.

### `03-execution/*`

Purpose:

- define phase order
- define current milestone
- define "done" conditions
- keep the next work explicit

This prevents agents from inventing the wrong next step.

### `04-memory/*`

Purpose:

- preserve confirmed project state
- preserve lessons that should survive context resets

This is where the system moves from documentation into persistent agent memory.

## What Should Change In The Generator

### Profile Selection

Add a profile abstraction such as:

- `--profile bootstrap`
- `--profile layered`

Default can stay `bootstrap` for safety.

### Builder Layout

Replace the assumption that one repo type maps to one fixed flat file set.

Instead:

- repo classification decides the repository shape
- profile decides the documentation topology
- builders render files for that topology

## Example Decision Model

Recommended rules:

- default to `bootstrap`
- prefer `layered` when the repo has strong product and execution signals
- prefer `layered` when the repo already contains plan, docs, or AGENTS subfolders
- prefer `layered` when frontend, backend, and workflow complexity all coexist

Useful signals:

- `plan/`, `docs/`, `specs/`, `roadmap/`
- multiple runnable surfaces
- app + backend + model/inference layers
- history or progress tracking files
- explicit phased work in README

## Refresh Strategy Differences

The layered profile needs a stricter refresh strategy than the flat profile.

Recommended behavior:

- preserve manual blocks everywhere
- preserve file-local memory sections in `04-memory/`
- regenerate architecture and workflow sections more aggressively
- keep entrypoint rules stable unless explicitly changed

Special note:

- `009-progress.md` should prefer current confirmed state
- `010-lessons.md` should prefer human-maintained content

## Migration Path

The generator should support a safe path from flat to layered.

Recommended migration behavior:

1. Read existing flat docs.
2. Map content into layered buckets.
3. Create layered files with generated starter text.
4. Carry forward protected manual blocks.
5. Leave a migration note in the new entrypoint file.

This avoids forcing users to rewrite everything by hand.

## Near-Term Implementation Plan

### Phase 1

- introduce profile selection
- keep current flat profile unchanged
- add a layered builder scaffold

### Phase 2

- add a BDI-like fixture
- snapshot the layered output
- test refresh behavior for memory files

### Phase 3

- support flat-to-layered migration
- improve heuristics for phased product repos
- improve workflow extraction for layered execution docs

## Non-Goals

This profile should not try to:

- replace the repository README
- become a full project management suite
- track every transient session note
- generate fake history

Memory files should stay grounded in confirmed facts and deliberate human edits.

## Recommendation

The future of `doc-for-agent` is likely not "one better template".
It is "multiple documentation operating modes" with a clean upgrade path:

- bootstrap when speed matters
- layered when durability matters

That preserves the current strength of the skill while opening a path toward the more powerful BDI-style workflow.
