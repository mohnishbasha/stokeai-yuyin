#!/usr/bin/env bash
# SC-18: the OpenAPI linter reports no errors for api/openapi.yaml.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
[[ -f api/openapi.yaml ]] || { echo "FAIL: api/openapi.yaml missing"; exit 1; }
out="$(bun run lint:openapi 2>&1)" || { echo "FAIL: lint:openapi exited non-zero"; echo "$out"; exit 1; }
grep -q "valid" <<<"$out" || { echo "FAIL: linter did not report a valid document"; echo "$out"; exit 1; }
echo "ok: smoke_contract_openapi_skeleton_lint_passes"
