#!/usr/bin/env bash
# SC-05: the CI lint job runs `make lint`, and `make lint` fails on a deliberate lint error
# (a clippy warning, denied by -D warnings) in a clean clone.
source "$(dirname "$0")/lib.sh"
grep -qE '^\s+run: make lint$' "$ROOT/.github/workflows/ci.yml" || { echo "FAIL: ci.yml lint job does not run make lint"; exit 1; }
src="$(clean_clone)"
cd "$src"
cat >> crates/yuyin-gateway/src/rest.rs <<'RS'

/// Deliberate lint error for SC-05.
pub fn lint_probe() -> bool {
    let probe = vec![1];
    probe.len() == 0
}
RS
if CARGO_TARGET_DIR="$ROOT/target" make --no-print-directory lint >/dev/null 2>&1; then
  echo "FAIL: make lint passed with a deliberate clippy error"; exit 1
fi
echo "ok: it_ci_lint_gate_deliberate_error_fails"
