#!/usr/bin/env bash
# S1-T01: golden-add.sh appends a validated row and rejects bad or duplicate rows.
source "$(dirname "$0")/lib.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
printf 'id\tlang\tclass\tinput\texpected\tnotes\n' > "$tmp/money.tsv"
add() { GOLDEN_DIR="$tmp" "$ROOT/scripts/golden-add.sh" "$@" >/dev/null 2>&1; }

add money hi money paise "₹250.50" "दो सौ पचास रुपये पचास पैसे" "paise read" || { echo "FAIL: valid row rejected"; exit 1; }
grep -q "^golden_hi_money_paise	hi	money	₹250.50	" "$tmp/money.tsv" || { echo "FAIL: row not appended"; exit 1; }
add money en-IN money lakh "₹1,25,000" "one lakh twenty-five thousand rupees" || { echo "FAIL: en-IN row rejected"; exit 1; }
grep -q "^golden_en_in_money_lakh" "$tmp/money.tsv" || { echo "FAIL: en-IN id not normalised"; exit 1; }

if add money hi money paise "x" "y"; then echo "FAIL: duplicate id accepted"; exit 1; fi
if add money fr money a "x" "y"; then echo "FAIL: bad lang accepted"; exit 1; fi
if add money hi money tab $'a\tb' "y"; then echo "FAIL: tab in field accepted"; exit 1; fi
if add missing hi money a "x" "y"; then echo "FAIL: missing file accepted"; exit 1; fi
[[ "$(wc -l < "$tmp/money.tsv" | tr -d ' ')" == "3" ]] || { echo "FAIL: rejected rows changed the file"; exit 1; }
echo "ok: unit_scripts_goldenadd_validrow_appended"
