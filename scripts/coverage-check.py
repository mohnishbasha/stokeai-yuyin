#!/usr/bin/env python3
"""Compares measured line coverage with .coverage-thresholds.toml and exits 1 on any miss.

Inputs (all paths relative to the repository root unless absolute):
  --thresholds  thresholds file (default .coverage-thresholds.toml)
  --rust        cargo tarpaulin JSON report (tarpaulin-report.json)
  --ts          vitest json-summary reports (coverage-summary.json), repeatable
  --python      coverage.py JSON report (coverage.json)
"""

import argparse
import json
import os
import sys
import tomllib


def pct(covered: int, total: int) -> float:
    return 100.0 * covered / total


def rust_totals(report: dict, root: str) -> dict[str, tuple[int, int]]:
    """Sums covered and coverable lines per crate from a tarpaulin JSON report."""
    totals: dict[str, tuple[int, int]] = {}
    for f in report.get("files", []):
        path = os.path.relpath(os.path.join(os.sep, *f["path"]), root)
        parts = path.split(os.sep)
        if len(parts) < 3 or parts[0] != "crates":
            continue
        c, t = totals.get(parts[1], (0, 0))
        totals[parts[1]] = (c + f["covered"], t + f["coverable"])
    return totals


def prefix_totals(files: dict[str, tuple[int, int]], prefix: str) -> tuple[int, int]:
    covered = total = 0
    for path, (c, t) in files.items():
        if path == prefix or path.startswith(prefix + "/"):
            covered += c
            total += t
    return covered, total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--thresholds", default=".coverage-thresholds.toml")
    ap.add_argument("--rust")
    ap.add_argument("--ts", action="append", default=[])
    ap.add_argument("--python")
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    root = os.path.realpath(args.root)

    with open(args.thresholds, "rb") as fh:
        thresholds = tomllib.load(fh)

    failures = 0

    def judge(section: str, name: str, covered: int, total: int, minimum: float) -> None:
        nonlocal failures
        if total == 0:
            print(f"skip  {section:10} {name:32} no instrumented lines yet (threshold {minimum}%)")
            return
        value = pct(covered, total)
        ok = value >= minimum
        failures += 0 if ok else 1
        status = "ok  " if ok else "FAIL"
        print(f"{status}  {section:10} {name:32} {value:6.2f}% (threshold {minimum}%, {covered}/{total} lines)")

    def missing(section: str, name: str, why: str) -> None:
        nonlocal failures
        failures += 1
        print(f"FAIL  {section:10} {name:32} {why}")

    rust = thresholds.get("rust", {})
    if rust:
        if not args.rust:
            for name in rust:
                missing("rust", name, "no tarpaulin report given")
        else:
            with open(args.rust) as fh:
                totals = rust_totals(json.load(fh), root)
            for name, minimum in rust.items():
                if not os.path.isdir(os.path.join(root, "crates", name)):
                    print(f"skip  {'rust':10} {name:32} crate not present yet")
                    continue
                judge("rust", name, *totals.get(name, (0, 0)), minimum)

    ts_files: dict[str, tuple[int, int]] = {}
    for report in args.ts:
        with open(report) as fh:
            for path, entry in json.load(fh).items():
                if path == "total":
                    continue
                rel = os.path.relpath(os.path.realpath(path), root)
                ts_files[rel] = (entry["lines"]["covered"], entry["lines"]["total"])
    for prefix, minimum in thresholds.get("typescript", {}).items():
        if not os.path.isdir(os.path.join(root, prefix)):
            print(f"skip  {'typescript':10} {prefix:32} path not present yet")
            continue
        covered, total = prefix_totals(ts_files, prefix)
        if total == 0 and not any(p.startswith(prefix + "/") for p in ts_files):
            missing("typescript", prefix, "no coverage data for this path")
            continue
        judge("typescript", prefix, covered, total, minimum)

    py_files: dict[str, tuple[int, int]] = {}
    if args.python:
        with open(args.python) as fh:
            report = json.load(fh)
        base = os.path.dirname(os.path.realpath(args.python))
        for path, entry in report.get("files", {}).items():
            rel = os.path.relpath(os.path.join(base, path), root)
            s = entry["summary"]
            py_files[rel] = (s["covered_lines"], s["num_statements"])
    for prefix, minimum in thresholds.get("python", {}).items():
        if not os.path.isdir(os.path.join(root, prefix)):
            print(f"skip  {'python':10} {prefix:32} path not present yet")
            continue
        if not any(p.startswith(prefix + "/") for p in py_files):
            missing("python", prefix, "no coverage data for this path")
            continue
        judge("python", prefix, *prefix_totals(py_files, prefix), minimum)

    if failures:
        print(f"coverage-check: {failures} below threshold or missing", file=sys.stderr)
        return 1
    print("coverage-check: all thresholds met")
    return 0


if __name__ == "__main__":
    sys.exit(main())
