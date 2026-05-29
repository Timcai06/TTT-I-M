# Multi-Platform Distribution Blueprint

This document describes how `doc-for-agent` can evolve from a Codex-first skill into a multi-platform agent product.

The goal is not to abandon Codex.
The goal is to separate:

- the documentation-generation engine
- the platform-specific skill or workflow wrapper
- the installer and release surface

## Product Goal

`doc-for-agent` should eventually ship as:

- a repository/documentation engine that scans codebases and generates `AGENTS/`
- a set of platform adapters for Codex, Claude Code, Continue, Cursor-style skill folders, and workflow-based platforms
- a simple installer CLI so users do not need to manually copy files into hidden folders

The product being distributed is not "a Codex skill file".
It is "agent-facing project documentation generation" packaged for multiple assistant ecosystems.

## Core Product Layers

### 1. Engine Layer

This is the real product core.

Current engine pieces already exist:

- `doc-for-agent/scripts/init_agents_docs.py`
- `doc-for-agent/scripts/doc_for_agent_generator/analysis.py`
- `doc-for-agent/scripts/doc_for_agent_generator/builders.py`
- `doc-for-agent/scripts/doc_for_agent_generator/markdown.py`

This layer should stay platform-neutral.

Responsibilities:

- classify repository shape
- choose documentation profile
- generate or refresh `AGENTS/`
- preserve manual blocks
- explain repo-type reasoning

### 2. Adapter Layer

This layer explains the engine to a specific assistant.

Examples:

- Codex: `.codex/skills/doc-for-agent/SKILL.md`
- Claude Code: `.claude/skills/doc-for-agent/SKILL.md`
- Continue: `.continue/skills/doc-for-agent/SKILL.md`
- GitHub Copilot: `.github/prompts/doc-for-agent/PROMPT.md`
- workflow-oriented platforms: `Workflow.md`, `PROMPT.md`, or equivalent

The adapter layer should vary by:

- destination folder
- file name
- frontmatter format
- invocation style
- user-facing wording

The adapter layer should not duplicate engine logic.

### 3. Installer Layer

This layer makes the product easy to adopt.

The installer should:

- detect local assistant folders when possible
- install a specific platform adapter
- install all supported adapters when requested
- copy bundled references and scripts into the correct target path
- optionally fetch newer release assets

This is the layer that turns a useful repository into a distributable product.

### 4. Release Layer

This layer makes the product discoverable and updateable.

Recommended channels:

- GitHub repository for source and direct installs
- GitHub Releases for versioned bundles
- package distribution for the installer CLI
- a small landing page or docs site

## Proposed Repository Shape

Keep the current repository recognizable, but introduce an explicit split between engine and adapters.

```text
DocForAgent_skill/
├── README.md
├── LICENSE
└── doc-for-agent/
    ├── SKILL.md
    ├── agents/
    │   └── openai.yaml
    ├── scripts/
    │   ├── init_agents_docs.py
    │   └── doc_for_agent_generator/
    ├── templates/
    │   ├── base/
    │   │   ├── skill-content.md
    │   │   └── workflow-content.md
    │   └── platforms/
    │       ├── codex.json
    │       ├── claudecode.json
    │       ├── continue.json
    │       ├── copilot.json
    │       └── ...
    ├── installer/
    │   ├── python/
    │   └── or-node-wrapper/
    ├── tests/
    └── references/
        ├── agents-structure.md
        ├── layered-agents-blueprint.md
        └── multi-platform-distribution-blueprint.md
```

## Platform Template Schema

Each supported platform should be described by a small config file instead of hardcoded branching.

Recommended fields:

- `platform`
- `display_name`
- `install_type`
- `folder_structure.root`
- `folder_structure.skill_path`
- `folder_structure.filename`
- `adapter_kind`
- `frontmatter`
- `default_title`
- `default_description`
- `quick_reference`
- `script_relpath`
- `post_install_notes`

### Field Intent

- `install_type`
  Examples: `skill`, `workflow`, `prompt`
- `adapter_kind`
  Controls whether the base content renders as a skill-style file or workflow-style file
- `folder_structure`
  Decides where the installer writes files
- `script_relpath`
  Lets the adapter point to the bundled engine entrypoint correctly for that platform

## Adapter Content Strategy

Each platform adapter should explain the same capability with slightly different shell language.

Stable content across platforms:

- what `doc-for-agent` does
- when to use it
- how to generate or refresh `AGENTS/`
- how to choose `bootstrap` vs `layered`
- how to use `--dry-run`, `--repo-type`, `--explain`

Platform-specific differences:

- path prefix
- command examples
- trigger phrasing
- whether the platform expects auto-activation or explicit workflow invocation

## CLI Surface

The installer CLI should be separate from the repo-scanning engine CLI.

### Engine CLI

This already exists and should stay close to the current Python interface:

```bash
doc-for-agent generate --root /path/to/repo --mode refresh --profile layered
```

or keep the current direct entrypoint:

```bash
python3 doc-for-agent/scripts/init_agents_docs.py --root /path/to/repo --mode refresh
```

### Installer CLI

This is the missing product-distribution surface.

Recommended commands:

```bash
docagent install --ai codex
docagent init --ai claudecode
docagent install --ai continue
docagent install --ai copilot
docagent install --ai all
docagent doctor
docagent versions
docagent update
```

Recommended behavior:

- `install`
  writes adapter files into the current project or user config area
- `doctor`
  detects supported assistant folders and reports what can be installed
- `versions`
  shows local engine version and latest release version
- `update`
  refreshes adapters and bundled assets

## Python vs npm Distribution

This project is currently Python-native at the engine layer.

That means you have two reasonable distribution patterns.

### Option 1. Python-First

Ship the installer as:

- `pipx install docagent`
- `uv tool install docagent`

Pros:

- stays close to the existing engine
- one language for the core
- lower maintenance

Cons:

- some frontend-heavy users expect npm more readily than Python tooling

### Option 2. Thin npm Installer

Ship a tiny Node CLI that:

- installs adapters
- copies bundled assets
- optionally shells out to Python when generation is invoked

Pros:

- very familiar install story for web and AI-coding-tool users
- matches the distribution pattern used by `ui-ux-pro-max-skill`

Cons:

- adds a second runtime and release surface

### Recommendation

For `doc-for-agent`, the strongest near-term path is:

- keep the engine Python-first
- add a Python installer first
- only add an npm wrapper if distribution friction becomes a real adoption bottleneck

## Skill vs Workflow Product Modes

Do not assume every platform should receive the same `SKILL.md`.

Recommended split:

- `Skill mode`
  Platforms that support persistent skills and auto-activation
- `Workflow mode`
  Platforms that prefer explicit invocation, prompts, or slash-command style execution

This is one of the biggest lessons from `ui-ux-pro-max-skill`.
The product is one capability, but the shell differs by platform.

## Release Strategy

Phase the rollout instead of trying to support every platform at once.

### Phase 1

- Codex remains the reference adapter
- add platform template abstraction
- add one second platform, preferably Claude Code or Continue

### Phase 2

- add installer CLI
- add `doctor` and `install --ai all`
- version release bundles

### Phase 3

- add workflow-mode adapters such as Copilot-style prompt output
- add better documentation and screenshots
- add optional landing page or docs site

## Validation Strategy

Distribution should have its own test surface.

Recommended checks:

- template render tests for each platform config
- install-path tests for each adapter
- smoke tests that generated files reference the correct bundled script path
- snapshot tests for adapter output

Keep these separate from repository-classification tests.

## What Not To Do

Do not:

- fork the engine logic per platform
- let platform adapters invent different capability claims
- make Codex the only maintained adapter while pretending the product is cross-platform
- tie distribution strategy to a single package manager too early

## Immediate Next Step

The best next implementation step is not a full installer.
It is:

1. add `templates/base/` and `templates/platforms/`
2. define 2-3 platform configs
3. render adapters from templates
4. only then decide whether the installer ships through Python, npm, or both

That keeps the architecture honest: engine first, adapters second, installer third.
