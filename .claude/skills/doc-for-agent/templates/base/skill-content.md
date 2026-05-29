{{FRONTMATTER}}# {{TITLE}}

{{DESCRIPTION}}

Use this skill when the user needs a repository documentation system that agents and maintainers can both rely on. The skill package is the product surface; the bundled scripts are the workflow adapter.

## When To Use

- Initialize or refresh a repository documentation system from real repository structure
- Generate or update `AGENTS/`, `docs/`, or the full four-view layout
- Audit drift between commands, manifests, docs, and repository behavior
- Bootstrap agent-facing and maintainer-facing docs before multi-agent or long-lived work

## Core Commands

Initialize repository wiring for this platform:

```bash
docagent init --ai <platform>
```

Refresh the repository documentation system:

```bash
docagent refresh --root "<repo-root>" --output-mode quad
```

Use the generator directly when you need a lower-level workflow:

```bash
python3 {{SCRIPT_REL_PATH}} --root "<repo-root>" --mode refresh --profile layered
```

Preview changes without writing files:

```bash
python3 {{SCRIPT_REL_PATH}} --root "<repo-root>" --mode refresh --dry-run
```

Explain classification reasoning before writing:

```bash
python3 {{SCRIPT_REL_PATH}} --root "<repo-root>" --mode refresh --explain
```

Force a repo type when auto-detection is ambiguous:

```bash
python3 {{SCRIPT_REL_PATH}} --root "<repo-root>" --mode refresh --repo-type cli-tool
```

## Notes

- The engine scans the real repository before generating docs.
- `docagent` is the install + workflow adapter, not the product itself.
- Four-view output writes `dfa-doc/AGENTS/`, `dfa-doc/AGENTS.zh/`, `dfa-doc/handbook/`, and `dfa-doc/handbook.zh/`.
- Four-view structure does not imply bilingual content polish is already complete.
- Manual blocks wrapped in `<!-- doc-for-agent:manual-start -->` and `<!-- doc-for-agent:manual-end -->` are preserved during refresh.

## Installed For

- Platform: {{DISPLAY_NAME}}
- Adapter type: {{INSTALL_TYPE}}

## Post-Install

{{POST_INSTALL_NOTES}}
