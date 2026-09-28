# Documentation

Start with the five current system guides below, then follow the area-specific source and delivery records. The code and running app determine current behavior; dated specifications and reports document the decision or result at their time.

| Guide | Use it for |
| --- | --- |
| [01 · Architecture and page flow](01-architecture.md) | Landing chapters and runtime state, content boundaries, Studio, and cross-zone routing. |
| [02 · Visual system](02-visual-system.md) | Visual language and art direction recorded for the site. |
| [03 · Performance and assets](03-performance-and-assets.md) | Preload, WebGL quality, motion, and asset budgets. |
| [04 · File structure](04-file-structure.md) | Workspace layout, directory ownership, and code reading anchors. |
| [05 · Tests and guards](05-tests-and-guards.md) | Static checks, browser tests, CI, and their coverage limits. |

## Repository areas

| Area | Entry |
| --- | --- |
| Landing experience | [Spatial narrative](landing/experience/spatial-narrative.md), [interaction contracts](landing/experience/interaction-contracts.md), and [desktop archive entry](landing/experience/desktop-archive-entry.md) are design records. Validate implementation details against `apps/landing/`. |
| Personal Archive assets | [Asset specification](landing/assets/personal-space.md), [tool entry](../tools/personal_space/README.md), and [website export pipeline](../tools/personal_space/exporting/README.md). The pipeline has source-model and website-asset side effects. |
| Landing delivery evidence | `landing/delivery/` describes completed work and open acceptance boundaries at their recorded dates. |
| Studio design history | `superpowers/specs/` and `superpowers/plans/` preserve earlier Studio specifications and plans. |
| Builder Graph OS | [Roadmap](../plan/README.md) is a separate future product direction. |
| Earlier PM workflow | [PM archive](pm/README.md) and its board, role sessions, and task cards are historical coordination records; they do not grant current task authority. |

The npm workspaces are `apps/landing`, `apps/studio`, `packages/tokens`, and `packages/content`. Landing owns the visual runtime; Studio owns content routes and does not import Landing's animation or WebGL stack. The root [README](../README.md) lists development commands.

Older `docs/01-architecture/` and `docs/02-components/` links refer to directories folded into the current flat 01–05 guides. Use this index when an old deep link no longer resolves.
