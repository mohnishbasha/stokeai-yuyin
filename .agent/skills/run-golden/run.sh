#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

# Runs the normalisation golden corpus. The golden test target prints the per-class
# pass counts itself, and any failing row with its diff.
corpus=crates/yuyin-text/golden
files=$(find "$corpus" -name '*.tsv' -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$files" -eq 0 ]; then
  echo "golden corpus empty: 0 rows"
  exit 0
fi

cargo test -p yuyin-text --test golden -- --nocapture
