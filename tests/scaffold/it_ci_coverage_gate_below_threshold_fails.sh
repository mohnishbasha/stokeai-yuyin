#!/usr/bin/env bash
# SC-06: the CI coverage job runs scripts/coverage.sh, and scripts/coverage-check.py exits 1
# when a crate is below its threshold in .coverage-thresholds.toml or a path has no data,
# and exits 0 when every threshold is met.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
grep -qE '^\s+run: scripts/coverage.sh$' .github/workflows/ci.yml || { echo "FAIL: ci.yml coverage job does not run scripts/coverage.sh"; exit 1; }
tmp="$(mktemp -d)"
cat > "$tmp/thresholds.toml" <<'TOML'
[rust]
yuyin-gateway = 80
[typescript]
"packages/sdk-ts/src" = 85
[python]
"packages/sdk-python/yuyin" = 85
TOML
rust_report() { # rust_report <covered> <coverable>
  printf '{"files":[{"path":["%s","crates","yuyin-gateway","src","main.rs"],"covered":%d,"coverable":%d}]}' \
    "${ROOT#/}" "$1" "$2" > "$tmp/rust.json"
}
printf '{"total":{},"%s/packages/sdk-ts/src/index.ts":{"lines":{"total":10,"covered":10}}}' "$ROOT" > "$tmp/ts.json"
printf '{"files":{"yuyin/__init__.py":{"summary":{"covered_lines":9,"num_statements":10}}}}' > "$tmp/py.json"
check() { python3 scripts/coverage-check.py --thresholds "$tmp/thresholds.toml" --rust "$tmp/rust.json" "$@" >/dev/null 2>&1; }

rust_report 90 100
check --ts "$tmp/ts.json" --python "$tmp/py.json" || { echo "FAIL: thresholds met but the check failed"; exit 1; }
rust_report 79 100
if check --ts "$tmp/ts.json" --python "$tmp/py.json"; then echo "FAIL: gateway at 79% passed an 80% threshold"; exit 1; fi
rust_report 90 100
if check --python "$tmp/py.json"; then echo "FAIL: missing TypeScript coverage data passed"; exit 1; fi
echo "ok: it_ci_coverage_gate_below_threshold_fails"
