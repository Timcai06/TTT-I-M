from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from ..models import DocumentationInventory, SkillMetadata
from ..utils import (
    find_files,
    find_first_existing,
    load_json,
    read_text,
)

FRONTEND_FRAMEWORK_PACKAGES = {"next", "react", "vue", "svelte", "astro"}
BACKEND_NODE_FRAMEWORK_PACKAGES = {"express", "fastify", "koa", "hono", "nestjs"}
FLAT_AGENTS_FILENAMES = {
    "README.md",
    "product.md",
    "architecture.md",
    "frontend.md",
    "backend.md",
    "workflows.md",
    "glossary.md",
}
LAYERED_AGENTS_PREFIXES = ("00-entry", "01-product", "02-architecture", "03-execution", "04-memory")
GENERATED_HUMAN_DOC_PATHS = {
    "docs/overview.md",
    "docs/architecture.md",
    "docs/workflows.md",
    "docs/glossary.md",
}


def load_package_metadata(package_path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    package = load_json(package_path)
    deps = {
        str(key): str(value)
        for key, value in {
            **(package.get("dependencies") or {}),
            **(package.get("devDependencies") or {}),
        }.items()
        if isinstance(key, str)
    }
    scripts = {
        str(key): str(value)
        for key, value in (package.get("scripts") or {}).items()
        if isinstance(key, str) and isinstance(value, str)
    }
    return deps, scripts


def collect_candidate_dirs(
    root: Path,
    fixed_rel_paths: Sequence[str],
    parent_dirs: Sequence[str],
) -> List[Path]:
    candidates: List[Path] = []
    seen: set[str] = set()

    def add(path: Path) -> None:
        resolved = str(path.resolve())
        if path.is_dir() and resolved not in seen:
            candidates.append(path)
            seen.add(resolved)

    for rel_path in fixed_rel_paths:
        add(root / rel_path)

    for parent_dir in parent_dirs:
        parent_path = root / parent_dir
        if not parent_path.is_dir():
            continue
        for child in sorted(parent_path.iterdir()):
            add(child)

    add(root)
    return candidates


def detect_frontend_root(root: Path) -> Optional[Path]:
    candidates = collect_candidate_dirs(
        root,
        fixed_rel_paths=(
            "frontend",
            "client",
            "web",
            "apps/web",
            "apps/frontend",
            "apps/client",
            "apps/site",
            "packages/web",
            "packages/frontend",
            "packages/client",
        ),
        parent_dirs=("apps", "packages"),
    )

    for candidate in candidates:
        package_json = candidate / "package.json"
        if not package_json.exists():
            continue
        deps, _ = load_package_metadata(package_json)
        if FRONTEND_FRAMEWORK_PACKAGES.intersection(deps):
            return candidate
    return None


def detect_backend_root(root: Path) -> Optional[Path]:
    candidates = collect_candidate_dirs(
        root,
        fixed_rel_paths=(
            "backend",
            "api",
            "server",
            "services/api",
            "services/backend",
            "apps/api",
            "apps/server",
            "packages/api",
            "packages/server",
        ),
        parent_dirs=("services", "apps", "packages"),
    )

    for candidate in candidates:
        if (candidate / "app").exists() or (candidate / "requirements.txt").exists() or (candidate / "requirements-dev.txt").exists():
            if candidate != root or (candidate / "app").exists():
                return candidate

        package_json = candidate / "package.json"
        if not package_json.exists():
            continue
        deps, scripts = load_package_metadata(package_json)
        if BACKEND_NODE_FRAMEWORK_PACKAGES.intersection(deps):
            if candidate != root or {"start", "dev", "serve"}.intersection(scripts):
                return candidate

    return None


def detect_package_manager(frontend_root: Optional[Path], repo_root: Path) -> str:
    candidates = [
        repo_root / "pnpm-lock.yaml",
        repo_root / "yarn.lock",
        repo_root / "package-lock.json",
    ]
    if frontend_root:
        candidates.extend(
            [
                frontend_root / "pnpm-lock.yaml",
                frontend_root / "yarn.lock",
                frontend_root / "package-lock.json",
            ]
        )

    for path in candidates:
        if path.name == "pnpm-lock.yaml" and path.exists():
            return "pnpm"
        if path.name == "yarn.lock" and path.exists():
            return "yarn"
        if path.name == "package-lock.json" and path.exists():
            return "npm"

    return "npm"


def describe_frontend(frontend_root: Optional[Path]) -> Tuple[str, List[str], List[str], Dict[str, str]]:
    if not frontend_root:
        return ("No dedicated frontend detected.", [], [], {})

    package_json = frontend_root / "package.json"
    package = load_json(package_json)
    deps = {
        **(package.get("dependencies") or {}),
        **(package.get("devDependencies") or {}),
    }
    scripts = package.get("scripts") or {}

    stack_parts: List[str] = []
    if "next" in deps:
        stack_parts.append(f"Next.js {deps['next']}")
    if "react" in deps:
        stack_parts.append(f"React {deps['react']}")
    if "tailwindcss" in deps:
        stack_parts.append(f"TailwindCSS {deps['tailwindcss']}")
    if "vite" in deps:
        stack_parts.append(f"Vite {deps['vite']}")
    if "vue" in deps:
        stack_parts.append(f"Vue {deps['vue']}")
    if not stack_parts:
        stack_parts.append("Frontend package.json detected, but no common framework was recognized")

    route_root = find_first_existing(frontend_root, ["app", "src/app", "pages", "src/pages"])
    routes = detect_routes(route_root, frontend_root) if route_root else []

    component_root = find_first_existing(frontend_root, ["src/components", "components"])
    components: List[str] = []
    if component_root:
        components = [
            str(path.relative_to(frontend_root)).replace("\\", "/")
            for path in sorted(component_root.glob("*.tsx"))
        ][:8]

    normalized_scripts = {
        str(key): str(value)
        for key, value in scripts.items()
        if isinstance(key, str) and isinstance(value, str)
    }
    return (", ".join(stack_parts), routes, components, normalized_scripts)


def detect_routes(route_root: Path, frontend_root: Path) -> List[str]:
    routes: List[str] = []
    for file_path in sorted(route_root.rglob("page.tsx")):
        relative = file_path.relative_to(route_root)
        parts = list(relative.parts[:-1])
        route_parts = []
        for part in parts:
            if part.startswith("(") and part.endswith(")"):
                continue
            route_parts.append(part)
        route = "/" + "/".join(route_parts)
        routes.append(route if route != "/" else "/")

    if (frontend_root / "app/page.tsx").exists() or (frontend_root / "src/app/page.tsx").exists():
        if "/" not in routes:
            routes.insert(0, "/")

    return routes[:16]


def detect_backend_stack(backend_root: Optional[Path]) -> Tuple[str, List[str], List[str]]:
    if not backend_root:
        return ("No dedicated backend detected.", [], [])

    stack_parts: List[str] = []
    requirements = read_text(backend_root / "requirements.txt") + "\n" + read_text(backend_root / "requirements-dev.txt")
    requirements_lower = requirements.lower()
    if "fastapi" in requirements_lower:
        stack_parts.append("FastAPI")
    if "uvicorn" in requirements_lower:
        stack_parts.append("Uvicorn")
    if "flask" in requirements_lower:
        stack_parts.append("Flask")
    if "django" in requirements_lower:
        stack_parts.append("Django")
    if (backend_root / "pyproject.toml").exists():
        pyproject = read_text(backend_root / "pyproject.toml").lower()
        if "fastapi" in pyproject and "FastAPI" not in stack_parts:
            stack_parts.append("FastAPI")

    endpoints = detect_backend_endpoints(backend_root)
    storage_rules = detect_storage_rules(backend_root)
    if not stack_parts:
        stack_parts.append("Backend-like Python structure detected, but no common framework was recognized")
    return (", ".join(stack_parts), endpoints, storage_rules)


def detect_backend_endpoints(backend_root: Path) -> List[str]:
    endpoints: List[str] = []
    python_files = list((backend_root / "app").rglob("*.py")) if (backend_root / "app").exists() else list(backend_root.rglob("*.py"))
    pattern = re.compile(r"@(router|app)\.(get|post|put|delete|patch)\(\s*[\"']([^\"']+)[\"']")
    for path in python_files:
        text = read_text(path)
        for _, method, route in pattern.findall(text):
            label = f"{method.upper()} {route}"
            if label not in endpoints:
                endpoints.append(label)
    return endpoints[:16]


def detect_storage_rules(backend_root: Path) -> List[str]:
    rules: List[str] = []
    local_storage = backend_root / "app/storage/local.py"
    if local_storage.exists():
        rules.append("Local file storage is used for generated artifacts.")

    result_service = backend_root / "app/services/result_service.py"
    result_text = read_text(result_service)
    if "history-" in result_text and "zip" in result_text:
        rules.append("Historical exports appear to support zip bundle generation.")

    mapper = backend_root / "app/core/category_mapper.py"
    if mapper.exists():
        rules.append("Backend normalizes categories before returning them to clients.")

    return rules


def detect_scripts(repo_root: Path) -> List[str]:
    scripts_dir = repo_root / "scripts"
    if not scripts_dir.exists():
        return []
    return [
        str(path.relative_to(repo_root)).replace("\\", "/")
        for path in sorted(scripts_dir.iterdir())
        if path.is_file()
    ]


def detect_glossary(root: Path) -> List[str]:
    entries: List[str] = []
    mapper = find_first_existing(root, ["backend/app/core/category_mapper.py", "app/core/category_mapper.py"])
    mapper_text = read_text(mapper) if mapper else ""
    mapping_pairs = [
        ("crack", "裂缝"),
        ("breakage", "破损"),
        ("comb", "梳齿缺陷"),
        ("hole", "孔洞"),
        ("reinforcement", "钢筋外露"),
        ("seepage", "渗水"),
    ]
    for key, label in mapping_pairs:
        if key in mapper_text:
            entries.append(f"- `{key}`: `{label}`")
    return entries


def detect_result_contract(root: Path) -> List[str]:
    entries: List[str] = []
    types_path = find_first_existing(root, ["frontend/src/lib/types.ts", "src/lib/types.ts"])
    schemas_path = find_first_existing(root, ["backend/app/models/schemas.py", "app/models/schemas.py"])
    text_parts = []
    if types_path:
        text_parts.append(read_text(types_path))
    if schemas_path:
        text_parts.append(read_text(schemas_path))
    text = "\n".join(text_parts)
    for field in ["has_masks", "mask_detection_count", "model_version", "detections", "artifacts"]:
        if field in text:
            entries.append(f"- `{field}`")
    return entries


def detect_skill_metadata(root: Path) -> SkillMetadata:
    skill_file = find_first_existing(root, ["SKILL.md", "skill.md", "doc-for-agent/SKILL.md"])
    yaml_files = find_files(root, ["agents/*.yaml", "agents/*.yml", "*/agents/*.yaml", "*/agents/*.yml"], limit=8)
    references = find_files(root, ["references/*.md", "*/references/*.md"], limit=12)
    scripts = find_files(root, ["scripts/*", "*/scripts/*"], limit=12)

    skill_name = ""
    if skill_file:
        text = read_text(skill_file)
        name_match = re.search(r"^name:\s*(.+)$", text, re.MULTILINE)
        if name_match:
            skill_name = name_match.group(1).strip()

    return SkillMetadata(
        skill_file=skill_file,
        skill_name=skill_name,
        agent_manifests=yaml_files,
        references=references,
        scripts=scripts,
    )


def sort_paths(paths: Sequence[Path]) -> List[Path]:
    return sorted(paths, key=lambda path: str(path).replace("\\", "/"))


def discover_documentation_inventory(root: Path) -> DocumentationInventory:
    agent_roots = sort_paths(
        [
            path
            for path in root.rglob("*")
            if path.is_dir() and path.name == "AGENTS"
        ]
    )
    root_agents_dir = root / "AGENTS"
    if root_agents_dir.is_dir() and root_agents_dir not in agent_roots:
        agent_roots.insert(0, root_agents_dir)

    flat_agent_files: List[Path] = []
    layered_agent_files: List[Path] = []
    root_agent_files: List[Path] = []
    archive_candidates: List[Path] = []

    for agent_root in agent_roots:
        files = sort_paths([path for path in agent_root.rglob("*") if path.is_file()])
        if agent_root == root_agents_dir:
            root_agent_files.extend(files)

        for path in files:
            try:
                rel = path.relative_to(agent_root)
            except ValueError:
                continue
            normalized = str(rel).replace("\\", "/")
            parts = rel.parts
            if len(parts) == 1 and rel.name in FLAT_AGENTS_FILENAMES:
                flat_agent_files.append(path)
                if agent_root == root_agents_dir:
                    archive_candidates.append(path)
            if parts and parts[0] in LAYERED_AGENTS_PREFIXES:
                layered_agent_files.append(path)

    canonical_agents_root: Optional[Path]
    if root_agents_dir.is_dir():
        canonical_agents_root = root_agents_dir
    elif len(agent_roots) == 1:
        canonical_agents_root = agent_roots[0]
    elif agent_roots:
        layered_roots = [
            agent_root
            for agent_root in agent_roots
            if any((agent_root / prefix).exists() for prefix in LAYERED_AGENTS_PREFIXES)
        ]
        canonical_agents_root = layered_roots[0] if layered_roots else agent_roots[0]
    else:
        canonical_agents_root = root_agents_dir

    supporting_patterns = [
        "README.md",
        "CLAUDE.md",
        "docs/**/*.md",
        "plan/**/*.md",
        "notes/**/*.md",
        "specs/**/*.md",
        "roadmap/**/*.md",
    ]
    supporting_docs = sort_paths(find_files(root, supporting_patterns, limit=20))
    reference_only_docs = []
    for path in supporting_docs:
        if root_agents_dir in path.parents:
            continue
        try:
            normalized = str(path.relative_to(root)).replace("\\", "/")
        except ValueError:
            normalized = str(path).replace("\\", "/")
        if normalized in GENERATED_HUMAN_DOC_PATHS:
            continue
        reference_only_docs.append(path)

    if layered_agent_files and flat_agent_files:
        detected_state = "migrate"
    elif layered_agent_files:
        detected_state = "refresh"
    elif flat_agent_files or agent_roots:
        detected_state = "migrate"
    else:
        detected_state = "initialize"

    return DocumentationInventory(
        canonical_agents_root=canonical_agents_root,
        detected_state=detected_state,
        agent_roots=agent_roots,
        flat_agent_files=sort_paths(flat_agent_files),
        layered_agent_files=sort_paths(layered_agent_files),
        root_agent_files=sort_paths(root_agent_files),
        supporting_docs=supporting_docs,
        archive_candidates=sort_paths(archive_candidates),
        reference_only_docs=sort_paths(reference_only_docs),
    )


def detect_library_entrypoints(root: Path) -> List[Path]:
    return find_files(
        root,
        [
            "src/index.ts",
            "src/index.js",
            "src/index.py",
            "src/**/*.py",
            "src/**/*.ts",
            "src/**/*.tsx",
            "src/**/*.js",
            "*.py",
            "*.ts",
            "*.js",
        ],
        limit=8,
    )


def detect_cli_entrypoints(root: Path) -> List[Path]:
    return find_files(
        root,
        [
            "bin/*",
            "cli/**/*.ts",
            "cli/**/*.js",
            "cli/**/*.py",
        ],
        limit=8,
    )


def is_primary_skill_file(path: Optional[Path], root: Path) -> bool:
    if not path:
        return False
    try:
        rel = path.relative_to(root)
    except ValueError:
        return False
    return str(rel).replace("\\", "/") in {"SKILL.md", "skill.md", "doc-for-agent/SKILL.md"}


def is_primary_agent_manifest(path: Path, root: Path) -> bool:
    try:
        parts = path.relative_to(root).parts
    except ValueError:
        return False
    if not parts:
        return False
    if len(parts) >= 2 and parts[0] == "agents":
        return True
    if len(parts) >= 3 and parts[0] == "doc-for-agent" and parts[1] == "agents":
        return True
    return False
