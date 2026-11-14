#!/usr/bin/env bash
# Measures line coverage (cargo tarpaulin, vitest, pytest-cov) into coverage/ and checks it
# against .coverage-thresholds.toml with scripts/coverage-check.py.
set -euo pipefail
cd "$(dirname "$0")/.."
out=coverage
rm -rf "$out" && mkdir -p "$out"

cargo tarpaulin --workspace --locked --skip-clean --engine llvm --out Json --output-dir "$out" >"$out/tarpaulin.log" 2>&1 \
  || { tail -30 "$out/tarpaulin.log" >&2; exit 1; }

ts_args=()
for pkg in apps/* packages/* integrations/*; do
  [[ -f "$pkg/package.json" ]] && grep -q '"test": "vitest' "$pkg/package.json" || continue
  dir="$PWD/$out/ts/${pkg//\//-}"
  (cd "$pkg" && bunx vitest run --coverage.enabled --coverage.provider=v8 \
    --coverage.reporter=json-summary --coverage.include='src/**' \
    --coverage.reportsDirectory="$dir") >/dev/null
  ts_args+=(--ts "$dir/coverage-summary.json")
done

(cd packages/sdk-python && uv run --frozen pytest -q --cov=yuyin --cov-report="json:$PWD/../../$out/python/coverage.json" tests) >/dev/null

python3 scripts/coverage-check.py --rust "$out/tarpaulin-report.json" "${ts_args[@]}" --python "$out/python/coverage.json"
