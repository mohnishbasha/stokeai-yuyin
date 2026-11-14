#!/usr/bin/env bash
# SC-36: the tracked pre-commit hook rejects a staged fake yy_test_/yy_live_ key and allows a clean
# commit; install-hooks.sh sets core.hooksPath. Fake keys are generated at runtime.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
[[ -x .githooks/pre-commit && -x scripts/install-hooks.sh ]] || { echo "FAIL: hook or installer not executable"; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git -C "$tmp" init --quiet
git -C "$tmp" config user.email t@example.com
git -C "$tmp" config user.name t
mkdir -p "$tmp/.githooks" "$tmp/scripts"
cp .githooks/pre-commit "$tmp/.githooks/"
cp .gitleaks.toml "$tmp/"
cp scripts/install-hooks.sh "$tmp/scripts/"
(cd "$tmp" && scripts/install-hooks.sh >/dev/null)
[[ "$(git -C "$tmp" config core.hooksPath)" == ".githooks" ]] || { echo "FAIL: hooksPath not set"; exit 1; }
echo "hello" > "$tmp/clean.txt"
git -C "$tmp" add clean.txt
git -C "$tmp" commit --quiet -m clean >/dev/null 2>&1 || { echo "FAIL: clean commit was blocked"; exit 1; }
for mode in live test; do
  secret="$(openssl rand -hex 20)"
  echo "KEY=yy_${mode}_${secret}" > "$tmp/leak_$mode.env"
  git -C "$tmp" add "leak_$mode.env"
  if git -C "$tmp" commit --quiet -m leak >/dev/null 2>&1; then
    echo "FAIL: pre-commit allowed a staged yy_${mode}_ key"; exit 1
  fi
  git -C "$tmp" reset --quiet
done
echo "ok: smoke_secretscan_precommit_fake_key_blocks_commit"
