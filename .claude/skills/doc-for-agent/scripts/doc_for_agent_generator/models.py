from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass(frozen=True)
class DocumentationInventory:
    canonical_agents_root: Optional[Path] = None
    detected_state: str = "initialize"
    agent_roots: List[Path] = field(default_factory=list)
    flat_agent_files: List[Path] = field(default_factory=list)
    layered_agent_files: List[Path] = field(default_factory=list)
    root_agent_files: List[Path] = field(default_factory=list)
    supporting_docs: List[Path] = field(default_factory=list)
    archive_candidates: List[Path] = field(default_factory=list)
    reference_only_docs: List[Path] = field(default_factory=list)


@dataclass(frozen=True)
class SkillMetadata:
    skill_file: Optional[Path] = None
    skill_name: str = ""
    agent_manifests: List[Path] = field(default_factory=list)
    references: List[Path] = field(default_factory=list)
    scripts: List[Path] = field(default_factory=list)


@dataclass(frozen=True)
class RepoSignals:
    top_level_dirs: List[str] = field(default_factory=list)
    top_level_files: List[str] = field(default_factory=list)
    has_skill_file: bool = False
    has_agent_manifests: bool = False
    has_root_skill_markers: bool = False
    has_embedded_skill_markers: bool = False
    has_workspace_layout: bool = False
    has_frontend: bool = False
    has_backend: bool = False
    has_package_json: bool = False
    has_package_bin: bool = False
    has_python_packaging: bool = False
    package_name: str = ""
    package_dependencies: List[str] = field(default_factory=list)
    cli_entrypoints: List[Path] = field(default_factory=list)
    library_entrypoints: List[Path] = field(default_factory=list)


@dataclass(frozen=True)
class RepoClassification:
    primary_type: str
    confidence: str = "low"
    reasons: List[str] = field(default_factory=list)
    secondary_traits: List[str] = field(default_factory=list)
    conflicting_signals: List[str] = field(default_factory=list)
    open_questions: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class RepoAnalysis:
    root: Path
    project_name: str
    repo_type: str
    doc_profile: str = "bootstrap"
    repo_type_reasons: List[str] = field(default_factory=list)
    repo_type_questions: List[str] = field(default_factory=list)
    summary: str = ""
    frontend_root: Optional[Path] = None
    backend_root: Optional[Path] = None
    package_manager: str = "npm"
    frontend_stack: str = "No dedicated frontend detected."
    routes: List[str] = field(default_factory=list)
    components: List[str] = field(default_factory=list)
    frontend_scripts: Dict[str, str] = field(default_factory=dict)
    backend_stack: str = "No dedicated backend detected."
    endpoints: List[str] = field(default_factory=list)
    storage_rules: List[str] = field(default_factory=list)
    script_files: List[str] = field(default_factory=list)
    glossary_entries: List[str] = field(default_factory=list)
    contract_fields: List[str] = field(default_factory=list)
    skill_meta: SkillMetadata = field(default_factory=SkillMetadata)
    library_entrypoints: List[Path] = field(default_factory=list)
    cli_entrypoints: List[Path] = field(default_factory=list)
    signals: RepoSignals = field(default_factory=RepoSignals)
    classification: RepoClassification = field(default_factory=lambda: RepoClassification(primary_type="unknown"))
    docs_inventory: DocumentationInventory = field(default_factory=DocumentationInventory)
    supporting_doc_insights: Dict[str, Dict[str, List[str]]] = field(default_factory=dict)
    supporting_doc_provenance: Dict[str, List[str]] = field(default_factory=dict)
