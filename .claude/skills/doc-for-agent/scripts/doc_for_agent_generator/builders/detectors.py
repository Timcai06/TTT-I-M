from __future__ import annotations

from pathlib import Path
from typing import Dict, Sequence

from ..analysis import supporting_doc_roles
from ..models import RepoAnalysis
from ..utils import find_files, load_json, rel_path

from .helpers import extend_unique
def detect_unittest_commands(root: Path) -> list[str]:
    commands: list[str] = []
    unit_dirs = []
    for pattern in ("tests/unit", "*/tests/unit", "*/*/tests/unit"):
        unit_dirs.extend(sorted(path for path in root.glob(pattern) if path.is_dir()))

    seen = set()
    for unit_dir in unit_dirs:
        normalized = str(unit_dir.resolve())
        if normalized in seen:
            continue
        seen.add(normalized)
        commands.append(
            f"python3 -m unittest discover -s {rel_path(unit_dir, root)} -p 'test_*.py'"
        )
    return commands


def detect_verify_script_commands(root: Path) -> list[str]:
    scripts = find_files(
        root,
        [
            "tests/verify*.py",
            "*/tests/verify*.py",
            "*/*/tests/verify*.py",
            "scripts/verify*.py",
            "*/scripts/verify*.py",
        ],
        limit=8,
    )
    return [f"python3 {rel_path(path, root)}" for path in scripts]


def detect_generator_script(root: Path) -> Path | None:
    matches = find_files(
        root,
        [
            "scripts/init_agents_docs.py",
            "*/scripts/init_agents_docs.py",
        ],
        limit=1,
    )
    return matches[0] if matches else None


def detect_workspace_config_paths(root: Path) -> list[Path]:
    names = ("pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json")
    return [root / name for name in names if (root / name).exists()]


def detect_package_metadata_paths(root: Path) -> list[Path]:
    names = ("package.json", "pyproject.toml", "setup.py", "requirements.txt", "requirements-dev.txt")
    return [root / name for name in names if (root / name).exists()]


def supporting_docs_for_role(analysis: RepoAnalysis, role: str) -> list[Path]:
    role_paths: list[Path] = []
    for path in analysis.docs_inventory.reference_only_docs:
        if role in supporting_doc_roles(path, analysis.root):
            role_paths.append(path)
    return role_paths


def infer_source_of_truth_lines(analysis: RepoAnalysis) -> list[str]:
    lines: list[str] = []
    readme_path = analysis.root / "README.md"
    if readme_path.exists():
        lines.append("`README.md` for stated project goals, setup expectations, and user-facing examples")

    if analysis.repo_type == "skill-meta":
        if analysis.skill_meta.skill_file:
            lines.append(f"`{rel_path(analysis.skill_meta.skill_file, analysis.root)}` for trigger conditions and maintainer workflow")
        if analysis.skill_meta.agent_manifests:
            lines.append(
                f"`{rel_path(analysis.skill_meta.agent_manifests[0], analysis.root)}` for launcher/marketplace invocation metadata"
            )
        script_root = analysis.root / "doc-for-agent/scripts"
        if script_root.exists():
            lines.append("`doc-for-agent/scripts/` for generation behavior and repository scanning")
        reference_root = analysis.root / "doc-for-agent/references"
        if reference_root.exists():
            lines.append("`doc-for-agent/references/` for documentation structure and writing constraints")
    elif analysis.repo_type == "monorepo":
        for path in detect_workspace_config_paths(analysis.root):
            lines.append(f"`{rel_path(path, analysis.root)}` for workspace/package boundaries")
        if analysis.frontend_root:
            lines.append(f"`{rel_path(analysis.frontend_root, analysis.root)}` for frontend behavior and scripts")
        if analysis.backend_root:
            lines.append(f"`{rel_path(analysis.backend_root, analysis.root)}` for service/runtime behavior")
        root_package = analysis.root / "package.json"
        if root_package.exists():
            lines.append("`package.json` for root-level scripts and workspace orchestration")
    elif analysis.repo_type == "web-app":
        if analysis.frontend_root:
            lines.append(f"`{rel_path(analysis.frontend_root, analysis.root)}` for client routes, components, and UI scripts")
        if analysis.backend_root:
            lines.append(f"`{rel_path(analysis.backend_root, analysis.root)}` for API endpoints and runtime behavior")
        extend_unique(lines, [f"`{rel_path(path, analysis.root)}` for package/runtime metadata" for path in detect_package_metadata_paths(analysis.root)])
    elif analysis.repo_type == "backend-service":
        if analysis.backend_root:
            lines.append(f"`{rel_path(analysis.backend_root, analysis.root)}` for service logic and runtime wiring")
            extend_unique(
                lines,
                [
                    f"`{rel_path(path, analysis.root)}` for backend dependency/runtime configuration"
                    for path in detect_package_metadata_paths(analysis.backend_root)
                ],
            )
        if analysis.endpoints:
            lines.append("Backend route decorators are canonical for endpoint contract discovery")
    elif analysis.repo_type == "cli-tool":
        if analysis.cli_entrypoints:
            lines.append(f"`{rel_path(analysis.cli_entrypoints[0], analysis.root)}` as the primary command entrypoint")
        if analysis.script_files:
            lines.append("`scripts/` for operational helper commands and smoke checks")
        extend_unique(lines, [f"`{rel_path(path, analysis.root)}` for installation/distribution metadata" for path in detect_package_metadata_paths(analysis.root)])
    elif analysis.repo_type == "library-sdk":
        if analysis.library_entrypoints:
            lines.append(f"`{rel_path(analysis.library_entrypoints[0], analysis.root)}` as a likely public API entrypoint")
        extend_unique(lines, [f"`{rel_path(path, analysis.root)}` for package/runtime metadata" for path in detect_package_metadata_paths(analysis.root)])

    if not lines:
        if analysis.frontend_root:
            lines.append(f"`{rel_path(analysis.frontend_root, analysis.root)}` for frontend behavior and scripts")
        if analysis.backend_root:
            lines.append(f"`{rel_path(analysis.backend_root, analysis.root)}` for backend/runtime behavior")
    if not lines:
        lines.append("Needs human confirmation: identify the files agents should treat as canonical entrypoints")

    return lines


def detect_root_package_scripts(root: Path) -> Dict[str, str]:
    package_json = root / "package.json"
    if not package_json.exists():
        return {}
    package = load_json(package_json)
    scripts = package.get("scripts") or {}
    return {
        str(key): str(value)
        for key, value in scripts.items()
        if isinstance(key, str) and isinstance(value, str)
    }


def append_package_script_commands(lines: list[str], package_manager: str, scripts: Dict[str, str], keys: Sequence[str]) -> None:
    for key in keys:
        if key not in scripts:
            continue
        if package_manager == "yarn":
            command = f"yarn {key}"
        else:
            command = f"{package_manager} run {key}"
        if command not in lines:
            lines.append(command)


def product_entry_point_lines(analysis: RepoAnalysis) -> list[str]:
    if analysis.repo_type == "web-app" and analysis.routes:
        return [f"`{route}`" for route in analysis.routes[:8]]
    if analysis.repo_type == "backend-service" and analysis.endpoints:
        return [f"`{endpoint}`" for endpoint in analysis.endpoints[:8]]
    if analysis.repo_type == "cli-tool" and analysis.cli_entrypoints:
        return [f"`{rel_path(path, analysis.root)}`" for path in analysis.cli_entrypoints[:8]]
    if analysis.repo_type == "library-sdk" and analysis.library_entrypoints:
        return [f"`{rel_path(path, analysis.root)}`" for path in analysis.library_entrypoints[:8]]
    if analysis.repo_type == "skill-meta":
        lines: list[str] = []
        if analysis.skill_meta.skill_file:
            lines.append(f"`{rel_path(analysis.skill_meta.skill_file, analysis.root)}`")
        lines.extend(f"`{rel_path(path, analysis.root)}`" for path in analysis.skill_meta.agent_manifests[:6])
        if lines:
            return lines
    if analysis.routes:
        return [f"`{route}`" for route in analysis.routes[:8]]
    return []


