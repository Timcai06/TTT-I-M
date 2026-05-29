from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

from ..locales import STRINGS, get_ui_string
from ..models import RepoAnalysis
from ..translator import translate_to_zh
from ..utils import rel_path
SUPPORTED_DOC_PROFILES = ("bootstrap", "layered")
SUPPORTED_OUTPUT_MODES = ("agent", "human", "dual", "quad")
SUPPORTED_AGENT_LOCALES = ("en", "zh")
GENERATED_OUTPUT_ROOT = "dfa-doc"
AGENT_LOCALE_OUTPUT_ROOTS = {
    "en": f"{GENERATED_OUTPUT_ROOT}/AGENTS",
    "zh": f"{GENERATED_OUTPUT_ROOT}/AGENTS.zh",
}
SUPPORTED_HUMAN_LOCALES = ("en", "zh")
SUPPORTED_HUMAN_TEMPLATE_VARIANTS = ("paired-core",)
HUMAN_LOCALE_OUTPUT_ROOTS = {
    "en": f"{GENERATED_OUTPUT_ROOT}/handbook",
    "zh": f"{GENERATED_OUTPUT_ROOT}/handbook.zh",
}
DEFAULT_HUMAN_TEMPLATE_BY_LOCALE = {
    "en": "paired-core",
    "zh": "paired-core",
}
HUMAN_PAIRED_PATH_RULES = {
    "bootstrap": {
        "product": [
            ("product.md", "agent-facing product rules and scope guardrails"),
        ],
        "architecture": [
            ("architecture.md", "source-of-truth and repository boundary rules"),
        ],
        "execution": [
            ("workflows.md", "setup, verify, and failure-triage order"),
        ],
    },
    "layered": {
        "product": [
            ("01-product/001-core-goals.md", "agent-facing product rules and scope guardrails"),
            ("01-product/002-prd.md", "agent-facing user and outcome contract"),
            ("01-product/003-app-flow.md", "agent-facing flow and entry-surface notes"),
        ],
        "architecture": [
            ("02-architecture/004-tech-stack.md", "stack facts and platform anchors"),
            ("02-architecture/007-architecture-compatibility.md", "source-of-truth and compatibility rules"),
        ],
        "execution": [
            ("03-execution/008-implementation-plan.md", "setup, verify, and failure-triage order"),
        ],
    },
}


def format_bullets(items: Sequence[str], empty_line: str) -> str:
    if not items:
        return f"- {empty_line}"
    return "\n".join(f"- {item}" for item in items)


def resolve_human_output_root(human_locale: str) -> str:
    return HUMAN_LOCALE_OUTPUT_ROOTS.get(human_locale, HUMAN_LOCALE_OUTPUT_ROOTS["en"])


def resolve_agent_output_root(agent_locale: str) -> str:
    return AGENT_LOCALE_OUTPUT_ROOTS.get(agent_locale, AGENT_LOCALE_OUTPUT_ROOTS["en"])


def resolve_human_template_variant(human_locale: str, human_template_variant: str | None = None) -> str:
    if human_template_variant:
        return human_template_variant
    return DEFAULT_HUMAN_TEMPLATE_BY_LOCALE.get(human_locale, DEFAULT_HUMAN_TEMPLATE_BY_LOCALE["en"])


def format_path_bullets(paths: Sequence[Path], root: Path, empty_line: str) -> str:
    if not paths:
        return f"- {empty_line}"
    return "\n".join(f"- `{rel_path(path, root)}`" for path in paths)


def localize_lines(lines: Sequence[str], locale: str = "en") -> list[str]:
    if locale != "zh":
        return list(lines)
    return [translate_to_zh(line) for line in lines]


def supporting_doc_lines(paths: Sequence[Path], root: Path) -> list[str]:
    return [f"`{rel_path(path, root)}`" for path in paths]


def supporting_doc_insight_lines(analysis: RepoAnalysis, role: str, kind: str) -> list[str]:
    role_insights = analysis.supporting_doc_insights.get(role, {})
    values = role_insights.get(kind, [])
    return [value for value in values if value]


def supporting_doc_provenance_lines(analysis: RepoAnalysis, role: str) -> list[str]:
    return [f"`{path}`" for path in analysis.supporting_doc_provenance.get(role, [])]


def synthesis_summary_lines(analysis: RepoAnalysis, role: str) -> list[str]:
    role_insights = analysis.supporting_doc_insights.get(role, {})
    role_sources = analysis.supporting_doc_provenance.get(role, [])
    confirmed_count = len(role_insights.get("confirmed", []))
    conflicting_count = len(role_insights.get("conflicting", []))
    unresolved_count = len(role_insights.get("unresolved", []))
    lines = [
        f"Sources analyzed: `{len(role_sources)}`",
        f"Synthesized statements: `{confirmed_count}` confirmed, `{conflicting_count}` conflicting, `{unresolved_count}` unresolved",
    ]
    if not role_sources:
        lines.append("No supporting docs matched this role; content below is derived from repository structure and code signals.")
    return lines


def human_audience_lines(analysis: RepoAnalysis) -> list[str]:
    lines = [
        "Repository maintainers responsible for day-to-day delivery and operational stability.",
    ]
    if analysis.repo_type == "web-app":
        lines.append("Cross-functional engineers coordinating frontend and backend changes.")
    elif analysis.repo_type == "backend-service":
        lines.append("Backend operators and API maintainers responsible for service behavior.")
    elif analysis.repo_type == "cli-tool":
        lines.append("CLI maintainers preserving command UX and script compatibility.")
    elif analysis.repo_type == "library-sdk":
        lines.append("SDK maintainers preserving public API behavior for downstream consumers.")
    elif analysis.repo_type == "skill-meta":
        lines.append("Skill maintainers keeping manifests, prompts, and generator behavior aligned.")
    return lines


def human_inferred_lines(analysis: RepoAnalysis, role: str) -> list[str]:
    lines: list[str] = []
    if role == "product":
        if analysis.summary:
            lines.append(f"Project intent from README/code signals: {analysis.summary}")
        if analysis.classification.reasons:
            lines.append(f"Repo type signal: `{repo_type_label(analysis.repo_type)}` ({analysis.classification.reasons[0]})")
        if analysis.routes:
            lines.append(f"User-facing flow includes routes such as {', '.join(f'`{route}`' for route in analysis.routes[:3])}.")
        if analysis.endpoints:
            lines.append(f"Service-facing flow includes endpoints such as {', '.join(f'`{endpoint}`' for endpoint in analysis.endpoints[:3])}.")
    elif role == "architecture":
        if analysis.frontend_root and analysis.backend_root:
            lines.append("Architecture is split between a frontend surface and a backend/runtime surface.")
        elif analysis.frontend_root:
            lines.append("Architecture is frontend-led with runtime behavior anchored in package scripts and routes.")
        elif analysis.backend_root:
            lines.append("Architecture is backend-led with runtime behavior anchored in service files and endpoints.")
        if analysis.routes:
            lines.append(f"Routing structure suggests primary interface paths under {', '.join(f'`{route}`' for route in analysis.routes[:3])}.")
        if analysis.endpoints:
            lines.append(f"Endpoint decorators suggest service contract anchors at {', '.join(f'`{endpoint}`' for endpoint in analysis.endpoints[:3])}.")
    elif role == "execution":
        package_manager_label = analysis.package_manager or "npm"
        lines.append(f"Primary command workflow centers on `{package_manager_label}` package scripts and repository-local verify commands.")
        if analysis.frontend_scripts:
            lines.append(
                f"Frontend workflows depend on scripts: {', '.join(f'`{name}`' for name in list(analysis.frontend_scripts.keys())[:4])}."
            )
        if analysis.backend_root and (analysis.backend_root / "requirements.txt").exists():
            lines.append("Backend setup requires Python dependency installation from `requirements.txt`.")
    elif role == "memory":
        if analysis.glossary_entries:
            lines.append("Canonical terminology can be seeded from detected glossary entries and then curated by maintainers.")
        if analysis.routes:
            lines.append("Route names are useful term candidates for product and operations vocabulary alignment.")
        if analysis.endpoints:
            lines.append("Endpoint labels are useful term candidates for integration and runbook language.")
    return lines


def human_maintenance_lines(analysis: RepoAnalysis, role: str, unresolved_count: int, conflicting_count: int) -> list[str]:
    lines: list[str] = [
        "Assign one maintainer owner for this document and update it in the same pull request as behavior changes.",
        "Review this document at least once per sprint or before each release cut.",
    ]
    if role == "product":
        lines.append("Update after roadmap, target user, or feature scope decisions.")
    elif role == "architecture":
        lines.append("Update after boundary, dependency, or interface contract changes.")
    elif role == "execution":
        lines.append("Update after setup/run/verify command changes or CI workflow updates.")
    elif role == "memory":
        lines.append("Update when terminology, handoff language, or project status vocabulary changes.")

    if conflicting_count:
        lines.append("Prioritize resolving conflicting statements before treating this document as canonical.")
    if unresolved_count:
        lines.append("Track unresolved items as named decisions with owner and due date.")
    if unresolved_count == 0 and conflicting_count == 0:
        lines.append("No major synthesis conflicts were detected; focus on keeping this page current with implementation changes.")
    return lines


def human_bootstrap_backlog_lines(role: str, has_supporting_provenance: bool) -> list[str]:
    if has_supporting_provenance:
        return ["Supporting docs were found; continue consolidating them into this page and archive stale duplicates."]

    if role == "product":
        return [
            "Write a one-paragraph project mission and a one-release priority list.",
            "Record primary users and success signals in concrete terms.",
            "Capture top open product decisions with owner + target date.",
        ]
    if role == "architecture":
        return [
            "Document top-level system boundaries (frontend/backend/services) in 5-8 bullets.",
            "List canonical files that define runtime behavior and public contracts.",
            "Create an initial decision backlog for unresolved architecture tradeoffs.",
        ]
    if role == "execution":
        return [
            "Verify setup/run/verify commands from a clean environment and keep only working commands.",
            "Define a minimum release checklist shared by maintainers.",
            "Record failure recovery steps for the most common local/CI breakages.",
        ]
    return [
        "Promote repeated domain terms into canonical glossary entries.",
        "Note deprecated or ambiguous terms and map them to preferred wording.",
        "Review docs for vocabulary drift each sprint.",
    ]


def human_update_trigger_lines(analysis: RepoAnalysis, role: str) -> list[str]:
    lines: list[str] = []
    if role == "product":
        lines.append("When new user-facing routes, commands, or APIs are added, update scope and audience notes.")
        lines.append("When priorities change in release planning, update the project overview and open decision list.")
    elif role == "architecture":
        lines.append("When source-of-truth files, service boundaries, or runtime dependencies change, update this page.")
        lines.append("When integration contracts change (routes/endpoints/storage), refresh architecture notes in the same PR.")
    elif role == "execution":
        lines.append("When setup/run/verify commands change, update this runbook immediately.")
        lines.append("When CI checks or release gates change, sync the Verify and Operational Notes sections.")
    elif role == "memory":
        lines.append("When teams introduce new domain terms, add canonical definitions and preferred wording.")
        lines.append("When old terms are deprecated, keep migration aliases until docs and code are fully aligned.")

    if not analysis.supporting_doc_provenance.get(role):
        lines.append("No supporting docs were found for this role; prioritize adding one maintainer-verified baseline note.")
    return lines


def normalize_evidence_line(line: str) -> str:
    without_sources = re.sub(r"\s*\(sources:\s*.*\)$", "", line).strip().lower()
    return re.sub(r"[^a-z0-9]+", " ", without_sources).strip()


def compact_human_evidence(
    confirmed: Sequence[str],
    inferred: Sequence[str],
    unresolved: Sequence[str],
    conflicting: Sequence[str],
) -> tuple[list[str], list[str], list[str], list[str]]:
    confirmed_out: list[str] = []
    inferred_out: list[str] = []
    unresolved_out: list[str] = []
    conflicting_out: list[str] = []
    seen: set[str] = set()

    for line in confirmed:
        key = normalize_evidence_line(line)
        if key and key not in seen:
            confirmed_out.append(line)
            seen.add(key)

    for line in inferred:
        key = normalize_evidence_line(line)
        if key and key not in seen:
            inferred_out.append(line)
            seen.add(key)

    for line in unresolved:
        key = normalize_evidence_line(line)
        if key and key not in seen:
            unresolved_out.append(line)
            seen.add(key)

    for line in conflicting:
        key = normalize_evidence_line(line)
        if key and key not in seen:
            conflicting_out.append(line)
            seen.add(key)

    return confirmed_out, inferred_out, unresolved_out, conflicting_out


def trim_human_evidence_density(
    role: str,
    confirmed: Sequence[str],
    inferred: Sequence[str],
    unresolved: Sequence[str],
    conflicting: Sequence[str],
) -> tuple[list[str], list[str], list[str], list[str]]:
    limits = {
        "product": {"confirmed": 4, "inferred": 2, "unresolved": 3, "conflicting": 3},
        "architecture": {"confirmed": 5, "inferred": 2, "unresolved": 3, "conflicting": 3},
        "execution": {"confirmed": 5, "inferred": 2, "unresolved": 3, "conflicting": 3},
        "memory": {"confirmed": 5, "inferred": 3, "unresolved": 4, "conflicting": 4},
    }
    role_limits = limits.get(role, limits["memory"])
    return (
        list(confirmed)[: role_limits["confirmed"]],
        list(inferred)[: role_limits["inferred"]],
        list(unresolved)[: role_limits["unresolved"]],
        list(conflicting)[: role_limits["conflicting"]],
    )


def human_doc_contract_lines(role: str, human_output_root: str) -> list[str]:
    agent_output_root = resolve_agent_output_root("en")
    base = [
        f"This page is maintainer-facing source-of-truth for its domain; keep it synchronized with `{agent_output_root}/` in dual mode and `{human_output_root}/` as the human-view root.",
        "Update this page in the same PR as behavior changes; avoid narrative-only refreshes without command or contract changes.",
    ]
    if role == "product":
        base.append("Record scope decisions as explicit rules and owners; move stale discussion text to decision backlog.")
    elif role == "architecture":
        base.append("Resolve source-of-truth conflicts before editing CLI, adapter, or build-path behavior.")
    elif role == "execution":
        base.append("Keep setup/run/verify/triage order executable from a clean checkout before marking this page done.")
    else:
        base.append("Keep terminology and decision memory aligned with current docs and command surfaces.")
    return base


def human_dual_sync_checklist_lines(role: str, human_output_root: str) -> list[str]:
    agent_output_root = resolve_agent_output_root("en")
    base = [
        f"After edits, refresh in dual mode and verify both `{agent_output_root}/` and `{human_output_root}/` were updated in the same change set.",
        "If one side changed without the other, treat it as documentation drift and resolve before merge.",
    ]
    if role == "execution":
        base.append("Run documented verify commands after refresh and keep failure-triage order aligned across both doc systems.")
    elif role == "architecture":
        base.append("When source-of-truth files move, update references in both doc systems before adjusting adapter/build-path rules.")
    elif role == "product":
        base.append("When scope or audience changes, update project positioning and retention rules in both doc systems together.")
    return base


def human_paired_refresh_rule_lines(role: str, human_output_root: str) -> list[str]:
    agent_en_root = resolve_agent_output_root("en")
    agent_zh_root = resolve_agent_output_root("zh")
    human_en_root = resolve_human_output_root("en")
    human_zh_root = resolve_human_output_root("zh")
    lines = [
        "Refresh contract: run one refresh/generate action that updates paired views together; do not patch one locale/audience in isolation.",
        f"Path contract: verify changed files include both `{agent_en_root}*/` and `{human_en_root}*/` counterparts when behavior changes affect shared source-of-truth.",
        f"Quad-mode contract: when using `--output-mode quad`, validate all four roots (`{agent_en_root}/`, `{agent_zh_root}/`, `{human_en_root}/`, `{human_zh_root}/`) in the same review cycle.",
    ]
    if role == "product":
        lines.append(
            f"Product pairing rule: if `{human_output_root}/overview.md` changes due to scope/value decisions, refresh paired product paths under both AGENTS roots."
        )
    elif role == "architecture":
        lines.append(
            f"Architecture pairing rule: if `{human_output_root}/architecture.md` changes due to boundary/source-of-truth updates, refresh paired architecture paths under both AGENTS roots."
        )
    elif role == "execution":
        lines.append(
            f"Execution pairing rule: if `{human_output_root}/workflows.md` changes due to command/order updates, refresh paired execution paths under both AGENTS roots."
        )
    return lines


def paired_agent_doc_lines(analysis: RepoAnalysis, role: str) -> list[str]:
    profile = analysis.doc_profile if analysis.doc_profile in HUMAN_PAIRED_PATH_RULES else "bootstrap"
    mapping = HUMAN_PAIRED_PATH_RULES[profile]
    agent_output_root = resolve_agent_output_root("en")

    lines: list[str] = []
    for relative, purpose in mapping.get(role, []):
        lines.append(f"`{agent_output_root}/{relative}` for {purpose}.")
    return lines


def prune_weak_human_inferences(lines: Sequence[str]) -> list[str]:
    weak_markers = ("likely", "appears to", "suggests", "could", "might")
    filtered: list[str] = []
    for line in lines:
        lowered = line.lower()
        if any(marker in lowered for marker in weak_markers):
            continue
        filtered.append(line)
    return filtered


def strip_supporting_sources_suffix(lines: Sequence[str]) -> list[str]:
    compacted: list[str] = []
    for line in lines:
        compacted.append(re.sub(r"\s*\(sources:\s*.*\)$", "", line).strip())
    return [line for line in compacted if line]


def human_output_boundary_lines(role: str, human_output_root: str, locale: str = "en") -> list[str]:
    agent_output_root = resolve_agent_output_root("en")
    shared = [
        get_ui_string("boundary_rule_1", locale).format(root=human_output_root, agent_root=agent_output_root),
        get_ui_string("boundary_rule_2", locale),
    ]
    if role == "product":
        shared.append(get_ui_string("boundary_rule_product", locale).format(root=human_output_root, agent_root=agent_output_root))
    elif role == "architecture":
        shared.append(get_ui_string("boundary_rule_architecture", locale).format(root=human_output_root, agent_root=agent_output_root))
    elif role == "execution":
        shared.append(get_ui_string("boundary_rule_execution", locale).format(root=human_output_root, agent_root=agent_output_root))
    return shared


def human_dual_view_rationale_lines(role: str, human_output_root: str, locale: str = "en") -> list[str]:
    agent_output_root = resolve_agent_output_root("en")
    lines = [
        get_ui_string("rationale_rule_1", locale).format(root=human_output_root, agent_root=agent_output_root),
        get_ui_string("rationale_rule_2", locale),
    ]
    if role == "product":
        lines.append(get_ui_string("rationale_rule_product", locale).format(root=human_output_root, agent_root=agent_output_root))
    elif role == "architecture":
        lines.append(get_ui_string("rationale_rule_architecture", locale).format(root=human_output_root, agent_root=agent_output_root))
    elif role == "execution":
        lines.append(get_ui_string("rationale_rule_execution", locale).format(root=human_output_root, agent_root=agent_output_root))
    return lines


def human_doc_relative_path(role: str) -> str:
    mapping = {
        "product": "overview.md",
        "architecture": "architecture.md",
        "execution": "workflows.md",
        "memory": "glossary.md",
    }
    return mapping.get(role, "overview.md")


def human_dual_pairing_contract_lines(
    analysis: RepoAnalysis,
    role: str,
    human_output_root: str,
    human_locale: str,
    human_template_variant: str,
) -> list[str]:
    resolved_variant = resolve_human_template_variant(human_locale, human_template_variant)
    profile = analysis.doc_profile if analysis.doc_profile in HUMAN_PAIRED_PATH_RULES else "bootstrap"
    agent_output_root = resolve_agent_output_root("en")
    lines = [
        get_ui_string("pairing_rule_1", human_locale),
        get_ui_string("pairing_rule_2", human_locale).format(locale=human_locale, root=human_output_root),
        get_ui_string("pairing_rule_3", human_locale).format(variant=resolved_variant),
    ]
    human_rel = human_doc_relative_path(role)
    for relative, purpose in HUMAN_PAIRED_PATH_RULES[profile].get(role, []):
        lines.append(
            get_ui_string("pairing_rule_path", human_locale).format(
                human_path=f"{human_output_root}/{human_rel}",
                agent_path=f"{agent_output_root}/{relative}",
                purpose=purpose,
            )
        )
    return lines


def role_first_screen_rules(analysis: RepoAnalysis, role: str) -> list[str]:
    prefixes_by_role = {
        "product": ("Product positioning:", "Repository adaptation scope:", "Retention value:"),
        "architecture": ("CLI boundary:", "Source-of-truth boundary:", "Build-path rule:", "Distribution structure:"),
        "execution": (
            "Execution contract:",
            "Verification gate:",
            "Verification order:",
            "Failure triage priority:",
            "Execution constraints:",
        ),
    }
    conflict_prefix_by_role = {
        "architecture": "Conflict rule:",
    }
    selected: list[str] = []
    seen: set[str] = set()
    confirmed = supporting_doc_insight_lines(analysis, role, "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, role, "conflicting")
    prefixes = prefixes_by_role.get(role, ())

    for line in confirmed:
        if prefixes and not line.startswith(prefixes):
            continue
        key = normalize_evidence_line(line)
        if key and key not in seen:
            selected.append(line)
            seen.add(key)

    conflict_prefix = conflict_prefix_by_role.get(role)
    if conflict_prefix:
        for line in conflicting:
            if not line.startswith(conflict_prefix):
                continue
            key = normalize_evidence_line(line)
            if key and key not in seen:
                selected.append(line)
                seen.add(key)
            break

    if selected:
        return selected[:4]

    fallback_by_role = {
        "product": [
            "State repository scope and user value as explicit rules before writing broad product narrative.",
            "Use lifecycle language (`init/refresh/doctor/migrate`) to keep docs maintainable over one-shot generation.",
        ],
        "architecture": [
            "Resolve source-of-truth conflicts before changing CLI, adapter, or build-path behavior.",
            "Treat platform adapters as distribution details; keep contract changes centralized at CLI entry.",
        ],
        "execution": [
            "Run documented setup/run/verify commands in order before editing scripts or docs.",
            "On failures, triage install/config drift first, then command context, then CI environment mismatches.",
        ],
    }
    return fallback_by_role.get(role, [])


def enumerate_rules(lines: Sequence[str]) -> list[str]:
    return [f"Rule {index + 1}: {line}" for index, line in enumerate(lines)]


def repo_type_label(repo_type: str, locale: str = "en") -> str:
    key = f"label_{repo_type.replace('-', '_')}"
    return get_ui_string(key, locale)


def current_operating_posture(analysis: RepoAnalysis, locale: str = "en") -> str:
    key = f"posture_{analysis.repo_type.replace('-', '_')}"
    if key in STRINGS[locale]:
         return get_ui_string(key, locale)
    return get_ui_string("posture_fallback", locale)


def extend_unique(target: list[str], items: Sequence[str]) -> None:
    for item in items:
        if item not in target:
            target.append(item)
