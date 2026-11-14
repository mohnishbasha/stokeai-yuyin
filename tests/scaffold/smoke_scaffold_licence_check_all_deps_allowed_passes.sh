#!/usr/bin/env bash
# SC-10: the licence check passes on the real tree, and a disallowed licence makes it fail.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
[[ -d node_modules ]] || bun install --frozen-lockfile >/dev/null 2>&1

scripts/licence-check.sh >/dev/null 2>&1 || { echo "FAIL: licence check does not pass on the current tree"; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# JS: a fake package declaring GPL-3.0 must fail the check.
mkdir -p "$tmp/nm/evil-gpl"
echo '{"name":"evil-gpl","version":"1.0.0","license":"GPL-3.0"}' > "$tmp/nm/evil-gpl/package.json"
if SKIP_RUST=1 NODE_MODULES="$tmp/nm" scripts/licence-check.sh >"$tmp/js.out" 2>&1; then
  echo "FAIL: GPL-3.0 JS package was accepted"; exit 1
fi
grep -q "evil-gpl" "$tmp/js.out" || { echo "FAIL: output does not name evil-gpl"; exit 1; }

# JS: an expression with an allowed alternative passes.
echo '{"name":"ok-dual","version":"1.0.0","license":"(MIT OR GPL-3.0)"}' > "$tmp/nm/evil-gpl/package.json"
SKIP_RUST=1 NODE_MODULES="$tmp/nm" scripts/licence-check.sh >/dev/null 2>&1 || { echo "FAIL: MIT OR GPL-3.0 rejected"; exit 1; }

# Rust: with an empty allowlist and private crates no longer ignored, the check must fail.
sed -e '/^ignore = true/s/true/false/' -e '/^allow = \[/,/^\]/c\
allow = []' deny.toml > "$tmp/deny.toml"
if DENY_CONFIG="$tmp/deny.toml" NODE_MODULES="$tmp/nm" scripts/licence-check.sh >/dev/null 2>&1; then
  echo "FAIL: empty Rust allowlist was accepted"; exit 1
fi
echo "ok: smoke_scaffold_licence_check_all_deps_allowed_passes"
