from __future__ import annotations

from pathlib import Path
from typing import Optional, Sequence, Tuple

from ..models import RepoAnalysis
from ..utils import extract_readme_summary
from .classifier import (
    SUPPORTED_REPO_TYPES,
    apply_repo_type_override,
    classify_repo,
    collect_repo_signals,
)
from .scanner import (
    detect_backend_root,
    detect_backend_stack,
    detect_cli_entrypoints,
    detect_frontend_root,
    detect_glossary,
    detect_library_entrypoints,
    detect_package_manager,
    detect_result_contract,
    detect_scripts,
    detect_skill_metadata,
    describe_frontend,
    discover_documentation_inventory,
)
from .synthesizer import (
    supporting_doc_roles,
    synthesize_supporting_doc_insights,
    synthesize_supporting_doc_provenance,
)


def detect_repo_type(
    root: Path,
    frontend_root,
    backend_root,
    cli_entrypoints: Sequence[Path],
) -> Tuple[str, list[str], list[str]]:
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


def analyze_repo(
    root: Path,
    project_name: str,
    repo_type_override: Optional[str] = None,
    doc_profile: str = "bootstrap",
) -> RepoAnalysis:
    frontend_root = detect_frontend_root(root)
    backend_root = detect_backend_root(root)
    cli_entrypoints = detect_cli_entrypoints(root)
    library_entrypoints = detect_library_entrypoints(root)
    skill_meta = detect_skill_metadata(root)
    signals = collect_repo_signals(
        root,
        frontend_root,
        backend_root,
        cli_entrypoints,
        library_entrypoints,
        skill_meta,
    )
    classification = apply_repo_type_override(
        classify_repo(signals),
        repo_type_override,
    )

    summary = extract_readme_summary(root)
    package_manager = detect_package_manager(frontend_root, root)
    frontend_stack, routes, components, frontend_scripts = describe_frontend(frontend_root)
    backend_stack, endpoints, storage_rules = detect_backend_stack(backend_root)
    docs_inventory = discover_documentation_inventory(root)
    supporting_doc_insights = synthesize_supporting_doc_insights(root, docs_inventory)
    supporting_doc_provenance = synthesize_supporting_doc_provenance(root, docs_inventory)

    return RepoAnalysis(
        root=root,
        project_name=project_name,
        repo_type=classification.primary_type,
        doc_profile=doc_profile,
        repo_type_reasons=classification.reasons,
        repo_type_questions=classification.open_questions,
        summary=summary,
        frontend_root=frontend_root,
        backend_root=backend_root,
        package_manager=package_manager,
        frontend_stack=frontend_stack,
        routes=routes,
        components=components,
        frontend_scripts=frontend_scripts,
        backend_stack=backend_stack,
        endpoints=endpoints,
        storage_rules=storage_rules,
        script_files=detect_scripts(root),
        glossary_entries=detect_glossary(root),
        contract_fields=detect_result_contract(root),
        skill_meta=skill_meta,
        library_entrypoints=library_entrypoints,
        cli_entrypoints=cli_entrypoints,
        signals=signals,
        classification=classification,
        docs_inventory=docs_inventory,
        supporting_doc_insights=supporting_doc_insights,
        supporting_doc_provenance=supporting_doc_provenance,
    )


__all__ = [
    "SUPPORTED_REPO_TYPES",
    "analyze_repo",
    "detect_repo_type",
    "supporting_doc_roles",
]
