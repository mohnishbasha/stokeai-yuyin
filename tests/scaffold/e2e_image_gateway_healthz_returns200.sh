#!/usr/bin/env bash
# SC-12: the placeholder gateway image answers GET /healthz with 200, and Docker's own
# health check (the `healthcheck` subcommand, since the image has no shell or curl) passes.
# Needs Docker. Uses a non-default host port.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
tag="yuyin-gateway:sc12-test"
name="yuyin-sc12-$$"
port=28081
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
build_gateway_image full "$tag"
docker run -d --name "$name" -p "127.0.0.1:$port:8080" "$tag" >/dev/null
code=000
for _ in $(seq 30); do
  code="$(curl -s -o /tmp/yy_sc12_body -w '%{http_code}' "http://127.0.0.1:$port/healthz" || true)"
  [[ "$code" == "200" ]] && break
  sleep 1
done
[[ "$code" == "200" && "$(cat /tmp/yy_sc12_body)" == "ok" ]] || { echo "FAIL: /healthz returned $code"; exit 1; }
health=starting
for _ in $(seq 40); do
  health="$(docker inspect -f '{{.State.Health.Status}}' "$name")"
  [[ "$health" == "healthy" ]] && break
  sleep 1
done
[[ "$health" == "healthy" ]] || { echo "FAIL: container health is $health"; exit 1; }
echo "ok: e2e_image_gateway_healthz_returns200"
