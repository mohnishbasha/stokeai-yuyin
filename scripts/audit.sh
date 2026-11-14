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
bun audit
echo "== python sdk"
if grep -qE '^dependencies = \[\s*\]' packages/sdk-python/pyproject.toml; then
  echo "packages/sdk-python has no runtime dependencies; nothing to audit"
else
  echo "audit: packages/sdk-python gained runtime dependencies; add a Python audit step" >&2
  exit 1
fi
echo "audit: ok"
