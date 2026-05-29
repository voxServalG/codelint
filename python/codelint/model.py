from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ImportInfo:
    file_path: str
    line: int
    module: str
    imported_name: str


@dataclass
class Violation:
    rule: str
    severity: str
    file_path: str
    line: int
    importing_module: str
    importing_layer: int
    imported_module: str
    imported_layer: int | None
    message: str


@dataclass
class SizeViolation:
    rule: str
    severity: str
    file_path: str
    lines: int
    threshold: int
    message: str


@dataclass
class LintResult:
    file: str
    line_count: int
    violations: list[Violation] = field(default_factory=list)
    size_violations: list[SizeViolation] = field(default_factory=list)
