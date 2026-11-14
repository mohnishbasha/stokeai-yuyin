#!/usr/bin/env bash
# Runs every scaffold smoke test and stops at the first failure.
set -euo pipefail
cd "$(dirname "$0")"
for t in smoke_*.sh; do
  bash "$t"
done
