#!/usr/bin/env bash
# SC-07: with every manifest at the VERSION value, check-versions.sh exits 0.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
[[ "$(tr -d '[:space:]' < VERSION)" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || { echo "FAIL: VERSION is not semver"; exit 1; }
scripts/check-versions.sh >/dev/null
echo "ok: smoke_scripts_check_versions_aligned_exits_0"
