# Documentation migration audit

This table records the first documentation move from the `3900ff4` baseline. It is a historical before/after record for this batch; later edits to the destination files do not change these recorded hashes.

- [Complete path and SHA-256 table](document-moves.tsv): 149 tracked files — 16 Builder Graph roadmap files, 128 Personal Archive PM files (including one JSON baseline), and five architecture guides.
- 77 files were byte-identical pure moves. The other 72 changed only for relative-link/path rebasing, except `04-file-structure.md`, which also records the current production-tool and future project-film directory conventions.
- Relative Markdown links were resolved from each original file, mapped to the new destination, and rebased from the new source. Backlinks in the root/doc indexes and three Landing source comments were updated to their new locations. An independent comparison against the `3900ff4` baseline checked all 282 tracked local Markdown links: every current link resolves to the mapped original target, with zero mismatches or newly missing targets.
- 37 local links were already missing before the move: 33 references to ignored `output/pm/` evidence, one ignored Blender source, and three older broken links in `tools/personal_space/legacy/README-history.md`. Their old source, literal target, and resolved location are recorded in [the unresolved historical-link inventory](unresolved-historical-links.tsv). Those links were not counted as move regressions or repaired in this batch.
- Eleven literal absolute `/Users/tim/DEV/TTT I'M/portfolio/docs/pm/...` paths across eight archived reports remain unchanged. They are historical report fields that identify where evidence was written at the time, not live navigation links.
- Dated PM task authority and acceptance conclusions remain historical. [Archive index](../../archive/README.md) identifies the moved PM material without changing those conclusions.

The `art/<project>/` convention continues to keep tracked README, ignore rules, and briefs alongside local-only source media. `tools/<project>/` keeps tracked production scripts. The future `art/project-films/` and `tools/project_films/` conventions describe a Remotion production path independent of the Landing build.
