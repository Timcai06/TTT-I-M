from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional

from .analysis import SUPPORTED_REPO_TYPES, analyze_repo
from .builders import (
    AGENT_LOCALE_OUTPUT_ROOTS,
    HUMAN_LOCALE_OUTPUT_ROOTS,
    SUPPORTED_DOC_PROFILES,
    SUPPORTED_AGENT_LOCALES,
    SUPPORTED_HUMAN_LOCALES,
    SUPPORTED_HUMAN_TEMPLATE_VARIANTS,
    SUPPORTED_OUTPUT_MODES,
    generate_docs,
    generate_human_docs,
    infer_source_of_truth_lines,
    repo_type_label,
    resolve_agent_output_root,
    resolve_human_output_root,
    resolve_human_template_variant,
)
from .markdown import MANUAL_END, MANUAL_START, merge_markdown
from .models import RepoAnalysis
from .translator import translate_to_zh
from .utils import infer_project_name, read_text, write_file

SUPPORTED_ENGINE_ACTIONS = ("init", "refresh", "migrate", "generate")
ACTION_WRITE_STRATEGY = {
    "init": "init",
    "generate": "init",
    "refresh": "refresh",
    "migrate": "refresh",
}

LEGACY_FLAT_TO_LAYERED_TARGETS = {
    "README.md": ("00-entry/AGENTS.md",),
    "product.md": ("01-product/002-prd.md",),
    "architecture.md": ("02-architecture/007-architecture-compatibility.md",),
    "frontend.md": ("02-architecture/005-frontend-guidelines.md",),
    "backend.md": ("02-architecture/006-backend-structure.md",),
    "workflows.md": ("03-execution/008-implementation-plan.md",),
    "glossary.md": ("00-entry/AGENTS.md",),
}


@dataclass(frozen=True)
class EngineRequest:
    root: Path
    mode: str = "refresh"
    output_mode: str = "dual"
    human_locale: str = "en"
    human_template_variant: str = "paired-core"
    profile: str = "bootstrap"
    project_name: str = ""
    repo_type_override: Optional[str] = None


@dataclass(frozen=True)
class GenerationPlan:
    request: EngineRequest
    analysis: RepoAnalysis
    files: Dict[str, str]
    archive_candidates: list[Path]
    agents_dir: Path
    docs_dir: Path

    @property
    def write_mode(self) -> str:
        return write_strategy_for_mode(self.request.mode)


@dataclass(frozen=True)
class EngineExecutionResult:
    plan: GenerationPlan
    dry_run: bool
    summary: str
    planned_actions: list[str]


def effective_profile_for_mode(mode: str, profile: str) -> str:
    if mode == "migrate":
        return "layered"
    return profile


def write_strategy_for_mode(mode: str) -> str:
    return ACTION_WRITE_STRATEGY.get(mode, "refresh")


def normalize_engine_request(request: EngineRequest) -> EngineRequest:
    root = request.root.expanduser().resolve()
    if request.mode not in SUPPORTED_ENGINE_ACTIONS:
        raise ValueError(f"Unsupported mode `{request.mode}`. Supported: {', '.join(SUPPORTED_ENGINE_ACTIONS)}")
    if request.output_mode not in SUPPORTED_OUTPUT_MODES:
        raise ValueError(f"Unsupported output mode `{request.output_mode}`. Supported: {', '.join(SUPPORTED_OUTPUT_MODES)}")
    unsupported_agent_locales = [locale for locale in AGENT_LOCALE_OUTPUT_ROOTS if locale not in SUPPORTED_AGENT_LOCALES]
    if unsupported_agent_locales:
        raise ValueError(f"Agent locale mapping contains unsupported locales: {', '.join(unsupported_agent_locales)}")
    if request.human_locale not in SUPPORTED_HUMAN_LOCALES:
        raise ValueError(
            f"Unsupported human locale `{request.human_locale}`. Supported: {', '.join(SUPPORTED_HUMAN_LOCALES)}"
        )
    if request.human_template_variant not in SUPPORTED_HUMAN_TEMPLATE_VARIANTS:
        raise ValueError(
            "Unsupported human template variant "
            f"`{request.human_template_variant}`. Supported: {', '.join(SUPPORTED_HUMAN_TEMPLATE_VARIANTS)}"
        )
    effective_profile = effective_profile_for_mode(request.mode, request.profile)
    if effective_profile not in SUPPORTED_DOC_PROFILES:
        raise ValueError(f"Unsupported profile `{request.profile}`. Supported: {', '.join(SUPPORTED_DOC_PROFILES)}")
    if request.repo_type_override and request.repo_type_override not in SUPPORTED_REPO_TYPES:
        raise ValueError(
            f"Unsupported repo type `{request.repo_type_override}`. Supported: {', '.join(SUPPORTED_REPO_TYPES)}"
        )
    project_name = infer_project_name(root, request.project_name)
    return EngineRequest(
        root=root,
        mode=request.mode,
        output_mode=request.output_mode,
        human_locale=request.human_locale,
        human_template_variant=request.human_template_variant,
        profile=effective_profile,
        project_name=project_name,
        repo_type_override=request.repo_type_override,
    )


def resolve_output_content(path: Path, generated: str, write_mode: str) -> str:
    if write_mode == "refresh" and path.exists():
        return merge_markdown(read_text(path), generated)
    return generated


def append_legacy_migration_notes(content: str, source_label: str, source_text: str) -> str:
    body = source_text.strip()
    if not body:
        return content
    section = "\n".join(
        [
            "## Migrated Notes",
            "",
            f"- Legacy source: `{source_label}`",
            "",
            MANUAL_START,
            body,
            MANUAL_END,
        ]
    )
    return content.rstrip() + "\n\n" + section + "\n"


def apply_layered_migration_overlays(analysis: RepoAnalysis, files: Dict[str, str]) -> Dict[str, str]:
    if analysis.doc_profile != "layered":
        return files

    migrated = dict(files)
    canonical_root = analysis.docs_inventory.canonical_agents_root or (analysis.root / "AGENTS")
    for path in analysis.docs_inventory.flat_agent_files:
        targets = LEGACY_FLAT_TO_LAYERED_TARGETS.get(path.name, ())
        if not targets:
            continue
        source_text = read_text(path)
        if not source_text.strip():
            continue
        try:
            source_label = str(path.relative_to(canonical_root)).replace("\\", "/")
        except ValueError:
            source_label = path.name
        for target in targets:
            if target not in migrated:
                continue
            migrated[target] = append_legacy_migration_notes(migrated[target], f"AGENTS/{source_label}", source_text)
    return migrated


def collect_output_plan(
    root: Path,
    analysis: RepoAnalysis,
    output_mode: str,
    human_locale: str,
    human_template_variant: str,
) -> tuple[Dict[str, str], list[Path]]:
    planned: Dict[str, str] = {}
    archive_candidates: list[Path] = []

    if output_mode in {"agent", "dual"}:
        agent_files = apply_layered_migration_overlays(analysis, generate_docs(analysis, locale="en"))
        agents_dir = root / resolve_agent_output_root("en")
        for name, content in agent_files.items():
            planned[str(agents_dir / name)] = content
        archive_candidates = list(analysis.docs_inventory.archive_candidates)

    if output_mode == "quad":
        for agent_locale in SUPPORTED_AGENT_LOCALES:
            # Re-run the generator with the specific locale - No more translate_to_zh patch here!
            agent_files = apply_layered_migration_overlays(analysis, generate_docs(analysis, locale=agent_locale))
            agent_root = root / resolve_agent_output_root(agent_locale)
            for name, content in agent_files.items():
                planned[str(agent_root / name)] = content
        archive_candidates = list(analysis.docs_inventory.archive_candidates)

    if output_mode in {"human", "dual"}:
        human_files = generate_human_docs(
            analysis,
            human_locale=human_locale,
            human_template_variant=human_template_variant,
        )
        for name, content in human_files.items():
            planned[str(root / name)] = content
    elif output_mode == "quad":
        for locale in SUPPORTED_HUMAN_LOCALES:
            human_files = generate_human_docs(
                analysis,
                human_locale=locale,
                human_template_variant=human_template_variant,
            )
            for name, content in human_files.items():
                planned[str(root / name)] = content

    return planned, archive_candidates


def _relative_file_set_under_root(files: Dict[str, str], root_dir: Path) -> set[str]:
    relative_paths: set[str] = set()
    resolved_root = root_dir.resolve()
    for absolute_path in files:
        try:
            relative = Path(absolute_path).resolve().relative_to(resolved_root)
        except ValueError:
            continue
        relative_paths.add(str(relative).replace("\\", "/"))
    return relative_paths


def validate_refresh_pairing_contract(root: Path, mode: str, output_mode: str) -> None:
    if mode != "refresh" or output_mode == "quad":
        return
    has_quad_agent_root = (root / resolve_agent_output_root("zh")).exists()
    has_quad_human_root = (root / resolve_human_output_root("zh")).exists()
    if has_quad_agent_root or has_quad_human_root:
        raise ValueError(
            "Paired refresh contract violation: repository already has quad outputs "
            f"(`{resolve_agent_output_root('zh')}/` or `{resolve_human_output_root('zh')}/`). "
            "Use `--output-mode quad` for refresh so paired roots stay synchronized."
        )


def _validate_mode_path_contract(
    root: Path,
    output_mode: str,
    human_locale: str,
    files: Dict[str, str],
    agent_root: Path,
) -> None:
    mode_roots: list[Path]
    if output_mode == "agent":
        mode_roots = [agent_root]
    elif output_mode == "human":
        mode_roots = [root / resolve_human_output_root(human_locale)]
    elif output_mode == "dual":
        mode_roots = [agent_root, root / resolve_human_output_root(human_locale)]
    else:
        mode_roots = [
            root / resolve_agent_output_root("en"),
            root / resolve_agent_output_root("zh"),
            root / resolve_human_output_root("en"),
            root / resolve_human_output_root("zh"),
        ]

    for absolute_path in files:
        path = Path(absolute_path).resolve()
        if any(path.is_relative_to(expected_root.resolve()) for expected_root in mode_roots):
            continue
        expected = ", ".join(str(item) for item in mode_roots)
        raise ValueError(
            f"Output path contract violation for `{output_mode}` mode: `{path}` is outside expected roots: {expected}"
        )


def validate_output_contract(
    root: Path,
    mode: str,
    output_mode: str,
    human_locale: str,
    files: Dict[str, str],
    agent_root: Path,
) -> None:
    validate_refresh_pairing_contract(root, mode, output_mode)
    _validate_mode_path_contract(root, output_mode, human_locale, files, agent_root)
    if output_mode != "quad":
        return

    agents_en_root = root / resolve_agent_output_root("en")
    agents_zh_root = root / resolve_agent_output_root("zh")
    docs_en_root = root / resolve_human_output_root("en")
    docs_zh_root = root / resolve_human_output_root("zh")

    agents_en_files = _relative_file_set_under_root(files, agents_en_root)
    agents_zh_files = _relative_file_set_under_root(files, agents_zh_root)
    docs_en_files = _relative_file_set_under_root(files, docs_en_root)
    docs_zh_files = _relative_file_set_under_root(files, docs_zh_root)

    if not agents_en_files or not agents_zh_files or not docs_en_files or not docs_zh_files:
        raise ValueError(
            "Quad output contract violation: expected non-empty "
            f"`{resolve_agent_output_root('en')}/`, `{resolve_agent_output_root('zh')}/`, "
            f"`{resolve_human_output_root('en')}/`, and `{resolve_human_output_root('zh')}/` outputs."
        )
    if agents_en_files != agents_zh_files:
        raise ValueError(
            "Quad output contract violation: "
            f"`{resolve_agent_output_root('en')}/` and `{resolve_agent_output_root('zh')}/` must have symmetric file paths."
        )
    if docs_en_files != docs_zh_files:
        raise ValueError(
            "Quad output contract violation: "
            f"`{resolve_human_output_root('en')}/` and `{resolve_human_output_root('zh')}/` must have symmetric file paths."
        )


def build_generation_plan(request: EngineRequest) -> GenerationPlan:
    normalized_request = normalize_engine_request(request)
    analysis = analyze_repo(
        normalized_request.root,
        normalized_request.project_name,
        repo_type_override=normalized_request.repo_type_override,
        doc_profile=normalized_request.profile,
    )
    files, archive_candidates = collect_output_plan(
        normalized_request.root,
        analysis,
        normalized_request.output_mode,
        normalized_request.human_locale,
        normalized_request.human_template_variant,
    )
    agents_dir = normalized_request.root / resolve_agent_output_root("en")
    validate_output_contract(
        normalized_request.root,
        normalized_request.mode,
        normalized_request.output_mode,
        normalized_request.human_locale,
        files,
        agents_dir,
    )
    docs_dir = normalized_request.root / resolve_human_output_root(normalized_request.human_locale)
    if normalized_request.output_mode == "quad":
        agents_dir = normalized_request.root / resolve_agent_output_root("en")
        docs_dir = normalized_request.root / resolve_human_output_root("en")
    return GenerationPlan(
        request=normalized_request,
        analysis=analysis,
        files=files,
        archive_candidates=archive_candidates,
        agents_dir=agents_dir,
        docs_dir=docs_dir,
    )


def archive_legacy_flat_files(plan: GenerationPlan) -> None:
    if plan.analysis.doc_profile != "layered":
        return
    archive_root = plan.request.root / resolve_agent_output_root("en") / "_archive" / "flat"
    for path in plan.archive_candidates:
        if not path.exists():
            continue
        destination = archive_root / path.name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        path.unlink()


def ensure_output_directories(plan: GenerationPlan) -> None:
    if plan.request.output_mode in {"agent", "dual"}:
        plan.agents_dir.mkdir(parents=True, exist_ok=True)
    if plan.request.output_mode in {"human", "dual"}:
        plan.docs_dir.mkdir(parents=True, exist_ok=True)
    if plan.request.output_mode == "quad":
        for locale in SUPPORTED_AGENT_LOCALES:
            (plan.request.root / resolve_agent_output_root(locale)).mkdir(parents=True, exist_ok=True)
        for locale in SUPPORTED_HUMAN_LOCALES:
            (plan.request.root / resolve_human_output_root(locale)).mkdir(parents=True, exist_ok=True)


def apply_generation_plan(plan: GenerationPlan) -> None:
    ensure_output_directories(plan)
    if plan.request.output_mode in {"agent", "dual"}:
        archive_legacy_flat_files(plan)

    for target, generated in plan.files.items():
        path = Path(target)
        path.parent.mkdir(parents=True, exist_ok=True)
        write_file(path, resolve_output_content(path, generated, plan.write_mode))


def plan_dry_run_actions(plan: GenerationPlan) -> list[str]:
    lines: list[str] = []
    for target_path, generated in plan.files.items():
        path = Path(target_path)
        resolved = resolve_output_content(path, generated, plan.write_mode)
        if not path.exists():
            action = "create"
        elif read_text(path) == resolved:
            action = "unchanged"
        else:
            action = "update"
        try:
            display_path = path.relative_to(plan.request.root)
        except ValueError:
            display_path = path
        lines.append(f"- {action} {display_path}")
    for path in plan.archive_candidates:
        lines.append(f"- archive {path.name} -> {resolve_agent_output_root('en')}/_archive/flat/{path.name}")
    return lines


def plan_title(plan: GenerationPlan, dry_run: bool = False) -> str:
    mode = plan.request.mode
    if dry_run:
        if plan.request.output_mode == "agent":
            return f"Dry run: would {mode} AGENTS docs in: {plan.agents_dir}"
        if plan.request.output_mode == "human":
            return f"Dry run: would {mode} human docs in: {plan.docs_dir}"
        if plan.request.output_mode == "quad":
            return (
                f"Dry run: would {mode} four-view docs in: "
                f"{plan.request.root / resolve_agent_output_root('en')}, "
                f"{plan.request.root / resolve_agent_output_root('zh')}, "
                f"{plan.request.root / resolve_human_output_root('en')}, "
                f"{plan.request.root / resolve_human_output_root('zh')}"
            )
        return f"Dry run: would {mode} AGENTS + human docs in: {plan.agents_dir} and {plan.docs_dir}"

    past_tense = {
        "init": "Initialized",
        "refresh": "Refreshed",
        "migrate": "Migrated",
        "generate": "Generated",
    }.get(mode, f"{mode.capitalize()}ed")
    if plan.request.output_mode == "agent":
        return f"{past_tense} AGENTS docs in: {plan.agents_dir}"
    if plan.request.output_mode == "human":
        return f"{past_tense} human docs in: {plan.docs_dir}"
    if plan.request.output_mode == "quad":
        return (
            f"{past_tense} four-view docs in: "
            f"{plan.request.root / resolve_agent_output_root('en')}, "
            f"{plan.request.root / resolve_agent_output_root('zh')}, "
            f"{plan.request.root / resolve_human_output_root('en')}, "
            f"{plan.request.root / resolve_human_output_root('zh')}"
        )
    return f"{past_tense} AGENTS + human docs in: {plan.agents_dir} and {plan.docs_dir}"


def suggest_profile(analysis: RepoAnalysis) -> str:
    return (
        "layered"
        if analysis.repo_type in {"web-app", "monorepo"} or (analysis.frontend_root and analysis.backend_root)
        else "bootstrap"
    )


def build_analysis_explanation_lines(plan: GenerationPlan, command_name: str = "python3 doc-for-agent/scripts/init_agents_docs.py") -> list[str]:
    analysis = plan.analysis
    suggested_profile = suggest_profile(analysis)
    lines = [
        f"Analysis for: {analysis.root}",
        f"- Project name: {analysis.project_name}",
        f"- Repo type: `{analysis.repo_type}` ({repo_type_label(analysis.repo_type)})",
        f"- Doc profile: `{analysis.doc_profile}`",
        f"- Confidence: `{analysis.classification.confidence}`",
        f"- Frontend root: `{analysis.frontend_root}`" if analysis.frontend_root else "- Frontend root: not detected",
        f"- Backend root: `{analysis.backend_root}`" if analysis.backend_root else "- Backend root: not detected",
        f"- Package manager: `{analysis.package_manager}`",
        f"- Output mode: `{plan.request.output_mode}`",
        (
            f"- Audience-locale mapping: agent/en -> `{resolve_agent_output_root('en')}/`, "
            f"agent/zh -> `{resolve_agent_output_root('zh')}/`, "
            f"human/en -> `{resolve_human_output_root('en')}/`, "
            f"human/zh -> `{resolve_human_output_root('zh')}/`"
        ),
        "- Paired template/path contract: `paired-core` must keep audience-locale roots synchronized through one refresh action.",
        f"- Human locale: `{plan.request.human_locale}` (output root: `{plan.docs_dir}`)",
        f"- Human template variant: `{resolve_human_template_variant(plan.request.human_locale, plan.request.human_template_variant)}`",
        f"- Recommended output mode: `dual` (`{resolve_agent_output_root('en')}/` + `{resolve_human_output_root('en')}/`).",
        f"- Suggested profile: `{suggested_profile}`",
        f"- Documentation state: `{analysis.docs_inventory.detected_state}`",
    ]
    if analysis.docs_inventory.canonical_agents_root:
        lines.append(f"- Canonical AGENTS root: `{analysis.docs_inventory.canonical_agents_root}`")
    if suggested_profile != analysis.doc_profile:
        lines.append(f"- Note: current run requested profile `{analysis.doc_profile}`.")
    lines.append(
        "Suggested command: "
        f"{command_name} --root {analysis.root} --mode refresh --profile {suggested_profile} --output-mode dual"
    )
    if plan.request.output_mode != "dual":
        lines.append(
            "Current-mode command: "
            f"{command_name} --root {analysis.root} --mode refresh --profile {suggested_profile} --output-mode {plan.request.output_mode}"
        )
    if plan.request.output_mode == "quad":
        lines.append(
            "- Four-view mode writes "
            f"`{resolve_agent_output_root('en')}/`, `{resolve_agent_output_root('zh')}/`, "
            f"`{resolve_human_output_root('en')}/`, and `{resolve_human_output_root('zh')}/` in one run "
            "(structure-only; no translation)."
        )
    lines.append("Suggested source-of-truth files:")
    lines.extend([f"- {line}" for line in infer_source_of_truth_lines(analysis)[:6]])
    lines.append("Supporting-doc synthesis summary:")
    for role in ("product", "architecture", "execution", "memory"):
        role_insights = analysis.supporting_doc_insights.get(role, {})
        role_sources = analysis.supporting_doc_provenance.get(role, [])
        confirmed_count = len(role_insights.get("confirmed", []))
        conflicting_count = len(role_insights.get("conflicting", []))
        unresolved_count = len(role_insights.get("unresolved", []))
        lines.append(
            f"- {role}: confirmed={confirmed_count}, conflicting={conflicting_count}, unresolved={unresolved_count}, sources={len(role_sources)}"
        )
    sections = [
        ("Reasons", analysis.classification.reasons),
        ("Secondary traits", analysis.classification.secondary_traits),
        ("Conflicting signals", analysis.classification.conflicting_signals),
        ("Open questions", analysis.classification.open_questions),
        (
            "Documentation inventory",
            [
                f"detected state: {analysis.docs_inventory.detected_state}",
                f"agent roots: {len(analysis.docs_inventory.agent_roots)}",
                f"flat agent files: {len(analysis.docs_inventory.flat_agent_files)}",
                f"layered agent files: {len(analysis.docs_inventory.layered_agent_files)}",
                f"supporting docs: {len(analysis.docs_inventory.supporting_docs)}",
                f"archive candidates: {len(analysis.docs_inventory.archive_candidates)}",
            ],
        ),
        (
            "Signals",
            [
                f"top-level dirs: {', '.join(analysis.signals.top_level_dirs) or '(none)'}",
                f"has skill file: {'yes' if analysis.signals.has_skill_file else 'no'}",
                f"has agent manifests: {'yes' if analysis.signals.has_agent_manifests else 'no'}",
                f"has workspace layout: {'yes' if analysis.signals.has_workspace_layout else 'no'}",
                f"has package.json: {'yes' if analysis.signals.has_package_json else 'no'}",
                f"has package bin metadata: {'yes' if analysis.signals.has_package_bin else 'no'}",
                f"has Python packaging: {'yes' if analysis.signals.has_python_packaging else 'no'}",
                f"CLI entrypoints: {len(analysis.signals.cli_entrypoints)}",
                f"library entrypoints: {len(analysis.signals.library_entrypoints)}",
            ],
        ),
    ]
    for heading, items in sections:
        lines.append(f"{heading}:")
        if items:
            lines.extend([f"- {item}" for item in items])
        else:
            lines.append("- none")
    if analysis.docs_inventory.reference_only_docs:
        lines.append("Reference-only docs:")
        lines.extend([f"- {path}" for path in analysis.docs_inventory.reference_only_docs[:6]])
    return lines


def execute_engine_request(request: EngineRequest, dry_run: bool = False) -> EngineExecutionResult:
    plan = build_generation_plan(request)
    actions = plan_dry_run_actions(plan)
    if not dry_run:
        apply_generation_plan(plan)
    return EngineExecutionResult(
        plan=plan,
        dry_run=dry_run,
        summary=plan_title(plan, dry_run=dry_run),
        planned_actions=actions,
    )
