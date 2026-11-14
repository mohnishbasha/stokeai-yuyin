#!/usr/bin/env bash
# SC-21: rust-toolchain.toml pins an exact version and the active rustc matches it.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
pinned="$(grep -m1 '^channel' rust-toolchain.toml | cut -d'"' -f2)"
[[ "$pinned" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "FAIL: channel '$pinned' is not an exact version"; exit 1; }
active="$(rustc --version | awk '{print $2}')"
[[ "$active" == "$pinned" ]] || { echo "FAIL: rustc $active does not match pinned $pinned"; exit 1; }
echo "ok: smoke_workspace_toolchain_pinned_matchesfile"
