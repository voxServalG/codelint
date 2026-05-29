from __future__ import annotations

import pathlib

from .model import ImportInfo, Violation


def check(imports: list[ImportInfo], config: dict) -> list[Violation]:
    """检查所有 import 的层级方向，返回违规列表。"""
    from .config import file_to_module, module_to_tier

    tier_map = config["tier_map"]
    tier_names = config["tier_names"]
    src_dir = config["src_dir"]

    violations: list[Violation] = []
    seen: set[tuple[str, str, int]] = set()

    for imp in imports:
        source_module = file_to_module(pathlib.Path(imp.file_path), src_dir)
        if source_module is None:
            continue

        source_tier = module_to_tier(source_module, tier_map)
        if source_tier is None:
            continue

        target_tier = module_to_tier(imp.module, tier_map)
        if target_tier is None:
            continue

        key = (source_module, imp.module, imp.line)
        if key in seen:
            continue
        seen.add(key)

        if source_tier < target_tier:
            violations.append(Violation(
                rule="layer-direction",
                severity="error",
                file_path=imp.file_path,
                line=imp.line,
                importing_module=source_module,
                importing_layer=source_tier,
                imported_module=imp.module,
                imported_layer=target_tier,
                message=_build_message(
                    source_module, source_tier, imp.module, target_tier, tier_names,
                ),
            ))

    return violations


def _build_message(
    source_module: str,
    source_tier: int,
    target_module: str,
    target_tier: int,
    tier_names: dict[int, str],
) -> str:
    source_name = tier_names.get(source_tier, f"L{source_tier}")
    target_name = tier_names.get(target_tier, f"L{target_tier}")
    return (
        f"禁止的方向: {source_module} (L{source_tier} {source_name}) "
        f"→ {target_module} (L{target_tier} {target_name})。"
        f"低层(L{source_tier})不可依赖高层(L{target_tier})。"
    )
