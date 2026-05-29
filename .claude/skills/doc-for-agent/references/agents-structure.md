# AGENTS Structure

This skill creates a lean `AGENTS/` directory for coding agents.

For the longer-term layered profile inspired by `/Users/tim/BDI/AGENTS`, see `references/layered-agents-blueprint.md`.

## File intent

### `AGENTS/README.md`

Short index explaining what each document covers.

### `AGENTS/product.md`

Capture:

- product purpose
- target users
- main user journeys
- output expectations

### `AGENTS/architecture.md`

Capture:

- system boundaries
- frontend/backend split
- storage model
- routing model
- result flow

### `AGENTS/frontend.md`

Capture:

- frontend framework
- route structure
- key state owners
- important components
- view semantics

### `AGENTS/backend.md`

Capture:

- backend framework
- important services
- model/result contract
- storage/output rules
- integration constraints

### `AGENTS/workflows.md`

Capture:

- install commands
- run/dev commands
- lint/test/build commands
- release or verification commands

### `AGENTS/glossary.md`

Capture:

- project-specific vocabulary
- canonical labels
- terms that often drift
- agent-facing naming rules

## Writing rules

- Write against the real repository
- Prefer bullets and short sections
- Avoid restating generic framework knowledge
- Make commands copyable
- Record real constraints and actual paths
