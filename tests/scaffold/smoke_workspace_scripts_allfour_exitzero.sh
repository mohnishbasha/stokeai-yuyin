#!/usr/bin/env bash
# SC-23: the root scripts lint, type-check, test, and build all exit 0.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
for s in lint type-check test build; do
  bun run "$s" >/dev/null 2>&1 || { echo "FAIL: bun run $s"; exit 1; }
done
echo "ok: smoke_workspace_scripts_allfour_exitzero"
