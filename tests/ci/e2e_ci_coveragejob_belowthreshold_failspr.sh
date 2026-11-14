#!/usr/bin/env bash
# SC-42: a PR that drops yuyin-gateway under its coverage threshold fails the coverage job
# on GitHub. The probe adds an untested, lint-clean module large enough to pull the crate
# below 80%.
source "$(dirname "$0")/lib.sh"
branch="probe/ci-coverage-$(date +%s)"
edit='{
  printf "//! Untested code for the CI coverage probe.\n\n#![allow(dead_code)]\n\n#[must_use]\npub fn coverage_probe(n: u64) -> u64 {\n    let mut total = 0;\n"
  for i in $(seq 40); do printf "    total += n.wrapping_mul(%d);\n" "$i"; done
  printf "    total\n}\n"
} > crates/yuyin-gateway/src/probe.rs
perl -pi -e "s/^mod rest;\$/mod probe;\nmod rest;/" crates/yuyin-gateway/src/main.rs
git add crates/yuyin-gateway/src/probe.rs'
pr="$(probe_pr "$branch" "test(ci): probe, coverage below threshold" "test(ci): coverage below threshold probe" "$edit")"
trap 'close_probe "$pr" "$branch"' EXIT
c="$(job_conclusion "$pr" coverage)"
[[ "$c" == "failure" ]] || { echo "FAIL: coverage concluded $c on PR #$pr"; exit 1; }
echo "ok: e2e_ci_coveragejob_belowthreshold_failspr (PR #$pr)"
