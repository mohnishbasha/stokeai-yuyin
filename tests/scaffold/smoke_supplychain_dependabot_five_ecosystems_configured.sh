#!/usr/bin/env bash
# SC-38: dependabot.yml covers cargo, bun/npm, uv/pip, github-actions, and docker on a weekly
# schedule targeting develop; security.yml runs audit and gitleaks with read-only permissions.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
d=.github/dependabot.yml
[[ -f "$d" ]] || { echo "FAIL: $d missing"; exit 1; }
for e in cargo "(bun|npm)" "(uv|pip)" github-actions docker; do
  grep -qE "package-ecosystem: $e\$" "$d" || { echo "FAIL: dependabot lacks $e"; exit 1; }
done
n="$(grep -c 'package-ecosystem:' "$d")"
[[ "$(grep -c 'interval: weekly' "$d")" == "$n" ]] || { echo "FAIL: not all weekly"; exit 1; }
[[ "$(grep -c 'target-branch: develop' "$d")" == "$n" ]] || { echo "FAIL: not all target develop"; exit 1; }
w=.github/workflows/security.yml
[[ -f "$w" ]] || { echo "FAIL: $w missing"; exit 1; }
for s in "pull_request" "schedule:" "scripts/audit.sh" "gitleaks git" "contents: read" "8.30.1"; do
  grep -q "$s" "$w" || { echo "FAIL: security.yml lacks '$s'"; exit 1; }
done
echo "ok: smoke_supplychain_dependabot_five_ecosystems_configured"
