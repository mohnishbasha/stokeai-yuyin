#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

# Runs the Rust, TypeScript, and Python suites and prints a summary.
declare -a results=()
fail=0
step() {
  local name="$1"
  shift
  if "$@"; then results+=("pass  $name"); else results+=("FAIL  $name"); fail=1; fi
}

step "rust (cargo test --workspace)" cargo test --workspace
step "typescript (bun run test)" bun run test
step "python (pytest)" bash -c 'cd packages/sdk-python && uv run --group dev pytest'

echo
echo "run-tests summary"
printf '  %s\n' "${results[@]}"
exit "$fail"
