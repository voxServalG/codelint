from __future__ import annotations

import argparse
import pathlib
import sys

from .check_layer import check as check_layer
from .check_size import check as check_size
from .config import load
from .parse_imports import parse_all as parse_all_imports
from .report import format_violations, print_json, print_text


def main() -> None:
    parser = argparse.ArgumentParser(
        description="codelint — Python 代码层级与文件大小检查",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="JSON 格式输出",
    )
    parser.add_argument(
        "--src",
        type=str,
        default=None,
        help="源码目录路径（默认从 codelint.json 读取）",
    )
    args = parser.parse_args()

    project_root = pathlib.Path.cwd()
    config = load(project_root)

    src_dir = pathlib.Path(args.src) if args.src else config["src_dir"]
    if not src_dir.is_absolute():
        src_dir = project_root / src_dir
    config["src_dir"] = src_dir

    imports = parse_all_imports(src_dir, config["module_prefix"])
    layer_violations = check_layer(imports, config)
    size_violations = check_size(src_dir, config)

    report = format_violations(layer_violations, size_violations)
    report["total_files"] = _count_py_files(src_dir)
    report["total_imports"] = len(imports)

    if args.json:
        print_json(report)
    else:
        print_text(report)

    if report["errors"] > 0:
        sys.exit(1)
    elif report["warnings"] > 0:
        sys.exit(2)
    else:
        sys.exit(0)


def _count_py_files(src_dir: pathlib.Path) -> int:
    return sum(
        1 for f in src_dir.rglob("*.py")
        if f.name != "__main__.py" and "__pycache__" not in f.parts
    )
