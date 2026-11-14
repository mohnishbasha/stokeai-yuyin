#!/usr/bin/env bash
# Runs every scaffold smoke, unit, integration, and contract test and stops at the first failure.
# e2e_*.sh tests need Docker and run separately (make e2e).
set -euo pipefail
cd "$(dirname "$0")"
for t in smoke_*.sh unit_*.sh it_*.sh contract_*.sh; do
  bash "$t"
done
