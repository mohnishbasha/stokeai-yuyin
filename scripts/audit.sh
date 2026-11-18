#!/usr/bin/env bash
# Dependency vulnerability audit: Rust (cargo audit, cargo deny advisories/bans/sources),
# TypeScript (bun audit), Python SDK (no runtime dependencies at present).
# Licences are checked separately by scripts/licence-check.sh.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "== cargo audit"
cargo audit
echo "== cargo deny check advisories bans sources"
cargo deny check advisories bans sources
echo "== bun audit"
# Time-boxed advisory exceptions (owner decision B9, 2026-11-17). Each entry is "<id> <review-by date>".
# The audit fails once the date passes, so every exception is re-decided rather than forgotten.
#   GHSA-fc5q-39xc-vjpf: picomatch <= 4.0.7 ReDoS through repeated extglobs. No patched release exists.
#   Reached only through dev tooling (vitest, typescript-eslint via tinyglobby and fdir), which matches
#   globs written in this repository, never user input. Nothing ships it in the console or gateway.
#   Remove this entry once a fixed picomatch is released and the lockfile picks it up.
BUN_AUDIT_EXCEPTIONS=(
  "GHSA-fc5q-39xc-vjpf 2026-12-17"
)
today=$(date -u +%Y-%m-%d)
ignore_args=()
for entry in "${BUN_AUDIT_EXCEPTIONS[@]}"; do
  read -r id review_by <<<"$entry"
  if [[ "$today" > "$review_by" ]]; then
    echo "audit: exception $id expired on $review_by; re-decide it with the owner (docs/OWNER_CHECKLIST.md)" >&2
    exit 1
  fi
  ignore_args+=("--ignore=$id")
done
bun audit "${ignore_args[@]}"
echo "== python sdk"
if grep -qE '^dependencies = \[\s*\]' packages/sdk-python/pyproject.toml; then
  echo "packages/sdk-python has no runtime dependencies; nothing to audit"
else
  echo "audit: packages/sdk-python gained runtime dependencies; add a Python audit step" >&2
  exit 1
fi
echo "audit: ok"
