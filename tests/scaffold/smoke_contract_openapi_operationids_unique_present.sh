#!/usr/bin/env bash
# SC-29: every operation in api/openapi.yaml has a unique operationId and at least one tag.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
ops="$(grep -cE '^    (get|post|put|patch|delete):' api/openapi.yaml)"
ids="$(grep -E '^      operationId:' api/openapi.yaml | sort)"
tags="$(grep -cE '^      tags:' api/openapi.yaml)"
n_ids="$(grep -c . <<<"$ids")"
n_uniq="$(sort -u <<<"$ids" | grep -c .)"
[[ "$ops" -gt 0 ]] || { echo "FAIL: no operations found"; exit 1; }
[[ "$n_ids" -eq "$ops" ]] || { echo "FAIL: $ops operations but $n_ids operationIds"; exit 1; }
[[ "$n_uniq" -eq "$n_ids" ]] || { echo "FAIL: duplicate operationId"; exit 1; }
[[ "$tags" -eq "$ops" ]] || { echo "FAIL: $ops operations but $tags tagged"; exit 1; }
echo "ok: smoke_contract_openapi_operationids_unique_present"
