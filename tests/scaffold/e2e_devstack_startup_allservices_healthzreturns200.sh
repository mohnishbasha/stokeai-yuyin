#!/usr/bin/env bash
# SC-25: scripts/dev.sh --detach brings up Postgres, Valkey, stripe-mock, and the gateway,
# and the gateway's /healthz returns 200. Needs Docker. Uses non-default ports so it does
# not clash with services already running on the host.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
export YUYIN_DEV_POSTGRES_PORT=25432 YUYIN_DEV_VALKEY_PORT=26379 YUYIN_DEV_STRIPE_PORT=22111
export YUYIN_BIND=127.0.0.1:28080
trap 'scripts/dev.sh --stop >/dev/null 2>&1 || true' EXIT
scripts/dev.sh --detach >/dev/null
for svc in postgres valkey stripe-mock; do
  state="$(docker compose -f deploy/compose/docker-compose.dev.yml ps --format '{{.State}}' "$svc")"
  [[ "$state" == "running" ]] || { echo "FAIL: $svc is $state"; exit 1; }
done
code="$(curl -s -o /tmp/yy_healthz_body -w '%{http_code}' "http://$YUYIN_BIND/healthz")"
[[ "$code" == "200" && "$(cat /tmp/yy_healthz_body)" == "ok" ]] || { echo "FAIL: /healthz returned $code"; exit 1; }
echo "ok: e2e_devstack_startup_allservices_healthzreturns200"
