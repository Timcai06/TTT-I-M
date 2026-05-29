from __future__ import annotations

import re
from typing import List, Optional, Sequence, Tuple


MANUAL_START = "<!-- doc-for-agent:manual-start -->"
MANUAL_END = "<!-- doc-for-agent:manual-end -->"


def split_markdown_sections(content: str) -> Tuple[str, List[Tuple[str, str]]]:
    lines = content.strip().splitlines()
    if not lines:
        return ("", [])

    title = lines[0].strip()
    sections: List[Tuple[str, str]] = []
    current_heading: Optional[str] = None
    current_lines: List[str] = []

    for line in lines[1:]:
        if line.startswith("## "):
            if current_heading is not None:
                sections.append((current_heading, "\n".join(current_lines).strip()))
            current_heading = line.strip()
            current_lines = []
        elif current_heading is not None:
            current_lines.append(line)

    if current_heading is not None:
        sections.append((current_heading, "\n".join(current_lines).strip()))

    return (title, sections)


def is_manual_section(content: str) -> bool:
    stripped = content.strip()
    if not stripped:
        return False
    if MANUAL_START in stripped and MANUAL_END in stripped:
        return True

    useful_lines = []
    for line in stripped.splitlines():
        text = line.strip()
        if not text:
            continue
        if text.startswith("TODO:") or text.startswith("- TODO:") or text.startswith("# TODO:"):
            continue
        useful_lines.append(text)

    if not useful_lines:
        return False

    placeholder_patterns = [
        "identify",
        "describe",
        "record",
        "list primary users",
        "list important",
        "未检测到",
        "needs human confirmation",
        "open questions",
    ]
    joined = " ".join(useful_lines).lower()
    return not any(pattern in joined for pattern in placeholder_patterns) or len(useful_lines) > 2


def should_preserve_section(content: str) -> bool:
    return is_manual_section(content)


def extract_manual_blocks(content: str) -> List[str]:
    pattern = re.compile(
        rf"{re.escape(MANUAL_START)}\n?(.*?){re.escape(MANUAL_END)}",
        re.DOTALL,
    )
    blocks = []
    for match in pattern.findall(content):
        block = match.strip()
        if block:
            blocks.append(block)
    return blocks


def append_manual_blocks(content: str, manual_blocks: Sequence[str]) -> str:
    if not manual_blocks:
        return content

    lines = [content.rstrip()] if content.strip() else []
    for block in manual_blocks:
        if lines:
            lines.append("")
        lines.append(MANUAL_START)
        lines.extend(block.splitlines())
        lines.append(MANUAL_END)
    return "\n".join(lines).strip()


def merge_markdown(existing: str, generated: str) -> str:
    existing_title, existing_sections = split_markdown_sections(existing)
    generated_title, generated_sections = split_markdown_sections(generated)
    if not existing_sections:
        return generated.strip() + "\n"

    existing_map = {heading: body for heading, body in existing_sections}
    merged_lines = [generated_title or existing_title]
    seen = set()

    for heading, body in generated_sections:
        chosen = body
        existing_body = existing_map.get(heading, "")
        manual_blocks = extract_manual_blocks(existing_body)
        if manual_blocks:
            chosen = append_manual_blocks(body, manual_blocks)
        merged_lines.extend(["", heading, "", chosen or ""])
        seen.add(heading)

    remaining_sections = [
        (heading, body)
        for heading, body in existing_sections
        if heading not in seen
        and heading != "## Preserved Notes"
        and body.strip()
        and should_preserve_section(body)
    ]
    if remaining_sections:
        merged_lines.extend(["", "## Preserved Notes", ""])
        for heading, body in remaining_sections:
            merged_lines.append(f"- {heading.removeprefix('## ').strip()}")
            merged_lines.append("  - Preserved from previous manual edits.")
            if body.strip():
                for line in body.splitlines():
                    merged_lines.append(f"  {line}" if line.strip() else "")

    return "\n".join(merged_lines).strip() + "\n"
