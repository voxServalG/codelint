from __future__ import annotations

import pathlib

from .model import SizeViolation


def check(src_dir: pathlib.Path, config: dict) -> list[SizeViolation]:
    """检查所有 Python 文件的长度，返回违规列表。"""
    max_lines_error = config["max_lines_error"]
    max_lines_warning = config["max_lines_warning"]

    violations: list[SizeViolation] = []

    for py_file in sorted(src_dir.rglob("*.py")):
        if py_file.name == "__main__.py":
            continue
        if "__pycache__" in py_file.parts:
            continue

        try:
            line_count = len(py_file.read_text(encoding="utf-8").splitlines())
        except (OSError, UnicodeDecodeError):
            continue

        if line_count > max_lines_error:
            violations.append(SizeViolation(
                rule="file-size",
                severity="error",
                file_path=str(py_file),
                lines=line_count,
                threshold=max_lines_error,
                message=(
                    f"文件 {line_count} 行，超过上限 {max_lines_error} 行。"
                    f"请将文件拆分，按稳定语义提取子模块。"
                ),
            ))
        elif line_count > max_lines_warning:
            violations.append(SizeViolation(
                rule="file-size",
                severity="warning",
                file_path=str(py_file),
                lines=line_count,
                threshold=max_lines_warning,
                message=(
                    f"文件 {line_count} 行，超过预警线 {max_lines_warning} 行。"
                    f"如继续增长，请拆分。"
                ),
            ))

    return violations
