#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Optional

from doc_for_agent_generator import (
    MANUAL_END,
    MANUAL_START,
    SUPPORTED_DOC_PROFILES,
    SUPPORTED_ENGINE_ACTIONS,
    SUPPORTED_HUMAN_LOCALES,
    SUPPORTED_HUMAN_TEMPLATE_VARIANTS,
    SUPPORTED_OUTPUT_MODES,
    SUPPORTED_REPO_TYPES,
    EngineRequest,
    analyze_repo,
    build_analysis_explanation_lines,
    execute_engine_request,
    generate_docs as generate_docs_from_analysis,
    merge_markdown,
    read_text,
    write_file,
)

__all__ = [
    "MANUAL_END",
    "MANUAL_START",
    "generate_docs",
    "main",
    "merge_markdown",
    "read_text",
    "write_file",
]

def generate_docs(
    root: Path,
    project_name: str,
    repo_type_override: Optional[str] = None,
    profile: str = "bootstrap",
) -> Dict[str, str]:
    # Keep the historical entrypoint shape while delegating to the modular core.
    return generate_docs_from_analysis(
        analyze_repo(root, project_name, repo_type_override=repo_type_override, doc_profile=profile)
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Initialize or refresh a four-view documentation system under doc-for-agent/ for AGENTS and handbook outputs."
    )
    parser.add_argument(
        "--root",
        required=True,
        help="Repository root where doc-for-agent/ generated outputs should be created or refreshed.",
    )
    parser.add_argument("--project-name", help="Optional explicit project name.")
    parser.add_argument(
        "--mode",
        choices=SUPPORTED_ENGINE_ACTIONS,
        default="refresh",
        help="Engine action to execute: init, refresh, migrate, or generate.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview generated AGENTS/handbook file changes without writing anything.",
    )
    parser.add_argument(
        "--repo-type",
        choices=SUPPORTED_REPO_TYPES,
        help="Force a repo type when automatic classification is not appropriate.",
    )
    parser.add_argument(
        "--explain",
        action="store_true",
        help="Print classification signals and reasoning before any write actions.",
    )
    parser.add_argument(
        "--profile",
        choices=SUPPORTED_DOC_PROFILES,
        default="layered",
        help="Select the AGENTS documentation topology to generate.",
    )
    parser.add_argument(
        "--output-mode",
        choices=SUPPORTED_OUTPUT_MODES,
        default="quad",
        help=(
            "Choose output set: agent, human, dual, or quad "
            "(`dfa-doc/AGENTS/`, `dfa-doc/AGENTS.zh/`, "
            "`dfa-doc/handbook/`, `dfa-doc/handbook.zh/`)."
        ),
    )
    parser.add_argument(
        "--human-locale",
        choices=SUPPORTED_HUMAN_LOCALES,
        default="en",
        help=(
            "Locale-aware human docs output root mapping only "
            "(`en` -> `dfa-doc/handbook/`, `zh` -> `dfa-doc/handbook.zh/`); "
            "no translation applied."
        ),
    )
    parser.add_argument(
        "--human-template",
        choices=SUPPORTED_HUMAN_TEMPLATE_VARIANTS,
        default="paired-core",
        help="Select human docs template variant for pairing/structure rules (no translation logic).",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    request = EngineRequest(
        root=root,
        mode=args.mode,
        output_mode=args.output_mode,
        human_locale=args.human_locale,
        human_template_variant=args.human_template,
        profile=args.profile,
        project_name=args.project_name or "",
        repo_type_override=args.repo_type,
    )
    result = execute_engine_request(request, dry_run=args.dry_run)

    if args.explain:
        for line in build_analysis_explanation_lines(result.plan):
            print(line)

    print(result.summary)
    
    created = sum(1 for a in result.planned_actions if a.startswith("- create "))
    updated = sum(1 for a in result.planned_actions if a.startswith("- update "))
    unchanged = sum(1 for a in result.planned_actions if a.startswith("- unchanged "))
    
    if not args.dry_run:
        print(f"✓ Created {created} files, Updated {updated} files, Skipped {unchanged} (unchanged)")
        
    if args.dry_run:
        for line in result.planned_actions:
            print(line)


if __name__ == "__main__":
    main()
