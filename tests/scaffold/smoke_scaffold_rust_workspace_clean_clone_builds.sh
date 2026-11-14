#!/usr/bin/env bash
# SC-01: given a clean clone, `cargo build --workspace` exits 0.
source "$(dirname "$0")/lib.sh"
repo="$(clean_clone)"
trap 'rm -rf "$(dirname "$repo")"' EXIT
cd "$repo"
cargo build --workspace --locked --quiet
echo "ok: smoke_scaffold_rust_workspace_clean_clone_builds"
