from __future__ import annotations

import re
from typing import Dict

from ..locales import get_ui_string
from ..models import RepoAnalysis
from ..translator import translate_to_zh
from ..utils import rel_path
from .detectors import (
    append_package_script_commands,
    detect_root_package_scripts,
    detect_unittest_commands,
    detect_verify_script_commands,
    infer_source_of_truth_lines,
    product_entry_point_lines,
)
from .helpers import (
    compact_human_evidence,
    enumerate_rules,
    format_bullets,
    human_audience_lines,
    human_bootstrap_backlog_lines,
    human_doc_contract_lines,
    human_dual_pairing_contract_lines,
    human_dual_sync_checklist_lines,
    human_dual_view_rationale_lines,
    human_inferred_lines,
    human_maintenance_lines,
    human_output_boundary_lines,
    human_paired_refresh_rule_lines,
    human_update_trigger_lines,
    paired_agent_doc_lines,
    prune_weak_human_inferences,
    repo_type_label,
    localize_lines,
    resolve_human_output_root,
    resolve_human_template_variant,
    resolve_agent_output_root,
    role_first_screen_rules,
    strip_supporting_sources_suffix,
    supporting_doc_insight_lines,
    supporting_doc_provenance_lines,
    synthesis_summary_lines,
    trim_human_evidence_density,
    extend_unique,
)
def build_human_overview(analysis: RepoAnalysis, human_output_root: str, human_locale: str, human_template_variant: str) -> str:
    locale = human_locale
    confirmed = supporting_doc_insight_lines(analysis, "product", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "product", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "product", "unresolved")
    inferred = human_inferred_lines(analysis, "product")
    confirmed, inferred, unresolved, conflicting = compact_human_evidence(
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    inferred = prune_weak_human_inferences(inferred)
    confirmed, inferred, unresolved, conflicting = trim_human_evidence_density(
        "product",
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    confirmed = strip_supporting_sources_suffix(confirmed)
    inferred = strip_supporting_sources_suffix(inferred)
    unresolved = strip_supporting_sources_suffix(unresolved)
    conflicting = strip_supporting_sources_suffix(conflicting)
    provenance = supporting_doc_provenance_lines(analysis, "product")
    synthesis_summary = synthesis_summary_lines(analysis, "product")
    audiences = human_audience_lines(analysis)
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "product"))

    core = []
    if analysis.summary:
        core.append(analysis.summary)
    
    if locale == "zh":
        core.append(f"当前仓库形态： `{repo_type_label(analysis.repo_type)}`。")
        if analysis.frontend_root:
            core.append(f"前端代码根目录： `{rel_path(analysis.frontend_root, analysis.root)}`。")
        if analysis.backend_root:
            core.append(f"后端代码根目录： `{rel_path(analysis.backend_root, analysis.root)}`。")
    else:
        core.append(f"Current repo shape: `{repo_type_label(analysis.repo_type)}`.")
        if analysis.frontend_root:
            core.append(f"Frontend root: `{rel_path(analysis.frontend_root, analysis.root)}`.")
        if analysis.backend_root:
            core.append(f"Backend root: `{rel_path(analysis.backend_root, analysis.root)}`.")
            
    priorities = []
    if locale == "zh":
        if conflicting:
            priorities.append("在锁定路线图或接口承诺前，请先解决冲突的产品陈述。")
        if unresolved:
            priorities.append("将被列为“未决”的事项转化为明确的 责任人+期限 决策。")
        if not priorities:
            priorities.append(
                get_ui_string("priority_sync", locale).format(
                    root=human_output_root,
                    agent_root=resolve_agent_output_root("en"),
                )
            )
    else:
        if conflicting:
            priorities.append("Resolve conflicting product statements before locking roadmap or interface commitments.")
        if unresolved:
            priorities.append("Convert unresolved items into explicit owner+deadline decisions.")
        if not priorities:
            priorities.append(
                get_ui_string("priority_sync", locale).format(
                    root=human_output_root,
                    agent_root=resolve_agent_output_root("en"),
                )
            )

    documentation_gaps = list(unresolved)
    if not documentation_gaps:
        if locale == "zh":
            documentation_gaps.append("未从支持文档中检测到明显的产品文档缺失。")
        else:
            documentation_gaps.append("No major product documentation gaps were detected from supporting sources.")
            
    maintenance = human_maintenance_lines(analysis, "product", len(unresolved), len(conflicting))
    update_triggers = human_update_trigger_lines(analysis, "product")
    bootstrap_backlog = human_bootstrap_backlog_lines("product", bool(provenance))

    return f"""{get_ui_string('overview_header', locale)}

{get_ui_string('what_this_is_sub', locale)}

{format_bullets(core, get_ui_string('no_overview', locale))}

{get_ui_string('top_rules_sub', locale)}

{format_bullets(localize_lines(top_rules, locale), get_ui_string('fallback_product_rules', locale))}

{get_ui_string('doc_contract_sub', locale)}

{format_bullets(localize_lines(human_doc_contract_lines("product", human_output_root), locale), get_ui_string('no_contract_rules', locale))}

{get_ui_string('dual_sync_sub', locale)}

{format_bullets(localize_lines(human_dual_sync_checklist_lines("product", human_output_root), locale), get_ui_string('no_sync_checks', locale))}

{get_ui_string('paired_refresh_sub', locale)}

{format_bullets(localize_lines(human_paired_refresh_rule_lines("product", human_output_root), locale), get_ui_string('no_refresh_rules', locale))}

{get_ui_string('dual_pairing_sub', locale)}

{format_bullets(localize_lines(human_dual_pairing_contract_lines(analysis, "product", human_output_root, human_locale, human_template_variant), locale), get_ui_string('no_pairing_rules', locale))}

{get_ui_string('paired_agent_docs_sub', locale)}

{format_bullets(localize_lines(paired_agent_doc_lines(analysis, "product"), locale), get_ui_string('no_paired_docs', locale))}

{get_ui_string('output_boundary_sub', locale)}

{format_bullets(localize_lines(human_output_boundary_lines("product", human_output_root, locale=locale), locale), get_ui_string('no_boundary_rules', locale))}

{get_ui_string('dual_view_rationale_sub', locale)}

{format_bullets(localize_lines(human_dual_view_rationale_lines("product", human_output_root, locale=locale), locale), get_ui_string('no_rationale', locale))}

{get_ui_string('intended_audience_sub', locale)}

{format_bullets(localize_lines(audiences, locale), get_ui_string('no_audience', locale))}

{get_ui_string('key_entry_points_sub', locale)}

{format_bullets(product_entry_point_lines(analysis), get_ui_string('no_entry_points', locale))}

{get_ui_string('synthesis_summary_sub', locale)}

{format_bullets(localize_lines(synthesis_summary, locale), get_ui_string('no_synthesis', locale))}

{get_ui_string('knowledge_status_sub', locale)}

{get_ui_string('confirmed_rules_sub', locale)}

{format_bullets(localize_lines(confirmed, locale), get_ui_string('no_product_confirmed', locale))}

{get_ui_string('supporting_signals_sub', locale)}

{format_bullets(localize_lines(inferred, locale), get_ui_string('no_signals', locale))}

{get_ui_string('decision_backlog_sub', locale)}

{format_bullets(localize_lines(unresolved, locale), get_ui_string('no_product_unresolved', locale))}

{get_ui_string('conflict_watchlist_sub', locale)}

{format_bullets(localize_lines(conflicting, locale), get_ui_string('no_product_conflicts', locale))}

{get_ui_string('current_priorities_sub', locale)}

{format_bullets(localize_lines(priorities, locale), get_ui_string('no_priorities', locale))}

{get_ui_string('doc_gaps_sub', locale)}

{format_bullets(localize_lines(documentation_gaps, locale), get_ui_string('no_gaps', locale))}

{get_ui_string('update_triggers_sub', locale)}

{format_bullets(localize_lines(update_triggers, locale), get_ui_string('no_triggers', locale))}

{get_ui_string('maintenance_sub', locale)}

{format_bullets(localize_lines(maintenance, locale), get_ui_string('no_maintenance', locale))}

{get_ui_string('bootstrap_backlog_sub', locale)}

{format_bullets(localize_lines(bootstrap_backlog, locale), get_ui_string('no_backlog', locale))}

{get_ui_string('provenance_sub', locale)}

{format_bullets(provenance, get_ui_string('no_provenance', locale))}
"""


def build_human_architecture(
    analysis: RepoAnalysis,
    human_output_root: str,
    human_locale: str,
    human_template_variant: str,
) -> str:
    confirmed = supporting_doc_insight_lines(analysis, "architecture", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "architecture", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "architecture", "unresolved")
    inferred = human_inferred_lines(analysis, "architecture")
    confirmed, inferred, unresolved, conflicting = compact_human_evidence(
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    inferred = prune_weak_human_inferences(inferred)
    confirmed, inferred, unresolved, conflicting = trim_human_evidence_density(
        "architecture",
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    confirmed = strip_supporting_sources_suffix(confirmed)
    inferred = strip_supporting_sources_suffix(inferred)
    unresolved = strip_supporting_sources_suffix(unresolved)
    conflicting = strip_supporting_sources_suffix(conflicting)
    provenance = supporting_doc_provenance_lines(analysis, "architecture")
    synthesis_summary = synthesis_summary_lines(analysis, "architecture")
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "architecture"))
    boundaries = [
        "Treat source-of-truth files as canonical when supporting docs disagree.",
        f"Refresh both `{human_output_root}/` and `{resolve_agent_output_root('en')}/` after architecture-impacting changes.",
    ]
    system_map = []
    if analysis.frontend_root:
        system_map.append(f"Frontend surface: `{rel_path(analysis.frontend_root, analysis.root)}`")
    if analysis.backend_root:
        system_map.append(f"Backend/runtime surface: `{rel_path(analysis.backend_root, analysis.root)}`")
    if analysis.routes:
        system_map.append(f"Route coverage detected: {', '.join(f'`{route}`' for route in analysis.routes[:4])}")
    if analysis.endpoints:
        system_map.append(f"Endpoint coverage detected: {', '.join(f'`{endpoint}`' for endpoint in analysis.endpoints[:4])}")
    maintenance = human_maintenance_lines(analysis, "architecture", len(unresolved), len(conflicting))
    update_triggers = human_update_trigger_lines(analysis, "architecture")
    bootstrap_backlog = human_bootstrap_backlog_lines("architecture", bool(provenance))

    return f"""{get_ui_string('architecture_header', human_locale)}

{get_ui_string('source_of_truth_sub', human_locale)}

{format_bullets(infer_source_of_truth_lines(analysis), get_ui_string('no_source_of_truth', human_locale))}

{get_ui_string('top_rules_sub', human_locale)}

{format_bullets(localize_lines(top_rules, human_locale), get_ui_string('fallback_architecture_rules', human_locale))}

{get_ui_string('doc_contract_sub', human_locale)}

{format_bullets(localize_lines(human_doc_contract_lines("architecture", human_output_root), human_locale), get_ui_string('no_contract_rules', human_locale))}

{get_ui_string('dual_sync_sub', human_locale)}

{format_bullets(localize_lines(human_dual_sync_checklist_lines("architecture", human_output_root), human_locale), get_ui_string('no_sync_checks', human_locale))}

{get_ui_string('paired_refresh_sub', human_locale)}

{format_bullets(localize_lines(human_paired_refresh_rule_lines("architecture", human_output_root), human_locale), get_ui_string('no_refresh_rules', human_locale))}

{get_ui_string('dual_pairing_sub', human_locale)}

{format_bullets(localize_lines(human_dual_pairing_contract_lines(analysis, "architecture", human_output_root, human_locale, human_template_variant), human_locale), get_ui_string('no_pairing_rules', human_locale))}

{get_ui_string('paired_agent_docs_sub', human_locale)}

{format_bullets(localize_lines(paired_agent_doc_lines(analysis, "architecture"), human_locale), get_ui_string('no_paired_docs', human_locale))}

{get_ui_string('output_boundary_sub', human_locale)}

{format_bullets(localize_lines(human_output_boundary_lines("architecture", human_output_root, locale=human_locale), human_locale), get_ui_string('no_boundary_rules', human_locale))}

{get_ui_string('dual_view_rationale_sub', human_locale)}

{format_bullets(localize_lines(human_dual_view_rationale_lines("architecture", human_output_root, locale=human_locale), human_locale), get_ui_string('no_rationale', human_locale))}

{get_ui_string('detected_signals_sub', human_locale)}

{format_bullets(list(analysis.repo_type_reasons), get_ui_string('no_signals', human_locale))}

{get_ui_string('system_map_sub', human_locale)}

{format_bullets(system_map, get_ui_string('no_system_map', human_locale))}

{get_ui_string('synthesis_summary_sub', human_locale)}

{format_bullets(localize_lines(synthesis_summary, human_locale), get_ui_string('no_synthesis', human_locale))}

{get_ui_string('knowledge_status_sub', human_locale)}

{get_ui_string('confirmed_rules_sub', human_locale)}

{format_bullets(localize_lines(confirmed, human_locale), get_ui_string('no_architecture_confirmed', human_locale))}

{get_ui_string('supporting_signals_sub', human_locale)}

{format_bullets(localize_lines(inferred, human_locale), get_ui_string('no_signals', human_locale))}

{get_ui_string('decision_backlog_sub', human_locale)}

{format_bullets(localize_lines(unresolved, human_locale), get_ui_string('no_architecture_unresolved', human_locale))}

{get_ui_string('conflict_watchlist_sub', human_locale)}

{format_bullets(localize_lines(conflicting, human_locale), get_ui_string('no_architecture_conflicts', human_locale))}

{get_ui_string('stability_boundaries_sub', human_locale)}

{format_bullets(localize_lines(boundaries, human_locale), get_ui_string('no_boundaries', human_locale))}

{get_ui_string('update_triggers_sub', human_locale)}

{format_bullets(localize_lines(update_triggers, human_locale), get_ui_string('no_triggers', human_locale))}

{get_ui_string('maintenance_sub', human_locale)}

{format_bullets(localize_lines(maintenance, human_locale), get_ui_string('no_maintenance', human_locale))}

{get_ui_string('bootstrap_backlog_sub', human_locale)}

{format_bullets(localize_lines(bootstrap_backlog, human_locale), get_ui_string('no_backlog', human_locale))}

{get_ui_string('provenance_sub', human_locale)}

{format_bullets(provenance, get_ui_string('no_provenance', human_locale))}
"""


def build_human_workflows(
    analysis: RepoAnalysis,
    human_output_root: str,
    human_locale: str,
    human_template_variant: str,
) -> str:
    setup_lines = []
    run_lines = []
    verify_lines = []
    root_package_scripts = detect_root_package_scripts(analysis.root)
    confirmed = supporting_doc_insight_lines(analysis, "execution", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "execution", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "execution", "unresolved")
    inferred = human_inferred_lines(analysis, "execution")
    confirmed, inferred, unresolved, conflicting = compact_human_evidence(
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    inferred = prune_weak_human_inferences(inferred)
    confirmed, inferred, unresolved, conflicting = trim_human_evidence_density(
        "execution",
        confirmed,
        inferred,
        unresolved,
        conflicting,
    )
    confirmed = strip_supporting_sources_suffix(confirmed)
    inferred = strip_supporting_sources_suffix(inferred)
    unresolved = strip_supporting_sources_suffix(unresolved)
    conflicting = strip_supporting_sources_suffix(conflicting)
    provenance = supporting_doc_provenance_lines(analysis, "execution")
    synthesis_summary = synthesis_summary_lines(analysis, "execution")
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "execution"))

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
        append_package_script_commands(run_lines, analysis.package_manager, analysis.frontend_scripts, ("dev", "start"))
        append_package_script_commands(
            verify_lines,
            analysis.package_manager,
            analysis.frontend_scripts,
            ("lint", "test", "build", "typecheck", "check"),
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

    if analysis.backend_root and (analysis.backend_root / "requirements.txt").exists():
        backend_prefix = (
            f"cd {rel_path(analysis.backend_root, analysis.root)}"
            if analysis.backend_root != analysis.root
            else "# backend at repo root"
        )
        setup_lines.extend([backend_prefix, "python3 -m pip install -r requirements.txt"])
        if (analysis.backend_root / "app").exists():
            run_lines.extend([backend_prefix, "uvicorn app.main:app --reload"])

    extend_unique(verify_lines, detect_unittest_commands(analysis.root))
    extend_unique(verify_lines, detect_verify_script_commands(analysis.root))

    if not setup_lines:
        setup_lines = ["Review README setup steps and install dependencies with the repository's package manager."]
    if not run_lines:
        run_lines = ["Run the main local command from README examples."]
    if not verify_lines:
        verify_lines = ["Run verification commands from CI or README (lint/test/build equivalents)."]
    operational_notes = []
    if conflicting:
        operational_notes.append("Resolve conflicting workflow instructions before standardizing CI or release checks.")
    if unresolved:
        operational_notes.append("Assign owners for unresolved runbook items to prevent drift in release operations.")
    if not operational_notes:
        operational_notes.append("Keep command examples in this file aligned with CI and README instructions.")
    maintenance = human_maintenance_lines(analysis, "execution", len(unresolved), len(conflicting))
    update_triggers = human_update_trigger_lines(analysis, "execution")
    bootstrap_backlog = human_bootstrap_backlog_lines("execution", bool(provenance))

    return f"""# Workflows

## Top Rules (Read First)

{format_bullets(localize_lines(top_rules, human_locale), "State 2-4 execution rules before setup/run/verify details.")}

## Document Contract

{format_bullets(localize_lines(human_doc_contract_lines("execution", human_output_root), human_locale), "Add maintainer-facing contract rules for this page.")}

## Dual Sync Checklist

{format_bullets(localize_lines(human_dual_sync_checklist_lines("execution", human_output_root), human_locale), "Add dual-system synchronization checks for this page.")}

## Paired Refresh Rules

{format_bullets(localize_lines(human_paired_refresh_rule_lines("execution", human_output_root), human_locale), "Add paired refresh rules for dual/quad outputs.")}

## Dual Pairing Contract (Rules)

{format_bullets(localize_lines(human_dual_pairing_contract_lines(analysis, "execution", human_output_root, human_locale, human_template_variant), human_locale), "Add explicit dual pairing rules for this page.")}

## Paired Agent Docs (Dual Mode)

{format_bullets(localize_lines(paired_agent_doc_lines(analysis, "execution"), human_locale), "Add the paired agent-facing execution docs for dual mode.")}

## Output Boundary (Human vs Agent)

{format_bullets(localize_lines(human_output_boundary_lines("execution", human_output_root), human_locale), "Add output boundary rules between handbook/ and AGENTS/.")}

## Dual View Rationale

{format_bullets(localize_lines(human_dual_view_rationale_lines("execution", human_output_root), human_locale), "Explain why handbook/ and AGENTS/ are paired views of one system.")}

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

## Synthesis Summary

{format_bullets(localize_lines(synthesis_summary, human_locale), "No synthesis summary available.")}

## Knowledge Status

### Confirmed Rules

{format_bullets(localize_lines(confirmed, human_locale), "No clear execution facts were synthesized from supporting docs.")}

### Supporting Signals

{format_bullets(localize_lines(inferred, human_locale), "No additional derived execution signals were detected from repository structure.")}

### Decision Backlog

{format_bullets(localize_lines(unresolved, human_locale), "No unresolved execution items were synthesized from supporting docs.")}

### Conflict Watchlist

{format_bullets(localize_lines(conflicting, human_locale), "No direct execution conflicts were synthesized from supporting docs.")}

## Operational Notes

{format_bullets(localize_lines(operational_notes, human_locale), "No additional operational notes were derived automatically.")}

## Update Triggers

{format_bullets(localize_lines(update_triggers, human_locale), "No explicit update triggers were derived automatically.")}

## Maintenance Workflow

{format_bullets(localize_lines(maintenance, human_locale), "No maintenance workflow suggestions were derived automatically.")}

## Bootstrap Backlog (When Docs Are Thin)

{format_bullets(localize_lines(bootstrap_backlog, human_locale), "No bootstrap backlog suggestions were derived automatically.")}

## Provenance

{format_bullets(provenance, "No supporting execution documents were discovered outside generated outputs.")}
"""


def build_human_glossary(analysis: RepoAnalysis, human_locale: str = "en") -> str:
    terms = [re.sub(r"^[-*]\s+", "", entry).strip() for entry in analysis.glossary_entries if entry.strip()]
    if analysis.skill_meta.skill_name:
        terms.append(f"`skill`: `{analysis.skill_meta.skill_name}`")
    unresolved = supporting_doc_insight_lines(analysis, "memory", "unresolved")
    conflicting = supporting_doc_insight_lines(analysis, "memory", "conflicting")
    inferred = human_inferred_lines(analysis, "memory")
    confirmed, inferred, unresolved, conflicting = compact_human_evidence(
        terms,
        inferred,
        unresolved,
        conflicting,
    )
    provenance = supporting_doc_provenance_lines(analysis, "memory")
    synthesis_summary = synthesis_summary_lines(analysis, "memory")
    candidate_terms = []
    if analysis.routes:
        candidate_terms.extend(f"- `route:{route}`" for route in analysis.routes[:4])
    if analysis.endpoints:
        candidate_terms.extend(f"- `endpoint:{endpoint}`" for endpoint in analysis.endpoints[:4])
    if not candidate_terms:
        candidate_terms.append("- No additional term candidates were derived from routes/endpoints.")
    maintenance = human_maintenance_lines(analysis, "memory", len(unresolved), len(conflicting))
    update_triggers = human_update_trigger_lines(analysis, "memory")
    bootstrap_backlog = human_bootstrap_backlog_lines("memory", bool(provenance))

    return f"""# Glossary

## Confirmed Terms

{format_bullets(localize_lines(confirmed, human_locale), "No canonical terms were detected automatically.")}

## Naming Rules

- Keep user-facing names, commands, and labels consistent across docs and scripts.
- Prefer canonical project terms over ad-hoc synonyms.

## Synthesis Summary

{format_bullets(localize_lines(synthesis_summary, human_locale), "No synthesis summary available.")}

## Candidate Terms From Code Signals

{chr(10).join(candidate_terms)}

## Derived Terminology Signals

{format_bullets(localize_lines(inferred, human_locale), "No additional derived terminology signals were detected from repository structure.")}

## Unresolved Terminology Items

{format_bullets(localize_lines(unresolved, human_locale), "No unresolved terminology or memory items were synthesized from supporting docs.")}

## Conflicting Terminology Signals

{format_bullets(localize_lines(conflicting, human_locale), "No conflicting terminology signals were synthesized from supporting docs.")}

## Update Triggers

{format_bullets(localize_lines(update_triggers, human_locale), "No explicit update triggers were derived automatically.")}

## Maintenance Workflow

{format_bullets(localize_lines(maintenance, human_locale), "No maintenance workflow suggestions were derived automatically.")}

## Bootstrap Backlog (When Docs Are Thin)

{format_bullets(localize_lines(bootstrap_backlog, human_locale), "No bootstrap backlog suggestions were derived automatically.")}

## Provenance

{format_bullets(provenance, "No supporting memory documents were discovered outside generated outputs.")}
"""


def generate_human_docs(
    analysis: RepoAnalysis,
    human_locale: str = "en",
    human_template_variant: str | None = None,
) -> Dict[str, str]:
    resolved_variant = resolve_human_template_variant(human_locale, human_template_variant)
    output_root = resolve_human_output_root(human_locale)
    docs = {
        f"{output_root}/overview.md": build_human_overview(analysis, output_root, human_locale, resolved_variant),
        f"{output_root}/architecture.md": build_human_architecture(
            analysis,
            output_root,
            human_locale,
            resolved_variant,
        ),
        f"{output_root}/workflows.md": build_human_workflows(
            analysis,
            output_root,
            human_locale,
            resolved_variant,
        ),
        f"{output_root}/glossary.md": build_human_glossary(analysis, human_locale),
    }
    if human_locale == "zh":
        return {path: translate_to_zh(content) for path, content in docs.items()}
    return docs
