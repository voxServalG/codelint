from __future__ import annotations

import json

from .model import SizeViolation, Violation


def format_violations(
    layer: list[Violation],
    size: list[SizeViolation],
) -> dict:
    layer_results = []
    for v in layer:
        layer_results.append({
            "rule": v.rule,
            "severity": v.severity,
            "file": v.file_path,
            "line": v.line,
            "importing_module": v.importing_module,
            "importing_layer": v.importing_layer,
            "imported_module": v.imported_module,
            "imported_layer": v.imported_layer,
            "message": v.message,
        })

    size_results = []
    for v in size:
        size_results.append({
            "rule": v.rule,
            "severity": v.severity,
            "file": v.file_path,
            "lines": v.lines,
            "threshold": v.threshold,
            "message": v.message,
        })

    all_violations = layer_results + size_results
    errors = sum(1 for r in all_violations if r["severity"] == "error")
    warnings = sum(1 for r in all_violations if r["severity"] == "warning")

    return {
        "timestamp": "",
        "total_files": 0,
        "total_imports": 0,
        "layer_violations": len(layer),
        "size_violations": len(size),
        "errors": errors,
        "warnings": warnings,
        "results": all_violations,
    }


def print_text(report: dict) -> None:
    print("# Layer Check Report\n")
    print(f"  Layer violations: {report['layer_violations']}")
    print(f"  Size violations:  {report['size_violations']}")
    print(f"  Errors:   {report['errors']}")
    print(f"  Warnings: {report['warnings']}")
    print()

    for r in report["results"]:
        prefix = "E" if r["severity"] == "error" else "W"
        if r["rule"] == "layer-direction":
            print(f"  {prefix}[{r['rule']}] {r['file']}:{r['line']}")
            print(
                f"    L{r['importing_layer']} -> L{r['imported_layer']}: "
                f"{r['message']}"
            )
        elif r["rule"] == "file-size":
            print(
                f"  {prefix}[{r['rule']}] {r['file']}: "
                f"{r['lines']} lines (threshold: {r['threshold']})"
            )
            print(f"    {r['message']}")
        print()


def print_json(report: dict) -> None:
    import datetime
    report["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print(json.dumps(report, indent=2, ensure_ascii=False))
