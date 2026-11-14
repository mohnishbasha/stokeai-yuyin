#!/usr/bin/env bash
# Starts the local development stack (ARCHITECTURE 16.3, path 2a):
# Postgres, Valkey, and stripe-mock in Compose, then the gateway on the host.
#
#   scripts/dev.sh            start everything; the gateway runs in the foreground
#   scripts/dev.sh --detach   start everything, wait for /healthz, return (gateway PID in .dev/gateway.pid)
#   scripts/dev.sh --stop     stop the gateway and the Compose services
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f deploy/compose/docker-compose.dev.yml)
STATE_DIR="$ROOT/.dev"
PID_FILE="$STATE_DIR/gateway.pid"
LOG_FILE="$STATE_DIR/gateway.log"

if [[ -f .env.development ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.development
  set +a
else
  echo "dev.sh: .env.development not found, using defaults (cp .env.development.example .env.development)"
fi
BIND="${YUYIN_BIND:-127.0.0.1:8080}"
STRIPE_PORT="${YUYIN_DEV_STRIPE_PORT:-12111}"

stop() {
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  "${COMPOSE[@]}" down
}

case "${1:-}" in
  --stop) stop; exit 0 ;;
  ""|--detach) ;;
  *) echo "usage: $0 [--detach|--stop]" >&2; exit 2 ;;
esac

command -v docker >/dev/null || { echo "dev.sh: docker is required" >&2; exit 1; }
"${COMPOSE[@]}" up -d --wait postgres valkey
"${COMPOSE[@]}" up -d stripe-mock
# stripe-mock answers 401 without a key, which still proves it is serving.
for _ in $(seq 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:$STRIPE_PORT/v1/charges" || true)"
  [[ "$code" =~ ^[24] ]] && { echo "dev.sh: stripe-mock ready"; break; }
  sleep 1
done

cargo build -p yuyin-gateway --quiet
mkdir -p "$STATE_DIR"
if [[ "${1:-}" == "--detach" ]]; then
  YUYIN_BIND="$BIND" nohup target/debug/yuyin-gateway serve >"$LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$PID_FILE"
  # Wait for our own process to answer, so a different service on the port is not mistaken for it.
  for _ in $(seq 60); do
    kill -0 "$pid" 2>/dev/null || { echo "dev.sh: gateway exited, see $LOG_FILE" >&2; tail -5 "$LOG_FILE" >&2; exit 1; }
    [[ "$(curl -fsS --max-time 2 "http://$BIND/healthz" 2>/dev/null || true)" == "ok" ]] && break
    sleep 1
  done
  [[ "$(curl -fsS --max-time 2 "http://$BIND/healthz" 2>/dev/null || true)" == "ok" ]] || { echo "dev.sh: gateway not ready at $BIND" >&2; exit 1; }
  echo "dev.sh: gateway http://$BIND (log $LOG_FILE). Stop with: scripts/dev.sh --stop"
else
  echo "dev.sh: gateway http://$BIND. Ctrl-C stops the gateway; scripts/dev.sh --stop stops the services."
  exec env YUYIN_BIND="$BIND" target/debug/yuyin-gateway serve
fi
