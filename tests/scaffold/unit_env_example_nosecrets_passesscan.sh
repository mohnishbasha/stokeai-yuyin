#!/usr/bin/env bash
# SC-26: .env.development.example is tracked, gitleaks finds nothing in it, and gitleaks
# does flag the same file once a live-looking key is added (so the scan is not a no-op).
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
f=.env.development.example
git ls-files --error-unmatch "$f" >/dev/null 2>&1 || { echo "FAIL: $f is not tracked"; exit 1; }
gitleaks dir --no-banner --log-level error "$f" >/dev/null || { echo "FAIL: gitleaks flagged $f"; exit 1; }
tmp="$(mktemp -d)"
cp "$f" "$tmp/probe.env"
echo "STRIPE_SECRET_KEY=sk_live_$(printf 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6' )" >> "$tmp/probe.env"
if gitleaks dir --no-banner --log-level error "$tmp/probe.env" >/dev/null; then
  echo "FAIL: gitleaks did not flag a live-looking key"; exit 1
fi
echo "ok: unit_env_example_nosecrets_passesscan"
