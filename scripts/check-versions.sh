#!/usr/bin/env bash
set -euo pipefail

CANONICAL=$(tr -d '[:space:]' < VERSION)

check() {
  local actual=$1 file=$2
  if [[ "$actual" != "$CANONICAL" ]]; then
    echo "✗ Version mismatch in $file: expected $CANONICAL, got $actual"
    exit 1
  fi
  echo "✓ $file: $CANONICAL"
}

check "$(grep -m1 -A20 '^\[workspace.package\]' Cargo.toml | grep -m1 '^version' | cut -d'"' -f2)" "Cargo.toml [workspace.package]"
check "$(jq -r '.version' package.json)" "package.json"
for pkg in apps/console apps/docs packages/sdk-ts packages/cli packages/mcp integrations/pi; do
  check "$(jq -r '.version' "$pkg/package.json")" "$pkg/package.json"
done
check "$(grep -m1 '^version' packages/sdk-python/pyproject.toml | cut -d'"' -f2)" "packages/sdk-python/pyproject.toml"
check "$(awk '/^info:/{i=1;next} i&&/^  version:/{print $2;exit}' api/openapi.yaml)" "api/openapi.yaml info.version"
# Added in the sprint that creates them (never skipped silently):
#   deploy/helm/yuyin/Chart.yaml version     Sprint 3
#   deploy/helm/yuyin/Chart.yaml appVersion  Sprint 3

echo "── All versions consistent: $CANONICAL ──"
