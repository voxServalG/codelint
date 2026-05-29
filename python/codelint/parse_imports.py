from __future__ import annotations

import ast
import pathlib

from .model import ImportInfo


def parse_file(file_path: pathlib.Path, module_prefix: str) -> list[ImportInfo]:
    """解析单个 Python 文件中所有 `from <prefix>.X.Y import Z` 语句。"""
    imports: list[ImportInfo] = []
    try:
        source = file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return imports

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return imports

    rel_path = str(file_path)
    prefix_dot = module_prefix + "."

    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom):
            continue
        if node.module is None:
            continue
        if not node.module.startswith(prefix_dot):
            continue

        for alias in node.names:
            imports.append(ImportInfo(
                file_path=rel_path,
                line=node.lineno,
                module=node.module,
                imported_name=alias.name,
            ))

    return imports


def parse_all(src_dir: pathlib.Path, module_prefix: str) -> list[ImportInfo]:
    """解析 src 下所有 .py 文件的 import 语句。"""
    all_imports: list[ImportInfo] = []
    for py_file in sorted(src_dir.rglob("*.py")):
        if py_file.name == "__main__.py":
            continue
        if "__pycache__" in py_file.parts:
            continue
        all_imports.extend(parse_file(py_file, module_prefix))
    return all_imports
