#!/usr/bin/env bash
# SC-11: a commit containing a fake yy_live_ key is flagged by gitleaks with the repo config and
# the finding names the yuyin-api-key rule. A clean commit passes. The fake key is built at
# runtime so the repository never stores a key-shaped literal.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git -C "$tmp" init --quiet
git -C "$tmp" config user.email t@example.com
git -C "$tmp" config user.name t
echo "hello" > "$tmp/clean.txt"
git -C "$tmp" add clean.txt
git -C "$tmp" commit --quiet -m clean
gitleaks git --no-banner --log-level error --config "$ROOT/.gitleaks.toml" "$tmp" >/dev/null \
  || { echo "FAIL: gitleaks flagged a clean history"; exit 1; }
secret="$(openssl rand -hex 20)"
echo "API_KEY=yy_live_${secret}" > "$tmp/leak.env"
git -C "$tmp" add leak.env
git -C "$tmp" commit --quiet -m leak
out="$(gitleaks git --no-banner --report-format json --report-path - --config "$ROOT/.gitleaks.toml" "$tmp" 2>&1)" \
  && { echo "FAIL: gitleaks passed a history with a yy_live_ key"; exit 1; }
grep -q "yuyin-api-key" <<<"$out" || { echo "FAIL: finding does not name yuyin-api-key"; exit 1; }
echo "ok: it_ci_gitleaks_fake_live_key_rejected"
