#!/usr/bin/env bash
# SC-41: a PR with a deliberate lint error fails the lint-and-typecheck job on GitHub.
source "$(dirname "$0")/lib.sh"
branch="probe/ci-lint-$(date +%s)"
pr="$(probe_pr "$branch" "test(ci): probe, deliberate lint error" "test(ci): deliberate lint error probe" \
  "printf '\n/// Deliberate lint error.\npub fn lint_probe() -> bool {\n    let probe = vec![1];\n    probe.len() == 0\n}\n' >> crates/yuyin-gateway/src/rest.rs")"
trap 'close_probe "$pr" "$branch"' EXIT
c="$(job_conclusion "$pr" lint-and-typecheck)"
[[ "$c" == "failure" ]] || { echo "FAIL: lint-and-typecheck concluded $c on PR #$pr"; exit 1; }
echo "ok: e2e_ci_lintjob_deliberateerror_failspr (PR #$pr)"
