from __future__ import annotations

from typing import Dict

from ..locales import STRINGS, get_ui_string
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
    supporting_docs_for_role,
)
from .helpers import (
    current_operating_posture,
    enumerate_rules,
    extend_unique,
    format_bullets,
    paired_agent_doc_lines,
    repo_type_label,
    role_first_screen_rules,
    supporting_doc_insight_lines,
    supporting_doc_lines,
    supporting_doc_provenance_lines,
)
def build_layered_entry(analysis: RepoAnalysis, locale: str = "en") -> str:
    reading_order = [
        "`01-product/001-core-goals.md`",
        "`01-product/002-prd.md`",
        "`02-architecture/004-tech-stack.md`",
        "`02-architecture/006-backend-structure.md`",
        "`02-architecture/007-architecture-compatibility.md`",
        "`03-execution/008-implementation-plan.md`",
        "`04-memory/009-progress.md`",
        "`04-memory/010-lessons.md`",
    ]
    if analysis.repo_type in {"web-app", "skill-meta", "cli-tool"}:
        reading_order.insert(3, "`01-product/003-app-flow.md`")
        reading_order.insert(5, "`02-architecture/005-frontend-guidelines.md`")
    
    rules = [
        "Read product and architecture docs before broad refactors.",
        "Refresh `dfa-doc/AGENTS/` after meaningful repo-shape, workflow, or terminology changes.",
        "Prefer confirmed facts over speculative roadmap language.",
        "Protect hand-maintained notes with manual blocks when refresh safety matters.",
    ]
    if analysis.repo_type == "skill-meta":
         rules.append("Keep the skill manifest, SKILL.md instructions, and generator behavior aligned.")

    localized_rules = [translate_to_zh(rule) for rule in rules] if locale == "zh" else rules

    return f"""{get_ui_string('entry_header', locale)}

{get_ui_string('purpose_sub', locale)}

{get_ui_string('purpose_bullet_1', locale)}
{get_ui_string('purpose_bullet_2', locale)}
{get_ui_string('purpose_bullet_3', locale)}

{get_ui_string('reading_order_sub', locale)}

{format_bullets([f"`{path}`" for path in reading_order], get_ui_string('no_reading_order', locale))}

{get_ui_string('rules_sub', locale)}

{format_bullets(localized_rules, get_ui_string('no_rules', locale))}

{get_ui_string('operating_posture_sub', locale)}

- {current_operating_posture(analysis, locale=locale)}

{get_ui_string('canonical_sources_sub', locale)}

{format_bullets(supporting_doc_lines(supporting_docs_for_role(analysis, "product"), analysis.root), get_ui_string('no_reasons', locale))}
"""


def build_layered_core_goals(analysis: RepoAnalysis, locale: str = "en") -> str:
    references = supporting_docs_for_role(analysis, "product")
    confirmed = supporting_doc_insight_lines(analysis, "product", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "product", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "product", "unresolved")
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "product"))

    boundaries = [
        "Avoid drifting away from the repository's real code, scripts, and naming conventions.",
        "Prefer stable entrypoints and contracts over broad structural churn.",
    ]
    if analysis.classification.conflicting_signals:
         boundaries.append("Review mixed signals before collapsing the repository into a single simplistic mental model.")

    return f"""{get_ui_string('core_goals_header', locale)}

{get_ui_string('top_rules_sub', locale)}

{format_bullets(top_rules, get_ui_string('fallback_product_rules', locale))}

{get_ui_string('confirmed_facts_sub', locale)}

- {get_ui_string('locale_pointer', locale) if "locale_pointer" in STRINGS["en"] else "English | [简体中文](README.zh.md)"}
- {get_ui_string('confirmed_facts_repo_type', locale).format(repo_type=analysis.repo_type)}
- {get_ui_string('confirmed_facts_core_value', locale)}

{get_ui_string('constraints_sub', locale)}

{format_bullets(boundaries, get_ui_string('fallback_constraints', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Product)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_product_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_product_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_product_unresolved', locale))}

{get_ui_string('referenced_docs_sub', locale)}

{format_bullets(supporting_doc_lines(references, analysis.root), get_ui_string('no_additional_docs', locale))}
"""

def build_layered_prd(analysis: RepoAnalysis, locale: str = "en") -> str:
    users = [
        get_ui_string('confirmed_facts_repo_type', locale).format(repo_type=analysis.repo_type),
    ]
    if analysis.repo_type == "skill-meta":
        users.append(get_ui_string('users_maintainers_agents', locale))
    elif analysis.repo_type == "web-app":
        users.append(get_ui_string('users_ops_engineers', locale))
    elif analysis.repo_type in {"cli-tool", "library-sdk"}:
        users.append(get_ui_string('users_developers', locale))

    journeys = []
    if analysis.routes:
        journeys.extend([get_ui_string('route_surface', locale).format(route=route) for route in analysis.routes[:8]])
    elif analysis.cli_entrypoints:
        journeys.extend([get_ui_string('cli_entrypoint_surface', locale).format(path=rel_path(path, analysis.root)) for path in analysis.cli_entrypoints[:6]])
    elif analysis.skill_meta.agent_manifests:
        journeys.extend(
            [get_ui_string('agent_manifest_surface', locale).format(path=rel_path(p, analysis.root)) for p in analysis.skill_meta.agent_manifests[:4]]
        )
    references = supporting_docs_for_role(analysis, "product")
    confirmed = supporting_doc_insight_lines(analysis, "product", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "product", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "product", "unresolved")

    return f"""{get_ui_string('prd_header', locale)}

{get_ui_string('best_used_for_sub', locale)}

- Aligning agents on who this repository serves
- Checking whether a change still supports the intended user journey

{get_ui_string('users_outcomes_sub', locale)}

{format_bullets(users, get_ui_string('no_audience', locale))}

{get_ui_string('entry_surfaces_sub', locale)}

{format_bullets(journeys, get_ui_string('no_entry_points', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Product)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_product_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_product_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_product_unresolved', locale))}

{get_ui_string('provenance_sub', locale)}

{format_bullets(supporting_doc_provenance_lines(analysis, "product"), get_ui_string('no_provenance', locale))}

{get_ui_string('questions_to_resolve_sub', locale)}

- Confirm the primary audience and the exact outcome they expect from this repository.
- Confirm which behaviors or labels must remain stable for downstream users.
"""


def build_layered_app_flow(analysis: RepoAnalysis, locale: str = "en") -> str:
    stages = []
    if analysis.routes:
        if locale == "zh":
             stages.extend([f"浏览器路由：`{route}`" for route in analysis.routes[:8]])
        else:
             stages.extend([f"Browser route: `{route}`" for route in analysis.routes[:8]])
    if analysis.components:
        if locale == "zh":
             stages.extend([f"组件表面：`{component}`" for component in analysis.components[:6]])
        else:
             stages.extend([f"Component surface: `{component}`" for component in analysis.components[:6]])
    if analysis.cli_entrypoints:
        if locale == "zh":
             stages.extend([f"启动入口：`{rel_path(path, analysis.root)}`" for path in analysis.cli_entrypoints[:6]])
        else:
             stages.extend([f"Command surface: `{rel_path(path, analysis.root)}`" for path in analysis.cli_entrypoints[:6]])
    if analysis.skill_meta.agent_manifests:
        if locale == "zh":
             stages.extend([f"智能体清单入口：`{rel_path(path, analysis.root)}`" for path in analysis.skill_meta.agent_manifests[:4]])
        else:
             stages.extend([f"Agent manifest surface: `{rel_path(path, analysis.root)}`" for path in analysis.skill_meta.agent_manifests[:4]])

    if locale == "zh":
        guidance = [
            "将第一个可见或被调用的入口视为产品契约的一部分。",
            "保持面向用户的名称在 README 示例、清单、路由和命令中对齐。",
        ]
        if analysis.repo_type == "web-app":
            guidance.append("在重设计布局或导航前，保持路由语义和组件层级。")
        elif analysis.repo_type == "skill-meta":
            guidance.append("将安装、调用和提示词入口视为等同于前端契约。")
    else:
        guidance = [
            "Treat the first visible or invoked surface as part of the product contract.",
            "Keep user-facing names aligned across README examples, manifests, routes, and commands.",
        ]
        if analysis.repo_type == "web-app":
            guidance.append("Preserve route semantics and component hierarchy before redesigning layout or navigation.")
        elif analysis.repo_type == "skill-meta":
            guidance.append("Treat install, invocation, and prompt surfaces as the equivalent of a frontend contract.")
            
    confirmed = supporting_doc_insight_lines(analysis, "product", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "product", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "product", "unresolved")

    return f"""{get_ui_string('app_flow_header', locale)}

{get_ui_string('surfaces_sub', locale)}

{format_bullets(stages, get_ui_string('no_surfaces', locale))}

{get_ui_string('guidance_sub', locale)}

{format_bullets(guidance, get_ui_string('no_guidance', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Flow)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_flow_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_flow_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_flow_unresolved', locale))}
"""


def build_layered_tech_stack(analysis: RepoAnalysis, locale: str = "en") -> str:
    stack = [
        f"Repo type: `{analysis.repo_type}`.",
        f"Doc profile: `{analysis.doc_profile}`.",
        f"Classification confidence: `{analysis.classification.confidence}`.",
        f"Package manager: `{analysis.package_manager}`.",
        f"Frontend stack: {analysis.frontend_stack}",
        f"Backend/runtime stack: {analysis.backend_stack}",
    ]
    if analysis.frontend_root:
        stack.append(f"Frontend root: `{rel_path(analysis.frontend_root, analysis.root)}`.")
    if analysis.backend_root:
        stack.append(f"Backend root: `{rel_path(analysis.backend_root, analysis.root)}`.")

    return f"""{get_ui_string('tech_stack_header', locale)}

{get_ui_string('confirmed_facts_sub', locale)}

{format_bullets(stack, get_ui_string('no_stack_facts', locale))}

{get_ui_string('secondary_traits_sub', locale)}

{format_bullets(list(analysis.classification.secondary_traits), get_ui_string('no_secondary_traits', locale))}
"""


def build_layered_frontend_guidelines(analysis: RepoAnalysis, locale: str = "en") -> str:
    guidance = [
        "Keep user-facing routes, labels, prompts, or commands stable unless the repository intentionally renames them.",
        "Review README examples and visible entry surfaces before changing interaction flows.",
    ]
    if analysis.repo_type == "web-app":
        guidance.extend(
            [
                "Treat routes and component hierarchy as part of the working product contract.",
                "Preserve the main interaction path before optimizing styling or layout details.",
            ]
        )
    elif analysis.repo_type == "skill-meta":
        guidance.extend(
            [
                "Treat skill manifests, trigger phrasing, and invocation prompts as the user-facing interface.",
                "Do not let manifest language drift away from what the generator actually supports.",
            ]
        )

    evidence = []
    if analysis.routes:
        evidence.extend([f"Detected route: `{route}`" for route in analysis.routes[:6]])
    if analysis.components:
        evidence.extend([f"Detected component: `{component}`" for component in analysis.components[:6]])
    if analysis.skill_meta.agent_manifests:
        evidence.extend(
            [f"Detected manifest: `{rel_path(path, analysis.root)}`" for path in analysis.skill_meta.agent_manifests[:4]]
        )

    return f"""{get_ui_string('frontend_guidelines_header', locale)}

{get_ui_string('guidance_sub', locale)}

{format_bullets(guidance, get_ui_string('no_frontend_guidance', locale))}

{get_ui_string('evidence_sub', locale)}

{format_bullets(evidence, get_ui_string('no_frontend_evidence', locale))}
"""


def build_layered_backend_structure(analysis: RepoAnalysis, locale: str = "en") -> str:
    responsibilities = [
        "Identify the runtime or automation entrypoint before changing behavior.",
        "Treat outputs, contracts, and side effects as downstream-facing surfaces.",
    ]
    if analysis.repo_type == "skill-meta":
        responsibilities.append("The generator script and helper scripts are the backend-like execution layer.")
    elif analysis.repo_type == "backend-service":
        responsibilities.append("HTTP endpoints and returned payload shapes are the clearest service contract.")

    runtime_entries = []
    if analysis.skill_meta.scripts:
        runtime_entries.extend([f"`{rel_path(path, analysis.root)}`" for path in analysis.skill_meta.scripts[:6]])
    if analysis.cli_entrypoints:
        runtime_entries.extend([f"`{rel_path(path, analysis.root)}`" for path in analysis.cli_entrypoints[:6]])
    if analysis.endpoints:
        runtime_entries.extend([f"`{endpoint}`" for endpoint in analysis.endpoints[:8]])

    return f"""{get_ui_string('backend_structure_header', locale)}

{get_ui_string('responsibilities_sub', locale)}

{format_bullets(responsibilities, get_ui_string('no_backend_responsibilities', locale))}

{get_ui_string('runtime_entries_sub', locale)}

{format_bullets(runtime_entries, get_ui_string('no_runtime_entries', locale))}

{get_ui_string('stable_contract_fields_sub', locale)}

{format_bullets(list(analysis.contract_fields), get_ui_string('no_contract_fields', locale))}

{get_ui_string('storage_outputs_sub', locale)}

{format_bullets(list(analysis.storage_rules), get_ui_string('no_storage_rules', locale))}
"""


def build_layered_architecture_compatibility(analysis: RepoAnalysis, locale: str = "en") -> str:
    source_of_truth = infer_source_of_truth_lines(analysis)
    references = supporting_docs_for_role(analysis, "architecture")
    confirmed = supporting_doc_insight_lines(analysis, "architecture", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "architecture", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "architecture", "unresolved")
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "architecture"))

    boundaries = [
        "Prefer changing source code and configuration first, then refresh `dfa-doc/AGENTS/` docs.",
        "Do not let generated docs drift away from the repository's actual entrypoints and workflows.",
    ]
    if analysis.repo_type == "skill-meta":
        boundaries.append("Skill manifests, README examples, and generator output should describe the same capability surface.")

    return f"""{get_ui_string('architecture_compatibility_header', locale)}

{get_ui_string('top_rules_sub', locale)}

{format_bullets(top_rules, get_ui_string('fallback_architecture_rules', locale))}

{get_ui_string('repo_type_signals_sub', locale)}

{format_bullets(list(analysis.repo_type_reasons), get_ui_string('no_signals', locale))}

{get_ui_string('source_of_truth_sub', locale)}

{format_bullets(source_of_truth, get_ui_string('no_source_of_truth', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Architecture)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_architecture_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_architecture_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_architecture_unresolved', locale))}

{get_ui_string('referenced_docs_sub', locale)}

{format_bullets(supporting_doc_lines(references, analysis.root), get_ui_string('no_additional_docs', locale))}

{get_ui_string('compatibility_boundaries_sub', locale)}

{format_bullets(boundaries, get_ui_string('no_boundaries', locale))}

{get_ui_string('conflicting_signals_sub', locale)}

{format_bullets(list(analysis.classification.conflicting_signals), get_ui_string('no_conflicting_signals', locale))}
"""


def build_layered_implementation_plan(analysis: RepoAnalysis, locale: str = "en") -> str:
    next_steps = [
        "Validate setup, run, and verify commands before broad edits.",
        "Refresh AGENTS docs after changing repository structure or workflow commands.",
    ]
    if analysis.repo_type_questions:
        next_steps.append("Resolve the open repository-shape questions before taking on large refactors.")

    setup_lines = []
    run_lines = []
    verify_lines = []
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
                    f"{analysis.package_manager} run dev" if analysis.package_manager != "yarn" else "yarn dev",
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
        run_lines = ["Run the primary local command from README examples (app start, CLI invocation, or generator refresh)."]
    if not verify_lines:
        verify_lines = ["Run repository verification commands from README or CI (lint/test/build equivalents)."]
    references = supporting_docs_for_role(analysis, "execution")
    confirmed = supporting_doc_insight_lines(analysis, "execution", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "execution", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "execution", "unresolved")
    top_rules = enumerate_rules(role_first_screen_rules(analysis, "execution"))

    return f"""{get_ui_string('implementation_plan_header', locale)}

{get_ui_string('operating_posture_sub', locale)}

- {current_operating_posture(analysis)}

{get_ui_string('top_rules_sub', locale)}

{format_bullets(top_rules, get_ui_string('fallback_execution_rules', locale))}

{get_ui_string('immediate_next_steps_sub', locale)}

{format_bullets(next_steps, get_ui_string('no_next_steps', locale))}

{get_ui_string('setup_sub', locale)}

```bash
{chr(10).join(setup_lines)}
```

{get_ui_string('run_sub', locale)}

```bash
{chr(10).join(run_lines)}
```

{get_ui_string('verify_sub', locale)}

```bash
{chr(10).join(verify_lines)}
```

{get_ui_string('supporting_doc_sub', locale)} (Execution)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_execution_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_execution_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_execution_unresolved', locale))}

{get_ui_string('supporting_execution_docs_sub', locale)}

{format_bullets(supporting_doc_lines(references, analysis.root), get_ui_string('no_additional_docs', locale))}
"""


def build_layered_progress(analysis: RepoAnalysis, locale: str = "en") -> str:
    facts = [
        f"Detected repo type: `{analysis.repo_type}`.",
        f"Doc profile in use: `{analysis.doc_profile}`.",
        f"Classification confidence: `{analysis.classification.confidence}`.",
    ]
    if analysis.summary:
        facts.append(f"Repository summary: {analysis.summary}")
    if analysis.frontend_root:
        facts.append(f"Frontend root detected at `{rel_path(analysis.frontend_root, analysis.root)}`.")
    if analysis.backend_root:
        facts.append(f"Backend root detected at `{rel_path(analysis.backend_root, analysis.root)}`.")

    focus = list(analysis.repo_type_questions) or [
        "Confirm the next milestone and keep this file updated with human-approved progress.",
    ]
    references = supporting_docs_for_role(analysis, "memory")
    confirmed = supporting_doc_insight_lines(analysis, "memory", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "memory", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "memory", "unresolved")

    return f"""{get_ui_string('progress_header', locale)}

{get_ui_string('confirmed_facts_sub', locale)}

{format_bullets(facts, get_ui_string('no_progress_facts', locale))}

{get_ui_string('current_focus_sub', locale)}

{format_bullets(focus, get_ui_string('no_focus', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Memory)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_progress_confirmed', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_progress_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_progress_unresolved', locale))}

{get_ui_string('referenced_docs_sub', locale)}

{format_bullets(supporting_doc_lines(references, analysis.root), get_ui_string('no_additional_docs', locale))}
"""


def build_layered_lessons(analysis: RepoAnalysis, locale: str = "en") -> str:
    lang_lessons = {
        "en": [
            "Read the entry and architecture docs before large structural edits.",
            "Refresh generated agent docs after meaningful repository-shape changes.",
            "Prefer explicit contracts and stable names over agent improvisation.",
        ],
        "zh": [
            "在大规模结构修改前，请务必阅读入口文档 (entry) 和架构文档 (architecture)。",
            "在发生明显的仓库形态变更后，请立即刷新生成的智能体文档。",
            "优先使用明确的契约和稳定的名称，而不是让智能体自行发挥命名。",
        ]
    }
    lessons = lang_lessons.get(locale, lang_lessons["en"])[:]

    if analysis.repo_type == "skill-meta":
        if locale == "zh":
            lessons.append("保持清单文件、README 示例与生成器行为一致，确保技能不出现“过度承诺”。")
        else:
            lessons.append("Keep manifests, README examples, and generator behavior aligned so the skill does not overpromise.")
    
    if analysis.classification.conflicting_signals:
        if locale == "zh":
            lessons.append("混合的仓库信号是一种警告，在跨边界重构前请务必仔细检查。")
        else:
            lessons.append("Mixed repository signals are a warning to inspect before refactoring across boundaries.")

    references = supporting_docs_for_role(analysis, "memory")
    confirmed = supporting_doc_insight_lines(analysis, "memory", "confirmed")
    conflicting = supporting_doc_insight_lines(analysis, "memory", "conflicting")
    unresolved = supporting_doc_insight_lines(analysis, "memory", "unresolved")

    return f"""{get_ui_string('lessons_header', locale)}

{get_ui_string('durable_lessons_sub', locale)}

{format_bullets(lessons, get_ui_string('fallback_lessons', locale))}

{get_ui_string('supporting_doc_sub', locale)} (Memory)

{get_ui_string('confirmed_sub', locale)}

{format_bullets(confirmed, get_ui_string('no_historical_lessons', locale))}

{get_ui_string('conflicting_sub', locale)}

{format_bullets(conflicting, get_ui_string('no_historical_conflicts', locale))}

{get_ui_string('unresolved_sub', locale)}

{format_bullets(unresolved, get_ui_string('no_historical_unresolved', locale))}

{get_ui_string('referenced_docs_sub', locale)}

{format_bullets(supporting_doc_lines(references, analysis.root), get_ui_string('no_additional_docs', locale))}
"""


def generate_layered_docs(analysis: RepoAnalysis, locale: str = "en") -> Dict[str, str]:
    docs = {
        "00-entry/AGENTS.md": build_layered_entry(analysis, locale=locale),
        "01-product/001-core-goals.md": build_layered_core_goals(analysis, locale=locale),
        "01-product/002-prd.md": build_layered_prd(analysis, locale=locale),
        "01-product/003-app-flow.md": build_layered_app_flow(analysis, locale=locale),
        "02-architecture/004-tech-stack.md": build_layered_tech_stack(analysis, locale=locale),
        "02-architecture/005-frontend-guidelines.md": build_layered_frontend_guidelines(analysis, locale=locale),
        "02-architecture/006-backend-structure.md": build_layered_backend_structure(analysis, locale=locale),
        "02-architecture/007-architecture-compatibility.md": build_layered_architecture_compatibility(analysis, locale=locale),
        "03-execution/008-implementation-plan.md": build_layered_implementation_plan(analysis, locale=locale),
        "04-memory/009-progress.md": build_layered_progress(analysis, locale=locale),
        "04-memory/010-lessons.md": build_layered_lessons(analysis, locale=locale),
    }
    if locale == "zh":
        return {path: translate_to_zh(content) for path, content in docs.items()}
    return docs
