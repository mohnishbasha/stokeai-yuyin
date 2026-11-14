#!/usr/bin/env bash
# SC-28: a different info.version in api/openapi.yaml makes check-versions.sh exit 1 and name the file.
source "$(dirname "$0")/lib.sh"
repo="$(clean_clone)"
trap 'rm -rf "$(dirname "$repo")"' EXIT
cd "$repo"
sed -i.bak 's/^  version: .*/  version: 9.9.9/' api/openapi.yaml
rm -f api/openapi.yaml.bak
set +e
out="$(scripts/check-versions.sh 2>&1)"; code=$?
set -e
[[ $code -eq 1 ]] || { echo "FAIL: exit $code, expected 1"; exit 1; }
grep -q "mismatch in api/openapi.yaml" <<<"$out" || { echo "FAIL: output does not name api/openapi.yaml"; echo "$out"; exit 1; }
echo "ok: smoke_scripts_check_versions_openapi_mismatch_exits_1_names_file"
