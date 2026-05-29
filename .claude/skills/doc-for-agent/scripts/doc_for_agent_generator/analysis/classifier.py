from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from ..models import RepoClassification, RepoSignals, SkillMetadata
from ..utils import find_first_existing, list_top_level_dirs, list_top_level_files, load_json
from .scanner import is_primary_agent_manifest, is_primary_skill_file

SUPPORTED_REPO_TYPES = (
    "skill-meta",
    "cli-tool",
    "library-sdk",
    "backend-service",
    "web-app",
    "monorepo",
    "unknown",
)


def collect_repo_signals(
    root: Path,
    frontend_root: Optional[Path],
    backend_root: Optional[Path],
    cli_entrypoints: Sequence[Path],
    library_entrypoints: Sequence[Path],
    skill_meta: SkillMetadata,
) -> RepoSignals:
    top_level_dirs = list_top_level_dirs(root)
    package_json = root / "package.json"
    package = load_json(package_json) if package_json.exists() else {}
    deps = {
        **(package.get("dependencies") or {}),
        **(package.get("devDependencies") or {}),
    }
    dependency_names = sorted(str(key) for key in deps if isinstance(key, str))
    package_bin = package.get("bin")
    has_package_bin = isinstance(package_bin, str) or (
        isinstance(package_bin, dict) and any(isinstance(key, str) for key in package_bin)
    )

    has_workspace_config = any(
        (root / filename).exists() for filename in ("pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json")
    )
    has_workspace_layout = bool({"packages", "apps"}.intersection(top_level_dirs)) or has_workspace_config
    if isinstance(package.get("workspaces"), list):
        has_workspace_layout = True

    has_skill_file = skill_meta.skill_file is not None
    has_agent_manifests = bool(skill_meta.agent_manifests)
    has_root_skill_markers = is_primary_skill_file(skill_meta.skill_file, root) or any(
        is_primary_agent_manifest(path, root) for path in skill_meta.agent_manifests
    )
    has_embedded_skill_markers = (has_skill_file or has_agent_manifests) and not has_root_skill_markers

    return RepoSignals(
        top_level_dirs=top_level_dirs,
        top_level_files=list_top_level_files(root),
        has_skill_file=has_skill_file,
        has_agent_manifests=has_agent_manifests,
        has_root_skill_markers=has_root_skill_markers,
        has_embedded_skill_markers=has_embedded_skill_markers,
        has_workspace_layout=has_workspace_layout,
        has_frontend=frontend_root is not None,
        has_backend=backend_root is not None,
        has_package_json=package_json.exists(),
        has_package_bin=has_package_bin,
        has_python_packaging=find_first_existing(root, ["pyproject.toml", "setup.py"]) is not None,
        package_name=str(package.get("name") or ""),
        package_dependencies=dependency_names,
        cli_entrypoints=list(cli_entrypoints),
        library_entrypoints=list(library_entrypoints),
    )


def append_unique(target: List[str], item: str) -> None:
    if item and item not in target:
        target.append(item)


def reduce_confidence(level: str, hard_conflicts: int, soft_conflicts: int = 0) -> str:
    levels = ["low", "medium", "high"]
    index = levels.index(level)
    penalty = min(hard_conflicts, 2)
    if soft_conflicts >= 2:
        penalty = min(2, penalty + 1)
    return levels[max(0, index - penalty)]


def classify_repo(signals: RepoSignals) -> RepoClassification:
    reasons: List[str] = []
    secondary_traits: List[str] = []
    conflicting_signals: List[str] = []
    open_questions: List[str] = []
    primary_type = "unknown"
    confidence = "low"
    hard_conflicts = 0
    soft_conflicts = 0

    def add_conflict(message: str, severity: str = "hard") -> None:
        nonlocal hard_conflicts, soft_conflicts
        if message in conflicting_signals:
            return
        conflicting_signals.append(message)
        if severity == "soft":
            soft_conflicts += 1
        else:
            hard_conflicts += 1

    build_like_deps = {"typescript", "tsup", "rollup", "vite"}
    has_build_deps = bool(build_like_deps.intersection(signals.package_dependencies))
    has_skill_markers = signals.has_skill_file or signals.has_agent_manifests
    has_packaged_distribution = signals.has_package_json or signals.has_python_packaging
    has_primary_skill_markers = signals.has_root_skill_markers
    has_strong_application_envelope = signals.has_workspace_layout or (signals.has_frontend and signals.has_backend)

    if has_skill_markers and (has_primary_skill_markers or not has_strong_application_envelope):
        primary_type = "skill-meta"
        confidence = "high"
        reasons.append("Skill markers detected (`SKILL.md`, agent manifests, or an existing `AGENTS/` directory).")
        if signals.has_embedded_skill_markers and not has_primary_skill_markers:
            reasons.append("Skill markers were detected in nested directories and no stronger app envelope was detected.")
        if signals.cli_entrypoints:
            append_unique(secondary_traits, "CLI distribution surface is also present.")
        if signals.has_package_json:
            append_unique(secondary_traits, "JavaScript package/distribution metadata is also present.")
        if signals.has_python_packaging:
            append_unique(secondary_traits, "Python packaging metadata is also present.")
        if signals.library_entrypoints:
            append_unique(secondary_traits, "Library-style entrypoints are also present.")
        if signals.has_workspace_layout:
            append_unique(secondary_traits, "Workspace/monorepo layout is also present.")
        if signals.cli_entrypoints or has_packaged_distribution:
            add_conflict(
                "Skill markers dominate classification, but packaged tooling signals suggest this repository may also ship installable utilities."
            )
    elif signals.has_workspace_layout:
        primary_type = "monorepo"
        confidence = "high"
        reasons.append("Workspace-style directories or pnpm workspace config detected.")
        if signals.has_frontend:
            append_unique(secondary_traits, "Frontend application signals are also present.")
        if signals.has_backend:
            append_unique(secondary_traits, "Backend service signals are also present.")
        if signals.cli_entrypoints:
            append_unique(secondary_traits, "CLI tooling is also present.")
        if signals.has_package_json:
            append_unique(secondary_traits, "Package/distribution metadata is also present.")
        if has_skill_markers:
            append_unique(secondary_traits, "Embedded skill metadata is also present.")
            if has_primary_skill_markers:
                add_conflict(
                    "Root-level skill markers exist alongside workspace signals; confirm whether this repository is primarily a skill package or an application monorepo.",
                    severity="soft",
                )
    elif (signals.cli_entrypoints or signals.has_package_bin) and has_packaged_distribution and not has_strong_application_envelope:
        primary_type = "cli-tool"
        confidence = "high"
        if signals.cli_entrypoints and signals.has_package_bin:
            reasons.append("CLI-like entrypoints and package `bin` metadata were detected.")
        elif signals.cli_entrypoints:
            reasons.append("CLI-like entrypoints detected in `bin/` or `cli/`.")
        else:
            reasons.append("Package `bin` metadata indicates a CLI distribution surface.")
        if signals.has_package_json:
            append_unique(secondary_traits, "JavaScript package/distribution metadata is also present.")
        if signals.has_python_packaging:
            append_unique(secondary_traits, "Python packaging metadata is also present.")
        if signals.library_entrypoints:
            append_unique(secondary_traits, "Library-style entrypoints are also present.")
        if signals.has_frontend:
            add_conflict(
                "Frontend application signals exist alongside CLI entrypoints; confirm whether the CLI is the primary user surface."
            )
        if signals.has_backend:
            add_conflict(
                "Backend service signals exist alongside CLI entrypoints; confirm whether the CLI is the primary user surface."
            )
    elif signals.cli_entrypoints:
        reasons.append("CLI-like entrypoints detected in `bin/` or `cli/`.")
        open_questions.append(
            "CLI-like entrypoints were found without clear package metadata; confirm whether command files are examples, fixtures, or the primary product surface."
        )

    if primary_type == "unknown" and signals.has_frontend and signals.has_backend:
        primary_type = "web-app"
        confidence = "high"
        reasons.append("Both frontend and backend roots were detected.")
        if signals.cli_entrypoints or signals.has_package_bin:
            append_unique(secondary_traits, "CLI distribution surface is also present.")
        if signals.has_package_json:
            append_unique(secondary_traits, "JavaScript package/distribution metadata is also present.")
        if signals.has_python_packaging:
            append_unique(secondary_traits, "Python packaging metadata is also present.")
        if has_skill_markers:
            append_unique(secondary_traits, "Embedded skill metadata is also present.")
            if has_primary_skill_markers:
                add_conflict(
                    "Root-level skill markers exist alongside web-app signals; confirm whether this repository is primarily a skill package or an application.",
                    severity="soft",
                )

    if primary_type == "unknown" and signals.has_backend and not signals.has_frontend:
        primary_type = "backend-service"
        confidence = "medium"
        reasons.append("Backend-like Python service structure detected without a separate frontend.")
        if signals.cli_entrypoints or signals.has_package_bin:
            append_unique(secondary_traits, "CLI distribution surface is also present.")
        if signals.has_python_packaging:
            append_unique(secondary_traits, "Python packaging metadata is also present.")

    if primary_type == "unknown" and signals.has_package_json and not signals.has_frontend and not signals.has_backend:
        if has_build_deps or signals.library_entrypoints:
            primary_type = "library-sdk"
            confidence = "medium"
            reasons.append("Package manifest suggests a library or tool package.")
            if signals.cli_entrypoints:
                append_unique(secondary_traits, "CLI distribution surface is also present.")
            if signals.has_python_packaging:
                add_conflict(
                    "Both JavaScript and Python packaging metadata are present; confirm which install surface is canonical."
                )
        elif signals.package_name:
            open_questions.append(
                f"Package `{signals.package_name}` was detected, but repository type still needs human confirmation."
            )

    if primary_type == "unknown" and signals.has_python_packaging and not signals.has_backend:
        primary_type = "library-sdk"
        confidence = "medium"
        reasons.append("Python packaging files detected without service-style app layout.")
        if signals.cli_entrypoints:
            append_unique(secondary_traits, "CLI distribution surface is also present.")

    if primary_type == "unknown" and has_skill_markers:
        primary_type = "skill-meta"
        confidence = "medium"
        reasons.append("Skill markers were detected, but the repository shape remained ambiguous.")

    if primary_type == "unknown" and signals.top_level_files:
        open_questions.append(
            "Repository shape was not strongly classified; confirm whether this is an app, library, or tooling repo."
        )

    confidence = reduce_confidence(confidence, hard_conflicts=hard_conflicts, soft_conflicts=soft_conflicts)

    return RepoClassification(
        primary_type=primary_type,
        confidence=confidence,
        reasons=reasons,
        secondary_traits=secondary_traits,
        conflicting_signals=conflicting_signals,
        open_questions=open_questions,
    )


def apply_repo_type_override(
    classification: RepoClassification,
    forced_primary_type: Optional[str],
) -> RepoClassification:
    if not forced_primary_type:
        return classification

    reasons = [f"Repo type overridden via CLI: `{forced_primary_type}`."]
    reasons.extend(classification.reasons)

    conflicting_signals = list(classification.conflicting_signals)
    if classification.primary_type != forced_primary_type:
        conflicting_signals.insert(
            0,
            f"Automatic classification would have selected `{classification.primary_type}` instead.",
        )

    return RepoClassification(
        primary_type=forced_primary_type,
        confidence="high",
        reasons=reasons,
        secondary_traits=list(classification.secondary_traits),
        conflicting_signals=conflicting_signals,
        open_questions=list(classification.open_questions),
    )


def detect_repo_type(
    root: Path,
    frontend_root: Optional[Path],
    backend_root: Optional[Path],
    cli_entrypoints: Sequence[Path],
) -> Tuple[str, List[str], List[str]]:
    skill_meta = detect_skill_metadata(root)
    signals = collect_repo_signals(
        root,
        frontend_root,
        backend_root,
        cli_entrypoints,
        detect_library_entrypoints(root),
        skill_meta,
    )
    classification = classify_repo(signals)
    return (
        classification.primary_type,
        classification.reasons,
        classification.open_questions,
    )

