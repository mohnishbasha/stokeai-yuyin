#!/usr/bin/env bash
# SC-08: changing one package version makes check-versions.sh exit 1 and name the file.
source "$(dirname "$0")/lib.sh"
repo="$(clean_clone)"
trap 'rm -rf "$(dirname "$repo")"' EXIT
cd "$repo"
for file in packages/sdk-ts/package.json packages/sdk-python/pyproject.toml Cargo.toml; do
  git checkout -q -- .
  case "$file" in
    *.json) jq '.version = "9.9.9"' "$file" > "$file.tmp" && mv "$file.tmp" "$file" ;;
    *) perl -0pi -e 's/^version = ".*?"/version = "9.9.9"/m' "$file" ;;
  esac
  set +e
  out="$(scripts/check-versions.sh 2>&1)"; code=$?
  set -e
  [[ $code -eq 1 ]] || { echo "FAIL: exit $code for $file, expected 1"; exit 1; }
  grep -q "mismatch in $file" <<<"$out" || { echo "FAIL: output does not name $file"; echo "$out"; exit 1; }
done
echo "ok: smoke_scripts_check_versions_one_mismatch_exits_1_names_file"
