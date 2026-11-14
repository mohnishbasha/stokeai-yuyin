#!/usr/bin/env bash
# SC-27: every path and method in ARCHITECTURE section 11 is present in api/openapi.yaml.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
expected=(
  "/v1/speech post"
  "/v1/speech/stream get"
  "/v1/voices get"
  "/v1/voices/{id} get"
  "/v1/normalize post"
  "/v1/balance get"
  "/v1/usage get"
  "/healthz get"
  "/readyz get"
  "/metrics get"
)
for entry in "${expected[@]}"; do
  p="${entry% *}"; m="${entry#* }"
  found="$(awk -v p="  $p:" -v m="    $m:" '
    $0 == p {inp=1; next}
    inp && /^  [^ ]/ {inp=0}
    inp && $0 == m {print "yes"; exit}' api/openapi.yaml)"
  [[ "$found" == "yes" ]] || { echo "FAIL: $m $p missing from api/openapi.yaml"; exit 1; }
done
echo "ok: smoke_contract_openapi_paths_allcontractpaths_present"
