#!/usr/bin/env bash
# SC-17: the four agent skill scripts are executable and exit 0 on the scaffold.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
for s in run-tests check-types run-golden run-bench; do
  f=".agent/skills/$s/run.sh"
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
  [ -x "$f" ] || { echo "FAIL: $f is not executable"; exit 1; }
  bash "$f" >/dev/null 2>&1 || { echo "FAIL: $f exited non-zero"; exit 1; }
done
echo "ok: smoke_agent_skills_run_sh_exit_0"
