#!/usr/bin/env bash
# SC-30: the legal files exist and the EULA carries the required terms and the draft marker.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
for f in LICENSE EULA.md THIRD_PARTY_LICENSES.md MODELS.md; do
  [[ -s "$f" ]] || { echo "FAIL: $f missing or empty"; exit 1; }
done
grep -q "Serverless Ventures LLC" LICENSE && grep -q "2026" LICENSE && grep -qi "all rights reserved" LICENSE \
  || { echo "FAIL: LICENSE lacks owner, year, or all rights reserved"; exit 1; }
head -n 6 EULA.md | grep -qi "attorney review" || { echo "FAIL: EULA top lacks attorney review marker"; exit 1; }
for term in "Texas" "Williamson County" "legal@serverlessvc.com" "12 months" "reserves the right to change its pricing"; do
  grep -qi "$term" EULA.md || { echo "FAIL: EULA lacks: $term"; exit 1; }
done
echo "ok: smoke_legal_files_present_eula_terms_present"
