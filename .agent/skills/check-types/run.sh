#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

# Runs clippy, the TypeScript type-check, and mypy, and prints a summary.
declare -a results=()
fail=0
step() {
  local name="$1"
  shift
  if "$@"; then results+=("pass  $name"); else results+=("FAIL  $name"); fail=1; fi
}

step "rust (cargo clippy -D warnings)" cargo clippy --workspace --all-targets -- -D warnings
step "typescript (bun run type-check)" bun run type-check
step "python (mypy --strict)" bash -c 'cd packages/sdk-python && uv run --with mypy mypy --strict yuyin'

echo
echo "check-types summary"
printf '  %s\n' "${results[@]}"
exit "$fail"
