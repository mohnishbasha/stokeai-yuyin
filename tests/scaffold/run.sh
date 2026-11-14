#!/usr/bin/env bash
# Runs every scaffold smoke, unit, and it_ test and stops at the first failure.
# e2e_*.sh tests need Docker and run separately (make e2e).
set -euo pipefail
cd "$(dirname "$0")"
for t in smoke_*.sh unit_*.sh it_*.sh; do
  bash "$t"
done
