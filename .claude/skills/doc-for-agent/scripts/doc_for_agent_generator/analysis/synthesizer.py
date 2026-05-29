from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

from ..models import DocumentationInventory
from ..utils import read_text
from .scanner import sort_paths

ROLE_CONCLUSION_PREFIXES: Dict[str, Tuple[str, ...]] = {
    "product": (
        "Product positioning:",
        "Repository adaptation scope:",
        "Retention value:",
        "Product usage context:",
    ),
    "architecture": (
        "CLI boundary:",
        "Source-of-truth boundary:",
        "Distribution structure:",
    ),
    "execution": (
        "Execution contract:",
        "Verification gate:",
        "Execution constraints:",
    ),
    "memory": (),
}
def supporting_doc_roles(path: Path, root: Path) -> List[str]:
    normalized = str(path.relative_to(root)).replace("\\", "/").lower()
    roles: List[str] = []
    if normalized == "readme.md" or normalized.startswith("docs/product/") or normalized.startswith("specs/"):
        roles.append("product")
    if normalized == "readme.md":
        roles.append("execution")
        roles.append("architecture")
    if (
        normalized.startswith("docs/architecture/")
        or "/architecture/" in normalized
        or normalized.startswith("docs/adr")
        or "adr" in path.name.lower()
        or "platform" in path.name.lower()
    ):
        roles.append("architecture")
    if (
        normalized.startswith("plan/")
        or normalized.startswith("roadmap/")
        or "runbook" in path.name.lower()
        or "quickstart" in path.name.lower()
        or "getting-started" in path.name.lower()
        or "platform" in path.name.lower()
    ):
        roles.append("execution")
    if any(token in normalized for token in ("progress", "lessons", "handoff", "status")):
        roles.append("memory")
    if not roles and normalized.startswith("docs/"):
        roles.append("product")
    return roles


def normalize_snippet_key(text: str) -> str:
    lowered = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    tokens = [token for token in lowered.split() if len(token) >= 3]
    return " ".join(tokens[:8])


def clean_doc_line(line: str) -> str:
    line = re.sub(r"^#+\s*", "", line.strip())
    line = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", line)
    line = line.replace("`", "")
    line = re.sub(r"\s+", " ", line.strip())
    return line.rstrip(" .")


def extract_supporting_doc_snippets(text: str) -> List[str]:
    snippets: List[str] = []
    in_code_block = False
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block or not stripped:
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            continue

        candidate = ""
        if stripped.startswith("#"):
            heading = stripped.lstrip("#").strip()
            if len(heading.split()) >= 4:
                candidate = heading
        elif re.match(r"^[-*]\s+", stripped):
            candidate = re.sub(r"^[-*]\s+", "", stripped).strip()
        elif re.match(r"^\d+\.\s+", stripped):
            candidate = re.sub(r"^\d+\.\s+", "", stripped).strip()
        elif len(stripped) >= 24:
            candidate = stripped

        cleaned = clean_doc_line(candidate)
        if not cleaned:
            continue
        snippets.append(cleaned)
        if len(snippets) >= 12:
            break
    return snippets


def extract_execution_command_snippets(text: str) -> List[str]:
    commands: List[str] = []
    in_code_block = False
    code_lang = ""
    command_prefixes = (
        "docagent",
        "python",
        "python3",
        "pipx",
        "pip ",
        "npm",
        "pnpm",
        "yarn",
        "npx",
        "uv ",
        "pytest",
    )

    def add_command(raw: str) -> None:
        candidate = raw.strip()
        if candidate.startswith("$"):
            candidate = candidate[1:].strip()
        if not candidate:
            return
        if not any(candidate.startswith(prefix) for prefix in command_prefixes):
            return
        formatted = f"Run `{candidate}`"
        if formatted not in commands:
            commands.append(formatted)

    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lang = stripped[3:].strip().lower()
            else:
                in_code_block = False
                code_lang = ""
            continue
        if not in_code_block:
            continue
        if code_lang and code_lang not in {"bash", "sh", "zsh", "shell", "console"}:
            continue
        add_command(stripped)
        if len(commands) >= 8:
            break

    if len(commands) < 8:
        for raw_line in text.splitlines():
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            bullet = re.sub(r"^[-*]\s+", "", stripped).strip()
            bullet = re.sub(r"^\d+\.\s+", "", bullet).strip()
            if bullet.startswith("`") and bullet.endswith("`") and len(bullet) > 2:
                bullet = bullet[1:-1].strip()
            add_command(bullet)
            if len(commands) >= 8:
                break

    if len(commands) < 8:
        for inline in re.findall(r"`([^`]+)`", text):
            add_command(inline)
            if len(commands) >= 8:
                break
    return commands


def extract_distribution_snippets(text: str, role: str) -> List[str]:
    snippets: List[str] = []
    in_code_block = False
    role_tokens = {
        "product": ("human", "agent", "dual", "workflow", "users", "maintainer"),
        "architecture": ("platform", "adapter", "distribution", "cli", "entry", "python", "npm", "npx"),
    }
    shared_tokens = ("docagent", "codex", "claude", "continue", "copilot")
    tokens = role_tokens.get(role, ()) + shared_tokens
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block or not stripped:
            continue
        plain = normalize_distribution_snippet_line(stripped)
        lowered = plain.lower()
        if len(plain) < 20 or len(plain) > 180:
            continue
        if not any(token in lowered for token in tokens):
            continue
        cleaned = clean_doc_line(plain)
        if len(cleaned) < 20:
            continue
        if cleaned and cleaned not in snippets:
            snippets.append(cleaned)
        if len(snippets) >= 4:
            break
    return snippets


def normalize_distribution_snippet_line(line: str) -> str:
    stripped = re.sub(r"^[-*]\s+", "", line.strip())
    if not stripped:
        return ""
    if stripped.startswith("|") and stripped.endswith("|"):
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if not cells or all(not cell for cell in cells):
            return ""
        lowered_cells = [cell.lower() for cell in cells]
        if all(set(cell) <= {"-", ":"} for cell in lowered_cells if cell):
            return ""
        if len(cells) >= 2 and any("docagent" in cell.lower() for cell in cells):
            platform = cells[0]
            command = next((cell for cell in cells[1:] if "docagent" in cell.lower()), "")
            summary = next((cell for cell in cells[1:] if cell and cell != command), "")
            if command and summary:
                return f"{platform} uses {command} ({summary})"
            if command:
                return f"{platform} uses {command}"
    return stripped


def snippet_priority(role: str, snippet: str) -> int:
    lowered = snippet.lower()
    score = 0
    if "source of truth" in lowered:
        score += 4
    if "docagent" in lowered:
        score += 3
    if any(token in lowered for token in ("codex", "claude", "continue", "copilot", "coding-agent")):
        score += 3
    if role == "execution":
        if snippet.startswith("Run `"):
            score += 6
        if any(token in lowered for token in ("verify", "test", "lint", "build", "quickstart", "workflow")):
            score += 2
    if role == "architecture":
        if any(token in lowered for token in ("platform", "distribution", "adapter", "cli", "entrypoint", "entrypoint", "source of truth")):
            score += 2
    if role == "product":
        if any(token in lowered for token in ("human", "agent", "dual", "users", "maintainer", "workflow")):
            score += 2
    if any(token in lowered for token in ("this repository", "documentation notes", "broad project context")):
        score -= 2
    return score


def is_low_value_snippet(role: str, snippet: str) -> bool:
    lowered = snippet.lower()
    if role == "execution" and snippet.startswith("Run `"):
        return False
    if snippet.endswith(":") and len(snippet.split()) <= 8:
        return True
    generic_titles = (
        "platform guide",
        "quickstart",
        "install matrix",
        "product cli",
        "pick your agent",
        "docs",
        "next command",
        "distribution model",
        "multi agent setup",
        "init",
        "refresh",
        "verify",
        "install",
    )
    if lowered in generic_titles:
        return True
    word_count = len(lowered.split())
    if role in {"product", "architecture"} and word_count <= 2 and "docagent" not in lowered:
        return True
    low_value_prefixes = (
        "this repository contains",
        "this repository appears to",
        "this project appears to",
        "it appears to",
        "it likely",
        "likely",
        "inferred",
        "additional documentation context",
        "another long descriptive line",
        "yet another descriptive",
        "final descriptive line",
        "platform table repo",
        "layered docs",
    )
    if any(lowered.startswith(prefix) for prefix in low_value_prefixes):
        return True
    return False


def extract_commands_from_snippets(snippets: Sequence[str]) -> List[str]:
    commands: List[str] = []
    for snippet in snippets:
        matches = re.findall(r"`([^`]+)`", snippet)
        for command in matches:
            normalized = command.strip()
            if not normalized:
                continue
            if any(
                normalized.startswith(prefix)
                for prefix in ("docagent", "python", "python3", "npm", "pnpm", "yarn", "npx", "pipx", "pytest", "uv")
            ):
                if normalized not in commands:
                    commands.append(normalized)
    return commands


def extract_source_of_truth_paths(snippets: Sequence[str], aggregate_text: str) -> List[str]:
    candidates: List[str] = []
    path_pattern = re.compile(r"`([^`]+(?:/[^`]+)*\.[a-z0-9_-]+)`", re.IGNORECASE)
    for snippet in snippets:
        for match in path_pattern.findall(snippet):
            normalized = match.strip()
            if normalized and normalized not in candidates:
                candidates.append(normalized)

    common_files = (
        "readme.md",
        "skill.md",
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "docs/platforms.md",
        "docs/platforms.zh.md",
        "docs/quickstart.md",
    )
    lowered = aggregate_text.lower()
    for filename in common_files:
        if filename in lowered and filename not in candidates:
            candidates.append(filename)
    return candidates[:4]


def find_docagent_command(commands: Sequence[str], subcommand: str) -> str:
    prefix = f"docagent {subcommand}"
    return next((cmd for cmd in commands if cmd.startswith(prefix)), "")


def extract_output_mode(command: str) -> str:
    match = re.search(r"--output-mode\s+([a-z0-9_-]+)", command)
    if not match:
        return ""
    return match.group(1).strip()


def is_role_conclusion_line(role: str, line: str) -> bool:
    prefixes = ROLE_CONCLUSION_PREFIXES.get(role, ())
    return any(line.startswith(prefix) for prefix in prefixes)


def collect_platform_command_facts(snippets: Sequence[str]) -> List[Tuple[str, str]]:
    facts: List[Tuple[str, str]] = []
    seen: set[Tuple[str, str]] = set()
    pattern = re.compile(r"^\s*([A-Za-z][A-Za-z0-9 +/_-]{1,40})\s+uses\s+(docagent\s+[a-z0-9][^()]+)", re.IGNORECASE)
    for snippet in snippets:
        match = pattern.match(snippet.strip())
        if not match:
            continue
        platform = match.group(1).strip()
        command = match.group(2).strip()
        key = (platform.lower(), command)
        if key in seen:
            continue
        seen.add(key)
        facts.append((platform, command))
        if len(facts) >= 3:
            break
    return facts


def synthesize_role_conclusion_lines(role: str, aggregate_text: str, snippets: Sequence[str]) -> List[str]:
    lines: List[str] = []
    lowered = aggregate_text.lower()
    commands = extract_commands_from_snippets(snippets)

    if role == "execution":
        verify_commands = [
            cmd
            for cmd in commands
            if any(token in cmd for token in ("test", "lint", "build", "check", "verify", "doctor"))
        ]
        preferred_verify_order = ("doctor", "lint", "typecheck", "test", "build", "check", "verify")
        ordered_verify_commands: List[str] = []
        for token in preferred_verify_order:
            for cmd in verify_commands:
                if token in cmd and cmd not in ordered_verify_commands:
                    ordered_verify_commands.append(cmd)
        for cmd in verify_commands:
            if cmd not in ordered_verify_commands:
                ordered_verify_commands.append(cmd)
        init_command = find_docagent_command(commands, "init")
        refresh_command = find_docagent_command(commands, "refresh")
        doctor_command = find_docagent_command(commands, "doctor")
        generate_command = find_docagent_command(commands, "generate")
        if init_command and refresh_command:
            if doctor_command:
                lines.append(
                    f"Execution contract: `{init_command}` -> `{refresh_command}` -> `{doctor_command}` is the documented command order for setup, sync, and drift checks."
                )
            elif verify_commands:
                lines.append(
                    f"Execution contract: `{init_command}` -> `{refresh_command}` -> verify with `{verify_commands[0]}` is the documented order for setup and release readiness."
                )
            else:
                lines.append(
                    f"Execution contract: run `{init_command}` once to establish docs, then `{refresh_command}` after repo changes to keep outputs synchronized."
                )
        elif init_command and doctor_command:
            lines.append(
                f"Execution contract: use `{init_command}` for setup and `{doctor_command}` as a repeatable drift check before release."
            )
        elif generate_command:
            lines.append(f"Execution contract: `{generate_command}` is treated as the generation step in this repository workflow.")
        if ordered_verify_commands:
            summary = ", ".join(f"`{cmd}`" for cmd in ordered_verify_commands[:3])
            lines.append(f"Verification gate: workflow changes are not complete until {summary} pass.")
            decision_order = "; ".join(f"{index + 1}) `{cmd}`" for index, cmd in enumerate(ordered_verify_commands[:3]))
            lines.append(
                f"Verification order: {decision_order}; stop at the first failing command before running later checks."
            )
        triage_steps: List[str] = []
        if doctor_command or "docagent doctor" in lowered:
            triage_steps.append("run `docagent doctor` first to catch install/config drift")
        elif ordered_verify_commands:
            triage_steps.append(f"rerun the first failing gate (`{ordered_verify_commands[0]}`) to isolate command scope")
        if "readme.md" in lowered:
            triage_steps.append("reconcile command context with `README.md`")
        if "quickstart" in lowered:
            triage_steps.append("cross-check setup assumptions in `docs/quickstart.md`")
        if any(token in lowered for token in ("ci", "github actions", "workflow")):
            triage_steps.append("inspect CI logs for command/environment mismatches")
        triage_steps.append("if failures persist, roll back generated docs to last known-good state and rerun `docagent refresh`")
        triage_priority = "; ".join(f"{index + 1}) {step}" for index, step in enumerate(triage_steps))
        lines.append(f"Failure triage priority: {triage_priority}.")
        constraints: List[str] = []
        if any("--target" in cmd for cmd in commands if cmd.startswith("docagent ")):
            constraints.append("keep `--target <repo-root>` explicit when commands run outside the target repo")
        refresh_mode = extract_output_mode(refresh_command) if refresh_command else ""
        if refresh_mode:
            constraints.append(f"keep `--output-mode {refresh_mode}` consistent across refresh runs")
        if any("--ai " in cmd for cmd in commands if cmd.startswith("docagent ")):
            constraints.append("declare `--ai <platform>` explicitly so platform routing stays deterministic")
        if constraints:
            lines.append(f"Execution constraints: {'; '.join(constraints)}.")
    elif role == "architecture":
        platform_facts = collect_platform_command_facts(snippets)
        platforms = [name for name in ("codex", "claude", "continue", "copilot") if name in lowered]
        if platforms and "docagent" in lowered:
            labels = ", ".join(f"`{name}`" for name in platforms)
            lines.append(f"CLI boundary: keep `docagent` as the single entry surface for {labels} workflows.")
        source_paths = extract_source_of_truth_paths(snippets, aggregate_text)
        if source_paths and any(token in lowered for token in ("source of truth", "canonical", "readme.md", "entry", "distribution")):
            labels = ", ".join(f"`{path}`" for path in source_paths[:3])
            build_anchors: List[str] = []
            for marker in ("package.json", "pyproject.toml", "requirements.txt"):
                if marker in lowered:
                    build_anchors.append(f"`{marker}`")
            if build_anchors:
                anchors = ", ".join(build_anchors[:2])
                lines.append(
                    f"Source-of-truth boundary: on conflicts, arbitrate against {labels} and build-path anchors ({anchors}) before changing CLI entry, adapter wiring, or distribution behavior."
                )
                lines.append(
                    f"Build-path rule: if platform entry or packaging behavior breaks, inspect {anchors} before changing adapter/config mappings."
                )
                lines.append(
                    f"Conflict handling order: 1) check {labels}; 2) validate build anchors ({anchors}); 3) then edit adapter/config mappings."
                )
            else:
                lines.append(
                    f"Source-of-truth boundary: on conflicts, arbitrate against {labels} before changing CLI entry, adapter wiring, or distribution behavior."
                )
                lines.append(f"Conflict handling order: 1) check {labels}; 2) then edit adapter/config mappings.")
        if platform_facts or ("docagent" in lowered and any(token in lowered for token in ("distribution", "adapter", "platform"))):
            if platform_facts:
                labels = "; ".join(f"`{platform}` -> `{command}`" for platform, command in platform_facts[:2])
                lines.append(
                    f"Distribution structure: keep platform mappings in adapter/config docs ({labels}) while CLI contract changes stay centralized."
                )
            else:
                lines.append(
                    "Distribution structure: platform-specific differences should stay in adapter/config documents while CLI contract changes stay centralized."
                )
    elif role == "product":
        doctor_command = find_docagent_command(commands, "doctor")
        migrate_command = find_docagent_command(commands, "migrate")
        if "docagent" in lowered and any(token in lowered for token in ("coding-agent", "codex", "claude", "continue", "copilot", "cli")):
            lines.append("Product positioning: this repository is scoped for CLI coding-agent workflows, not a standalone end-user application.")
            lines.append(
                "Positioning guardrail: describe `docagent` as an ongoing documentation system (`init/refresh/doctor/migrate`), not a one-shot markdown generator."
            )
        if all(token in lowered for token in ("initialize", "migrate", "refresh")) or all(
            token in lowered for token in ("init", "migrate", "refresh")
        ):
            lines.append("Repository adaptation scope: cover initialize, migrate, and refresh paths so existing and messy docs can converge to one system.")
        elif "docagent" in lowered and any(token in lowered for token in ("refresh", "migrate", "doctor")):
            lines.append("Repository adaptation scope: fit repositories that need ongoing refresh/governance workflows, not one-off documentation scans.")
        if "docagent init" in lowered and "docagent refresh" in lowered:
            if doctor_command or "docagent doctor" in lowered:
                lines.append(
                    "Retention value: prioritize repeatable `init -> refresh -> doctor` lifecycle checks so documentation stays governable, not a one-shot generator output."
                )
            elif migrate_command or "migrate" in lowered:
                lines.append(
                    "Retention value: prioritize repeatable `init -> refresh` updates plus `migrate` for legacy-doc consolidation, not one-shot document dumps."
                )
            else:
                lines.append(
                    "Retention value: prioritize repeatable `init -> refresh` lifecycle updates so outputs remain maintainable, not one-shot generation."
                )
        if all(token in lowered for token in ("human", "agent", "dual")) and "docagent" in lowered:
            lines.append("Product usage context emphasizes `human / agent / dual` outputs within the same workflow contract.")
    limit_by_role = {
        "product": 4,
        "architecture": 5,
        "execution": 5,
        "memory": 3,
    }
    return lines[: limit_by_role.get(role, 3)]


def summarize_sources(paths: Sequence[Path], root: Path) -> str:
    labels: List[str] = []
    for path in paths[:2]:
        relative = str(path.relative_to(root)).replace("\\", "/")
        labels.append(f"`{relative}`")
    if not labels:
        return ""
    if len(paths) > 2:
        return f"{', '.join(labels)} (+{len(paths) - 2} more)"
    return ", ".join(labels)


def synthesize_role_supporting_insights(root: Path, paths: Sequence[Path], role: str) -> Dict[str, List[str]]:
    confirmed_groups: Dict[str, Tuple[str, List[Path], int]] = {}
    unresolved_groups: Dict[str, Tuple[str, List[Path], int]] = {}
    explicit_conflicts: Dict[str, Tuple[str, List[Path], int]] = {}
    aggregate_text = ""

    unresolved_pattern = re.compile(r"\b(todo|tbd|pending|open question|unresolved|confirm|decide)\b|\?", re.IGNORECASE)
    explicit_conflict_pattern = re.compile(r"\b(conflict|inconsistent|contradict|not aligned|vs\.?)\b", re.IGNORECASE)
    collected_snippets: List[str] = []

    for path in paths:
        text = read_text(path)
        aggregate_text += "\n" + text.lower()
        primary_snippets: List[str] = []
        if role == "execution":
            primary_snippets.extend(extract_execution_command_snippets(text))
        if role in {"product", "architecture"}:
            primary_snippets.extend(extract_distribution_snippets(text, role))
        secondary_snippets = extract_supporting_doc_snippets(text)
        snippets = primary_snippets + secondary_snippets
        for snippet in snippets:
            if is_low_value_snippet(role, snippet):
                continue
            collected_snippets.append(snippet)
            key = normalize_snippet_key(snippet)
            if not key:
                continue
            score = snippet_priority(role, snippet)

            target = confirmed_groups
            if unresolved_pattern.search(snippet):
                target = unresolved_groups
            elif explicit_conflict_pattern.search(snippet):
                target = explicit_conflicts

            if key not in target:
                target[key] = (snippet, [path], score)
            else:
                existing_text, existing_paths, existing_score = target[key]
                if score > existing_score or (score == existing_score and len(snippet) < len(existing_text)):
                    existing_text = snippet
                    existing_score = score
                if path not in existing_paths:
                    existing_paths.append(path)
                target[key] = (existing_text, existing_paths, existing_score)

    for index, line in enumerate(synthesize_role_conclusion_lines(role, aggregate_text, collected_snippets)):
        key = normalize_snippet_key(line)
        if not key:
            continue
        existing = confirmed_groups.get(key)
        boosted_score = 120 - index
        if not existing or existing[2] < boosted_score:
            confirmed_groups[key] = (line, [], boosted_score)

    conflicting: List[str] = []
    package_managers = sorted(set(re.findall(r"\b(npm|pnpm|yarn)\b", aggregate_text)))
    if len(package_managers) >= 2:
        conflicting.append(
            f"Supporting docs disagree on package manager ({', '.join(f'`{name}`' for name in package_managers)})."
        )
    runtimes = sorted(set(re.findall(r"\b(fastapi|flask|django|express|fastify|koa|nestjs)\b", aggregate_text)))
    if len(runtimes) >= 2:
        conflicting.append(
            f"Supporting docs disagree on runtime/framework ({', '.join(f'`{name}`' for name in runtimes)})."
        )

    for snippet, snippet_paths, _ in sorted(explicit_conflicts.values(), key=lambda item: (-item[2], len(item[0]))):
        sources = summarize_sources(snippet_paths, root)
        conflicting.append(f"{snippet} (sources: {sources})" if sources else snippet)

    if role == "architecture" and conflicting:
        source_paths = extract_source_of_truth_paths(collected_snippets, aggregate_text)
        if source_paths:
            labels = ", ".join(f"`{path}`" for path in source_paths[:3])
            conflicting.insert(
                0,
                f"Conflict rule: when supporting docs disagree, treat {labels} as the arbitration point before changing CLI, adapter, or build-path behavior.",
            )

    confirmed_raw: List[Tuple[str, List[Path], int]] = sorted(
        confirmed_groups.values(),
        key=lambda item: (-item[2], len(item[0])),
    )
    confirmed_conclusions: List[str] = []
    confirmed_evidence: List[str] = []
    for snippet, snippet_paths, _ in confirmed_raw:
        sources = summarize_sources(snippet_paths, root)
        rendered = f"{snippet} (sources: {sources})" if sources else snippet
        if is_role_conclusion_line(role, snippet):
            confirmed_conclusions.append(rendered)
        else:
            confirmed_evidence.append(rendered)

    evidence_limit_by_role = {
        "product": 2,
        "architecture": 2,
        "execution": 3,
        "memory": 4,
    }
    confirmed = confirmed_conclusions + confirmed_evidence[: evidence_limit_by_role.get(role, 3)]

    unresolved: List[str] = []
    for snippet, snippet_paths, _ in sorted(unresolved_groups.values(), key=lambda item: (-item[2], len(item[0]))):
        sources = summarize_sources(snippet_paths, root)
        unresolved.append(f"{snippet} (sources: {sources})" if sources else snippet)

    return {
        "confirmed": confirmed[:6],
        "conflicting": conflicting[:4],
        "unresolved": unresolved[:5],
    }


def synthesize_supporting_doc_insights(root: Path, docs_inventory: DocumentationInventory) -> Dict[str, Dict[str, List[str]]]:
    role_paths: Dict[str, List[Path]] = {
        "product": [],
        "architecture": [],
        "execution": [],
        "memory": [],
    }
    for path in docs_inventory.reference_only_docs:
        roles = supporting_doc_roles(path, root)
        for role in roles:
            role_paths[role].append(path)

    insights: Dict[str, Dict[str, List[str]]] = {}
    for role, paths in role_paths.items():
        insights[role] = synthesize_role_supporting_insights(root, sort_paths(paths), role)
    return insights


def synthesize_supporting_doc_provenance(root: Path, docs_inventory: DocumentationInventory) -> Dict[str, List[str]]:
    role_paths: Dict[str, List[str]] = {
        "product": [],
        "architecture": [],
        "execution": [],
        "memory": [],
    }
    for path in docs_inventory.reference_only_docs:
        try:
            normalized = str(path.relative_to(root)).replace("\\", "/")
        except ValueError:
            normalized = str(path).replace("\\", "/")
        for role in supporting_doc_roles(path, root):
            if normalized not in role_paths[role]:
                role_paths[role].append(normalized)
    return role_paths

