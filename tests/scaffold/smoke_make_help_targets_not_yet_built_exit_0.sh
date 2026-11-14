#!/usr/bin/env bash
# SC-19: every target that is not built yet prints "available from Sprint N" and exits 0.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
targets="$(grep -B1 -E '^\s+\$\(call later,' Makefile | sed -nE 's/^([a-zA-Z0-9_-]+):.*/\1/p')"
[[ -n "$targets" ]] || { echo "FAIL: no future targets found"; exit 1; }
for t in $targets; do
  out="$(make --no-print-directory "$t")" || { echo "FAIL: make $t exited non-zero"; exit 1; }
  [[ "$out" =~ available\ from\ Sprint\ [0-9]+ ]] || { echo "FAIL: make $t printed: $out"; exit 1; }
done
echo "ok: smoke_make_help_targets_not_yet_built_exit_0"
