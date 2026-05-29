from __future__ import annotations

from typing import Dict

from ..models import RepoAnalysis
from ..translator import translate_to_zh
from ..utils import rel_path
from .detectors import (
    append_package_script_commands,
    detect_generator_script,
    detect_root_package_scripts,
    detect_unittest_commands,
    detect_verify_script_commands,
    infer_source_of_truth_lines,
    product_entry_point_lines,
    supporting_docs_for_role,
)
from .helpers import (
    current_operating_posture,
    enumerate_rules,
    extend_unique,
    format_bullets,
    format_path_bullets,
    human_dual_view_rationale_lines,
    repo_type_label,
    role_first_screen_rules,
    supporting_doc_insight_lines,
    supporting_doc_lines,
    supporting_doc_provenance_lines,
)
def build_readme(analysis: RepoAnalysis) -> str:
    return f"""# AGENTS

## Best Used For

- Fast onboarding when a new coding agent enters this repository
- Multi-agent work where terminology, workflow, and ownership boundaries need to stay aligned
- Refreshing repo-specific context after the codebase structure changes

## Dual Documentation System

- `dfa-doc/AGENTS/` is the agent-facing rule/runbook layer for execution and handoff.
- `dfa-doc/handbook/` is the human-facing system context layer for maintainers and onboarding.
- Prefer `--output-mode dual` so both layers stay synchronized after refresh.

## Repository Classification

- Detected repo type: `{repo_type_label(analysis.repo_type)}`

## Files

- `product.md`: why this repository exists and what agents should preserve
- `architecture.md`: repository shape, source-of-truth files, and handoff boundaries
- `frontend.md`: UI/client context for frontend-facing repos, or agent-facing interface notes otherwise
- `backend.md`: service/runtime contract notes or implementation/runtime entrypoints
- `workflows.md`: setup, execution, verification, and refresh commands
- `glossary.md`: canonical names, labels, and terminology that should stay stable
"""


def build_product(analysis: RepoAnalysis) -> str:
    route_lines = format_bullets(
        product_entry_point_lines(analysis),
        "No user-facing routes or invocation entrypoints were detected automatically.",
    )
    facts = []
    if analysis.summary:
        facts.append(analysis.summary)
    if analysis.repo_type == "skill-meta":
        if analysis.skill_meta.skill_name:
            facts.append(f"Skill name declared in metadata: `{analysis.skill_meta.skill_name}`.")
        if analysis.skill_meta.skill_file:
            facts.append(f"Primary skill definition file: `{analysis.skill_meta.skill_file.name}`.")
        facts.append(
            "This repository ships reusable instructions and scripts for coding agents rather than a standalone product app."
        )

    inferences = [
        f"This repository is best understood as a `{repo_type_label(analysis.repo_type)}`.",
    ]
    if analysis.repo_type == "skill-meta":
        inferences.append(
            "Primary users are maintainers installing or evolving the skill, plus agents that consume the generated guidance."
        )
    elif analysis.repo_type in {"library-sdk", "cli-tool"}:
        inferences.append("Primary users are developers integrating or running the packaged tooling.")

    open_questions = [
        "Confirm the primary audience and the exact outcome they expect from this repository.",
        "Confirm the core success criteria agents should optimize for before making broad edits.",
    ]
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "product"))

    return f"""# Product

## Best Used For

- Planning work in this repository before editing code or docs
- Aligning multiple agents on what this repo is trying to preserve
- Checking whether a proposed change still matches the repository's purpose

## Top Rules (Read First)

{format_bullets(top_rules, "State 2-4 product rules that should survive session resets.")}

## Confirmed Facts

{format_bullets(facts, "Needs human confirmation: add a concise repository summary from the README or maintainers.")}

## Inferences For Agents

{format_bullets(inferences, "Repository purpose could not be inferred confidently.")}

## Current Entry Points

{route_lines}

## Open Questions

{format_bullets(open_questions, "No open questions recorded.")}
"""


def build_architecture(analysis: RepoAnalysis) -> str:
    facts = [
        f"Repository root: `{analysis.root}`.",
        f"Detected repo type: `{analysis.repo_type}`.",
        f"Classification confidence: `{analysis.classification.confidence}`.",
    ]
    if analysis.frontend_root:
        facts.append(f"Frontend root: `{rel_path(analysis.frontend_root, analysis.root)}`.")
    if analysis.backend_root:
        facts.append(f"Backend root: `{rel_path(analysis.backend_root, analysis.root)}`.")

    if analysis.repo_type == "skill-meta":
        if analysis.skill_meta.skill_file:
            facts.append(f"Skill definition entrypoint: `{rel_path(analysis.skill_meta.skill_file, analysis.root)}`.")
        if analysis.skill_meta.agent_manifests:
            facts.append("Agent manifest files are present for marketplace or launcher integration.")

    source_of_truth = infer_source_of_truth_lines(analysis)

    handoff = []
    if analysis.repo_type == "skill-meta":
        handoff.extend(
            [
                "Prompt/instruction changes should stay aligned with generator behavior so agents are not told to do something the script cannot support.",
                "Generated `dfa-doc/AGENTS/` docs are downstream artifacts; review the generator and references before hand-editing broad structure.",
            ]
        )
    else:
        handoff.extend(
            [
                "Prefer changing source code and config first, then refresh `dfa-doc/AGENTS/` docs so agent context stays synchronized.",
                "When repo shape is ambiguous, inspect the README and build scripts before assuming ownership boundaries.",
            ]
        )
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "architecture"))

    return f"""# Architecture

## Best Used For

- Building a quick mental model of repository boundaries before editing
- Deciding which files are canonical versus generated
- Handing work between agents without losing context

## Top Rules (Read First)

{format_bullets(top_rules, "State 2-4 architecture rules that should survive session resets.")}

## Confirmed Facts

{format_bullets(facts, "Needs human confirmation: repository boundaries were not inferred cleanly.")}

## Repo-Type Signals

{format_bullets(list(analysis.repo_type_reasons), "No strong classification signals were detected automatically.")}

## Secondary Traits

{format_bullets(list(analysis.classification.secondary_traits), "No secondary traits were detected automatically.")}

## Conflicting Signals

{format_bullets(list(analysis.classification.conflicting_signals), "No major conflicting signals were detected automatically.")}

## Source Of Truth For Agents

{format_bullets(source_of_truth, "Needs human confirmation: identify canonical files and directories.")}

## Handoff Boundaries

{format_bullets(handoff, "Needs human confirmation: add handoff and ownership notes.")}

## Open Questions

{format_bullets(list(analysis.repo_type_questions), "No open architecture questions recorded.")}
"""


def build_frontend(analysis: RepoAnalysis) -> str:
    best_used_for = [
        "UI-facing changes, route discovery, and component-level edits"
        if analysis.repo_type == "web-app"
        else "Agent-facing interface context and user entrypoint discovery",
        "Checking which screens, prompts, or interaction surfaces must stay consistent",
    ]

    facts = []
    inferences = []
    route_heading = "Routes Or Interaction Entry Points"
    component_heading = "Key Components Or Interface Files"
    manifest_heading = "Agent Manifests / Prompt Surfaces"
    route_lines = format_bullets(
        [f"`{route}`" for route in analysis.routes],
        "No browser routes were detected automatically.",
    )
    component_lines = format_bullets(
        [f"`{component}`" for component in analysis.components],
        "No component inventory was detected automatically.",
    )
    manifest_lines = format_path_bullets(
        analysis.skill_meta.agent_manifests,
        analysis.root,
        "No agent manifest files were detected automatically.",
    )

    if analysis.repo_type == "web-app":
        facts.append(f"Detected frontend stack: {analysis.frontend_stack}.")
        if analysis.routes:
            facts.append("User-facing routes were detected from app/page structure.")
        if analysis.components:
            facts.append("Top-level components were detected from common component directories.")
    elif analysis.repo_type == "skill-meta":
        if analysis.skill_meta.agent_manifests:
            facts.append("Agent-facing interface manifests are present.")
        facts.append("Primary user interaction happens through an AI assistant invoking this skill rather than a browser UI.")
        inferences.append("The closest thing to a frontend here is the installation and invocation surface exposed through skill manifests and prompts.")
    elif analysis.repo_type == "cli-tool":
        best_used_for = [
            "Understanding command entrypoints, command UX, and user-triggered scripts",
            "Checking which command names, flags, or help text must remain stable",
        ]
        route_heading = "CLI Entry Points"
        component_heading = "User-Facing Command Files"
        manifest_heading = "Install / Invocation Surfaces"
        facts.append("Primary user interaction happens through the command line rather than a browser UI.")
        if analysis.cli_entrypoints:
            facts.append("CLI entrypoint files were detected.")
        route_lines = format_path_bullets(
            analysis.cli_entrypoints,
            analysis.root,
            "No CLI entrypoints were detected automatically.",
        )
        component_lines = format_bullets([], "No additional user-facing command files were detected automatically.")
        manifest_lines = format_bullets(
            [
                "Check package metadata, README examples, and shell scripts before renaming commands or changing default behavior."
            ],
            "No install or invocation surfaces were detected automatically.",
        )
        inferences.append("For CLI repositories, the most frontend-like surface is the command syntax, help output, and install story.")
    elif analysis.repo_type == "library-sdk":
        best_used_for = [
            "Understanding public entrypoints and integration-facing surface area",
            "Checking which exported modules or examples downstream users depend on",
        ]
        route_heading = "Public Entry Points"
        component_heading = "Export Surface Files"
        manifest_heading = "Integration Surfaces"
        facts.append("Primary user interaction is likely through imports, exported helpers, or integration examples rather than an interactive UI.")
        if analysis.library_entrypoints:
            facts.append("Library entrypoint files were detected.")
        route_lines = format_path_bullets(
            analysis.library_entrypoints,
            analysis.root,
            "No public entrypoints were detected automatically.",
        )
        component_lines = format_path_bullets(
            analysis.library_entrypoints[:4],
            analysis.root,
            "No export surface files were detected automatically.",
        )
        manifest_lines = format_bullets(
            [
                "Check README usage snippets and package exports before changing names or module layout."
            ],
            "No integration surfaces were detected automatically.",
        )
        inferences.append("For library repositories, the user-facing surface is the exported API and import paths, not a browser or CLI shell.")
    else:
        facts.append(analysis.frontend_stack)

    open_questions = [
        "Confirm the primary interaction surface agents should preserve: browser UI, CLI UX, or skill prompt surface.",
        "Confirm any labels, command names, or invocation phrases that must remain stable for users.",
    ]

    return f"""# Frontend

## Best Used For

{format_bullets(best_used_for, "Needs human confirmation: define when agents should read this file.")}

## Confirmed Facts

{format_bullets(facts, "Needs human confirmation: no frontend or interaction-surface facts were detected.")}

## Inferences For Agents

{format_bullets(inferences, "No additional frontend inferences recorded.")}

## {route_heading}

{route_lines}

## {component_heading}

{component_lines}

## {manifest_heading}

{manifest_lines}

## Open Questions

{format_bullets(open_questions, "No open frontend questions recorded.")}
"""


def build_backend(analysis: RepoAnalysis) -> str:
    facts = []
    inferences = []
    runtime_heading = "Runtime Entry Points"
    endpoint_heading = "Main Services / Endpoints"
    contract_heading = "Stable Contract Fields"
    storage_heading = "Storage / Output Rules"
    runtime_files = format_path_bullets(
        analysis.skill_meta.scripts,
        analysis.root,
        "No runtime script files were detected automatically.",
    )
    endpoint_lines = format_bullets(
        [f"`{endpoint}`" for endpoint in analysis.endpoints],
        "No API endpoints were detected automatically.",
    )
    storage_lines = format_bullets(
        list(analysis.storage_rules),
        "No storage or persistence rules were detected automatically.",
    )
    contract_lines = format_bullets(
        list(analysis.contract_fields),
        "No stable result-contract fields were detected automatically.",
    )

    if analysis.repo_type in {"backend-service", "web-app"}:
        facts.append(f"Detected backend/runtime stack: {analysis.backend_stack}.")
        if analysis.endpoints:
            facts.append("HTTP endpoints were detected from router decorators.")
        if analysis.storage_rules:
            facts.append("Storage-related behavior was inferred from backend source files.")
    elif analysis.repo_type == "skill-meta":
        if analysis.skill_meta.scripts:
            facts.append("Generation or support scripts are present and act as the runtime behavior of this skill.")
        inferences.append("The most important backend-like surface is the generator script and any install/runtime commands that mutate repository docs.")
    elif analysis.repo_type == "cli-tool":
        runtime_heading = "Execution Entry Points"
        endpoint_heading = "Automation / Script Hooks"
        contract_heading = "Stable CLI Contracts"
        storage_heading = "Outputs / Side Effects"
        facts.append("Operational behavior is driven by CLI entrypoints and helper scripts rather than a networked service.")
        if analysis.cli_entrypoints:
            facts.append("CLI execution entrypoints were detected.")
        runtime_files = format_path_bullets(
            analysis.cli_entrypoints,
            analysis.root,
            "No CLI execution entrypoints were detected automatically.",
        )
        endpoint_lines = format_path_bullets(
            analysis.skill_meta.scripts,
            analysis.root,
            "No automation or helper scripts were detected automatically.",
        )
        contract_lines = format_bullets(
            [
                "Command names, positional arguments, and exit behavior should be treated as downstream-facing contracts."
            ],
            "No stable CLI contracts were detected automatically.",
        )
        storage_lines = format_bullets(
            [
                "Review shell scripts and README examples before changing output paths, environment variable names, or logging behavior."
            ],
            "No CLI side effects were detected automatically.",
        )
        inferences.append("For CLI repositories, backward compatibility often lives in command syntax and shell-facing behavior.")
    elif analysis.repo_type == "library-sdk":
        runtime_heading = "Implementation Entry Points"
        endpoint_heading = "Public Modules"
        contract_heading = "Stable API Contracts"
        storage_heading = "Side Effects / Persistence"
        facts.append("Operational behavior is likely exposed through imported modules and exported functions rather than a long-running service.")
        if analysis.library_entrypoints:
            facts.append("Library implementation entrypoints were detected.")
        runtime_files = format_path_bullets(
            analysis.library_entrypoints,
            analysis.root,
            "No implementation entrypoints were detected automatically.",
        )
        endpoint_lines = format_path_bullets(
            analysis.library_entrypoints[:6],
            analysis.root,
            "No public modules were detected automatically.",
        )
        contract_lines = format_bullets(
            [
                "Export names, import paths, and returned object shapes are likely downstream-facing contracts."
            ],
            "No stable API contracts were detected automatically.",
        )
        storage_lines = format_bullets(
            [
                "Confirm whether modules perform file I/O, network access, or config discovery before changing behavior."
            ],
            "No side effects or persistence rules were detected automatically.",
        )
        inferences.append("For library repositories, the safest unit of change is often the public API surface rather than internal implementation details.")
    else:
        facts.append(analysis.backend_stack)

    open_questions = [
        "Confirm which runtime entrypoints agents should read before changing behavior.",
        "Confirm whether there are outputs or contracts that downstream tools depend on and must not drift.",
    ]

    return f"""# Backend

## Best Used For

- Runtime, script, and service behavior changes
- Checking stable contracts before changing generated outputs
- Verifying where operational logic actually lives

## Confirmed Facts

{format_bullets(facts, "Needs human confirmation: no backend/runtime facts were detected.")}

## Inferences For Agents

{format_bullets(inferences, "No additional backend inferences recorded.")}

## {runtime_heading}

{runtime_files}

## {endpoint_heading}

{endpoint_lines}

## {contract_heading}

{contract_lines}

## {storage_heading}

{storage_lines}

## Open Questions

{format_bullets(open_questions, "No open backend questions recorded.")}
"""


def build_workflows(analysis: RepoAnalysis) -> str:
    setup_lines = []
    run_lines = []
    verify_lines = []
    refresh_lines = []
    root_package_scripts = detect_root_package_scripts(analysis.root)

    if analysis.frontend_root:
        frontend_prefix = (
            f"cd {rel_path(analysis.frontend_root, analysis.root)}"
            if analysis.frontend_root != analysis.root
            else "# already at repo root"
        )
        install_cmd = {
            "npm": "npm install",
            "pnpm": "pnpm install",
            "yarn": "yarn install",
        }.get(analysis.package_manager, "npm install")
        setup_lines.extend([frontend_prefix, install_cmd])
        if "dev" in analysis.frontend_scripts:
            run_lines.extend(
                [
                    frontend_prefix,
                    f"{analysis.package_manager} run dev"
                    if analysis.package_manager != "yarn"
                    else "yarn dev",
                ]
            )
        for key in ("lint", "test", "build"):
            if key in analysis.frontend_scripts:
                verify_lines.extend(
                    [
                        frontend_prefix,
                        f"{analysis.package_manager} run {key}"
                        if analysis.package_manager != "yarn"
                        else f"yarn {key}",
                    ]
                )
    elif root_package_scripts:
        install_cmd = {
            "npm": "npm install",
            "pnpm": "pnpm install",
            "yarn": "yarn install",
        }.get(analysis.package_manager, "npm install")
        setup_lines.append(install_cmd)
        append_package_script_commands(run_lines, analysis.package_manager, root_package_scripts, ("dev", "start"))
        append_package_script_commands(
            verify_lines,
            analysis.package_manager,
            root_package_scripts,
            ("lint", "test", "build", "typecheck", "check"),
        )

    if analysis.backend_root:
        backend_prefix = (
            f"cd {rel_path(analysis.backend_root, analysis.root)}"
            if analysis.backend_root != analysis.root
            else "# backend at repo root"
        )
        if (analysis.backend_root / "requirements-dev.txt").exists():
            setup_lines.extend([backend_prefix, "python3 -m pip install -r requirements-dev.txt"])
        elif (analysis.backend_root / "requirements.txt").exists():
            setup_lines.extend([backend_prefix, "python3 -m pip install -r requirements.txt"])
        if (analysis.backend_root / "app").exists():
            run_lines.extend([backend_prefix, "uvicorn app.main:app --reload"])

    if analysis.repo_type == "skill-meta":
        setup_lines.append("# skill repositories are usually installed by symlink or copied into a local skills directory")
        skill_script = detect_generator_script(analysis.root)
        if skill_script:
            skill_script_rel = rel_path(skill_script, analysis.root)
            run_lines.append(f"python3 {skill_script_rel} --root /path/to/target-repo --mode refresh")
            refresh_lines.append(f"python3 {skill_script_rel} --root {analysis.root} --mode refresh")
        refresh_lines.append(
            "Review generated `dfa-doc/AGENTS/*.md` and `dfa-doc/handbook/*.md` files and tighten sections still marked as needing human confirmation."
        )

    if analysis.script_files:
        extend_unique(run_lines, [f"./{script}" for script in analysis.script_files[:6]])

    extend_unique(verify_lines, detect_unittest_commands(analysis.root))
    extend_unique(verify_lines, detect_verify_script_commands(analysis.root))

    if not setup_lines:
        setup_lines = ["Review README setup steps and install dependencies with the repository's package manager."]
    if not run_lines:
        run_lines = ["Run the primary local command from README examples (app start, CLI invocation, or generator refresh)."]
    if not verify_lines:
        verify_lines = ["Run repository verification commands from README or CI (lint/test/build equivalents)."]
    if not refresh_lines:
        refresh_lines = ["Refresh `dfa-doc/AGENTS/` + `dfa-doc/handbook/` after major codebase, workflow, or terminology changes."]
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "execution"))

    return f"""# Workflows

## Best Used For

- Getting an agent from zero context to runnable context quickly
- Running the minimum commands needed to inspect or validate changes
- Refreshing agent docs after the repository shape changes

## Top Rules (Read First)

{format_bullets(top_rules, "State 2-4 execution rules before setup/run/verify details.")}

## Setup

```bash
{chr(10).join(setup_lines)}
```

## Run

```bash
{chr(10).join(run_lines)}
```

## Verify

```bash
{chr(10).join(verify_lines)}
```

## Refresh / Handoff Notes

{format_bullets(refresh_lines, "No refresh notes recorded.")}
"""


def build_glossary(analysis: RepoAnalysis) -> str:
    facts = list(analysis.glossary_entries)
    if analysis.repo_type == "skill-meta" and analysis.skill_meta.skill_name:
        facts.append(f"- `skill`: `{analysis.skill_meta.skill_name}`")

    naming_rules = [
        "- Prefer canonical repository terms over improvised synonyms in generated docs.",
        "- When a command, file path, or manifest label is user-facing, keep it stable unless the repository intentionally renames it.",
    ]
    if analysis.repo_type == "skill-meta":
        naming_rules.append(
            "- Keep skill names, manifest display names, and installation commands aligned across README, manifests, and generator output."
        )

    return f"""# Glossary

## Best Used For

- Normalizing the terminology multiple agents should share
- Avoiding naming drift between generated docs, code, and user-facing instructions

## Confirmed Terms

{chr(10).join(facts) if facts else "- Needs human confirmation: add canonical repository terms and labels."}

## Naming Rules

{chr(10).join(naming_rules)}

## Open Questions

- Confirm which user-facing names must remain stable across documentation, manifests, and scripts.
"""


def generate_bootstrap_docs(analysis: RepoAnalysis, locale: str = "en") -> Dict[str, str]:
    docs = {
        "README.md": build_readme(analysis),
        "product.md": build_product(analysis),
        "architecture.md": build_architecture(analysis),
        "frontend.md": build_frontend(analysis),
        "backend.md": build_backend(analysis),
        "workflows.md": build_workflows(analysis),
        "glossary.md": build_glossary(analysis),
    }
    if locale == "zh":
        return {path: translate_to_zh(content) for path, content in docs.items()}
    return docs
