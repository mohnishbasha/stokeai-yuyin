#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

# Runs the normalisation golden corpus and prints per-class pass counts.
# Golden test names follow golden_{lang}_{class}_{id}, so the class is the third field.
corpus=crates/yuyin-text/golden
files=$(find "$corpus" -name '*.tsv' -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$files" -eq 0 ]; then
  echo "golden corpus empty: 0 rows (corpus arrives in Sprint 1, S1-T01)"
  exit 0
fi

out=$(mktemp)
trap 'rm -f "$out"' EXIT
status=0
cargo test -p yuyin-text golden 2>&1 | tee "$out" || status=$?

echo
echo "per-class pass counts (class: passed / total)"
awk '
  /^test golden_/ {
    split($2, p, "_"); cls = p[3]; total[cls]++
    if ($NF == "ok") passed[cls]++
  }
  END { for (c in total) printf "  %s: %d / %d\n", c, passed[c], total[c] }
' "$out" | sort
exit "$status"
