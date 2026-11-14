#!/usr/bin/env bash
# SC-31: the CI workflow runs the licence check script on PRs and pushes to develop, and deny.toml
# carries the allowlist.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
w=.github/workflows/licence-check.yml
[[ -f "$w" ]] || { echo "FAIL: $w missing"; exit 1; }
grep -q "pull_request" "$w" && grep -q "develop" "$w" || { echo "FAIL: workflow triggers wrong"; exit 1; }
grep -q "scripts/licence-check.sh" "$w" || { echo "FAIL: workflow does not run the script"; exit 1; }
[[ -x scripts/licence-check.sh ]] || { echo "FAIL: script not executable"; exit 1; }
for l in MIT Apache-2.0 BSD-2-Clause BSD-3-Clause ISC Zlib Unicode-3.0 MPL-2.0; do
  grep -q "\"$l\"" deny.toml || { echo "FAIL: deny.toml lacks $l"; exit 1; }
done
if grep -q "GPL" deny.toml; then echo "FAIL: deny.toml mentions GPL"; exit 1; fi
echo "ok: smoke_legal_licence_check_workflow_wired_runs_script"
