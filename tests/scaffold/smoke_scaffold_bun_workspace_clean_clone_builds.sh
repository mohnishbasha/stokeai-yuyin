#!/usr/bin/env bash
# SC-02: given a clean clone, `bun install && bun run build` exits 0.
source "$(dirname "$0")/lib.sh"
repo="$(clean_clone)"
trap 'rm -rf "$(dirname "$repo")"' EXIT
cd "$repo"
bun install --frozen-lockfile >/dev/null
bun run build >/dev/null
echo "ok: smoke_scaffold_bun_workspace_clean_clone_builds"
