#!/usr/bin/env bash
# SC-33: `make help` lists every target named in ARCHITECTURE 16.1, and every Makefile
# target carries a `## ` description, so help is complete.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
help="$(make --no-print-directory help)"
spec="$(sed -n '/^### 16.1 /,/^### 16.2 /p' docs/ARCHITECTURE.md | grep -oE 'make [a-z][a-z0-9-]*' | awk '{print $2}' | sort -u)"
[[ "$(wc -l <<<"$spec")" -ge 30 ]] || { echo "FAIL: could not read targets from ARCHITECTURE 16.1"; exit 1; }
for t in $spec; do
  grep -qE "^  make $t( |\$)" <<<"$help" || { echo "FAIL: make help does not list $t"; exit 1; }
done
undocumented="$(grep -E '^[a-zA-Z0-9_-]+:' Makefile | grep -v '## ' || true)"
[[ -z "$undocumented" ]] || { echo "FAIL: targets without a ## description: $undocumented"; exit 1; }
echo "ok: unit_make_help_alltargets_listed"
