#!/usr/bin/env bash
# SC-34: in a fresh container with only the documented prerequisites, a clean clone passes
# `make setup && make build && make check`. Needs Docker; slow (full build from scratch).
source "$(dirname "$0")/lib.sh"
src="$(clean_clone)"
rust="$(sed -nE 's/^channel = "(.*)"/\1/p' "$ROOT/rust-toolchain.toml")"
bun="$(bun --version)"
docker run --rm -v "$src:/src" -w /src "rust:${rust}-bookworm" bash -euc "
  apt-get update -qq && apt-get install -y -qq unzip >/dev/null
  curl -fsSL https://bun.sh/install | bash -s bun-v${bun} >/dev/null
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null
  export PATH=\$HOME/.bun/bin:\$HOME/.local/bin:\$PATH
  git config --global --add safe.directory /src
  make setup && make build && make check
" >/tmp/yy_fresh_container.log 2>&1 || { echo "FAIL: see /tmp/yy_fresh_container.log"; tail -20 /tmp/yy_fresh_container.log; exit 1; }
echo "ok: e2e_make_setupbuildcheck_freshcontainer_exitszero"
