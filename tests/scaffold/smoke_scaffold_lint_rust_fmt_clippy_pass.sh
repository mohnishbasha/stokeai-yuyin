#!/usr/bin/env bash
# SC-03: `cargo fmt --check` and `cargo clippy --workspace -- -D warnings` exit 0.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked --quiet -- -D warnings
echo "ok: smoke_scaffold_lint_rust_fmt_clippy_pass"
