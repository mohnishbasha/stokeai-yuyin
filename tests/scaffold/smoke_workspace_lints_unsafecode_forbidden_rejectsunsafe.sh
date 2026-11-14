#!/usr/bin/env bash
# SC-20: an `unsafe` block fails to compile in every crate except yuyin-engine and
# yuyin-audio, where unsafe_code is deny and needs a documented allow.
source "$(dirname "$0")/lib.sh"
repo="$(clean_clone)"
trap 'rm -rf "$(dirname "$repo")"' EXIT
cd "$repo"

probe='
/// Lint probe added by the scaffold test.
pub fn lint_probe() -> u8 {
    let x = 1u8;
    // SAFETY: probe only, reads a local.
    unsafe { *std::ptr::addr_of!(x) }
}'

probe_allowed='
/// Lint probe with a documented allow, accepted only where unsafe_code is deny.
#[allow(unsafe_code)]
pub fn lint_probe() -> u8 {
    let x = 1u8;
    // SAFETY: probe only, reads a local.
    unsafe { *std::ptr::addr_of!(x) }
}'

for dir in crates/*/; do
  crate="$(basename "$dir")"
  src="$dir/src/lib.rs"
  [[ -f "$src" ]] || src="$dir/src/main.rs"
  cp "$src" "$src.orig"
  printf '%s\n' "$probe" >> "$src"
  if out="$(cargo check -p "$crate" --quiet 2>&1)"; then
    echo "FAIL: $crate compiled an unsafe block without an allow"
    exit 1
  fi
  case "$crate" in
    yuyin-engine|yuyin-audio) want="deny(unsafe_code)" ;;
    *) want="forbid(unsafe_code)" ;;
  esac
  grep -q "$want" <<<"$out" || { echo "FAIL: $crate rejected unsafe, but not via $want"; echo "$out"; exit 1; }
  if [[ "$crate" == yuyin-engine || "$crate" == yuyin-audio ]]; then
    cp "$src.orig" "$src"
    printf '%s\n' "$probe_allowed" >> "$src"
    cargo check -p "$crate" --quiet || { echo "FAIL: $crate rejected a documented allow"; exit 1; }
  fi
  mv "$src.orig" "$src"
done
echo "ok: smoke_workspace_lints_unsafecode_forbidden_rejectsunsafe"
