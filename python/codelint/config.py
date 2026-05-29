from __future__ import annotations

import json
import pathlib


def load(project_root: pathlib.Path) -> dict:
    """读取 codelint.json，返回标准化配置字典。"""
    config_path = project_root / "codelint.json"
    if not config_path.exists():
        return _defaults(project_root)

    raw = json.loads(config_path.read_text(encoding="utf-8"))

    tier_list = raw.get("tiers", [])
    tier_map: dict[str, int] = {}
    tier_names: dict[int, str] = {}
    for i, tier in enumerate(tier_list):
        tier_names[i] = tier.get("name", f"L{i}")
        for mod in tier.get("modules", []):
            tier_map[mod] = i

    return {
        "project_root": project_root,
        "module_prefix": raw.get("modulePrefix", ""),
        "src_dir": pathlib.Path(raw.get("srcDir", "src")),
        "max_lines_error": raw.get("maxLinesError", 500),
        "max_lines_warning": raw.get("maxLinesWarning", 300),
        "tier_map": tier_map,
        "tier_names": tier_names,
    }


def _defaults(project_root: pathlib.Path) -> dict:
    return {
        "project_root": project_root,
        "module_prefix": "",
        "src_dir": pathlib.Path("src"),
        "max_lines_error": 500,
        "max_lines_warning": 300,
        "tier_map": {},
        "tier_names": {},
    }


def module_to_tier(module_path: str, tier_map: dict[str, int]) -> int | None:
    """最长前缀匹配，返回模块所属层级。"""
    best_tier = None
    best_len = 0
    for prefix, tier in tier_map.items():
        if module_path.startswith(prefix) and len(prefix) > best_len:
            best_tier = tier
            best_len = len(prefix)
    return best_tier


def file_to_module(file_path: pathlib.Path, src_dir: pathlib.Path) -> str | None:
    """将文件路径转换为 Python 模块路径。"""
    try:
        relative = file_path.resolve().relative_to(src_dir.resolve())
    except ValueError:
        return None

    parts = list(relative.parts)
    if parts[-1].endswith(".py"):
        parts[-1] = parts[-1][:-3]
    if parts and parts[-1] == "__init__":
        parts.pop()

    if not parts:
        return None

    return ".".join(parts)
