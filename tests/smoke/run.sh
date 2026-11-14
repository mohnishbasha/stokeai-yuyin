#!/usr/bin/env bash
# Runs the smoke suite against a running stack (make smoke). URL from YUYIN_SMOKE_URL.
set -euo pipefail
cd "$(dirname "$0")"
for t in smoke_*.sh; do
  bash "$t"
done
