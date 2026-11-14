#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

# The benchmark harness (bench/loadgen) arrives in Sprint 3, S3-T13.
# Intended usage is in .agent/skills/run-bench/SKILL.md.
echo "run-bench: available from Sprint 3 (S3-T13)"
exit 0
