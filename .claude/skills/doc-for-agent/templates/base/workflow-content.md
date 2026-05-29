{{FRONTMATTER}}# {{TITLE}}

{{DESCRIPTION}}

Use this workflow when the user wants to initialize or refresh the repository documentation system from a compatible agent surface.

## Workflow

1. Inspect the repository root and infer the repo shape.
2. Use `docagent init --ai <platform>` to wire the repository workflow.
3. Run `docagent refresh --root "<repo-root>" --output-mode quad` when four-view output is required.
4. Use `--dry-run` or `--explain` when the repository shape is unclear.

## Commands

```bash
docagent init --ai <platform>
```

```bash
docagent refresh --root "<repo-root>" --output-mode quad
```

## Installed For

- Platform: {{DISPLAY_NAME}}
- Adapter type: {{INSTALL_TYPE}}

## Post-Install

{{POST_INSTALL_NOTES}}
