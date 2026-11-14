#!/usr/bin/env bash
# Smoke: GET /healthz on the running stack returns 200. URL from YUYIN_SMOKE_URL.
set -euo pipefail
url="${YUYIN_SMOKE_URL:-http://127.0.0.1:8080}"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/healthz" || true)"
[[ "$code" == "200" ]] || { echo "FAIL: $url/healthz returned ${code:-no response}"; exit 1; }
echo "ok: smoke_healthz_returns_200"
