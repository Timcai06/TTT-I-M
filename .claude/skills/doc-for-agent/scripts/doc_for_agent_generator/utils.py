from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Sequence


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def find_first_existing(root: Path, candidates: Sequence[str]) -> Optional[Path]:
    for candidate in candidates:
        path = root / candidate
        if path.exists():
            return path
    return None


def load_json(path: Path) -> Dict[str, object]:
    try:
        return json.loads(read_text(path))
    except json.JSONDecodeError:
        return {}


def extract_readme_summary(root: Path) -> str:
    readme = find_first_existing(root, ["README.md", "readme.md"])
    if not readme:
        return ""

    lines = read_text(readme).splitlines()
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(">"):
            return stripped.lstrip(">").strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("-") and not stripped.startswith("```"):
            return stripped
        if index > 40:
            break
    return ""


def extract_markdown_title(root: Path) -> str:
    readme = find_first_existing(root, ["README.md", "readme.md"])
    if not readme:
        return ""

    for line in read_text(readme).splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip(" *`")
    return ""


def infer_project_name(root: Path, explicit_name: Optional[str]) -> str:
    if explicit_name:
        return explicit_name

    title = extract_markdown_title(root)
    if title:
        return title

    return root.name or "project"


def rel_path(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def list_top_level_dirs(root: Path) -> List[str]:
    return sorted(
        [
            path.name
            for path in root.iterdir()
            if path.is_dir() and not path.name.startswith(".")
        ]
    )


def list_top_level_files(root: Path) -> List[str]:
    return sorted(
        [
            path.name
            for path in root.iterdir()
            if path.is_file() and not path.name.startswith(".")
        ]
    )


def find_files(root: Path, patterns: Sequence[str], limit: int = 12) -> List[Path]:
    matches: List[Path] = []
    seen = set()

    for pattern in patterns:
        for path in sorted(root.glob(pattern)):
            normalized = str(path.resolve())
            if path.is_file() and normalized not in seen:
                matches.append(path)
                seen.add(normalized)
            if len(matches) >= limit:
                return matches[:limit]

    return matches[:limit]
