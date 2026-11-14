#!/usr/bin/env bash
# SC-37: scripts/audit.sh passes on the current tree and covers cargo audit, cargo deny, and bun audit.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
[[ -x scripts/audit.sh ]] || { echo "FAIL: scripts/audit.sh not executable"; exit 1; }
for c in "cargo audit" "cargo deny check advisories bans sources" "bun audit"; do
  grep -q "$c" scripts/audit.sh || { echo "FAIL: audit.sh lacks '$c'"; exit 1; }
done
scripts/audit.sh >/dev/null 2>&1 || { echo "FAIL: scripts/audit.sh exited non-zero"; exit 1; }
echo "ok: smoke_supplychain_audit_script_current_tree_passes"
