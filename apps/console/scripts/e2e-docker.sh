#!/usr/bin/env bash
# Runs the Playwright suite in the same Linux image family CI uses (S2-T09), so the committed
# visual baselines are reproducible from any host. Any arguments go to `playwright test`:
#   bun run e2e:docker                       compare against the committed snapshots
#   bun run e2e:update                       regenerate the snapshots (writes tests/e2e/__snapshots__)
#   bash scripts/e2e-docker.sh --grep a11y   run a subset
# Needs Docker. Starts a throwaway Postgres on a private network and removes it afterwards.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
VERSION="$(jq -r '.devDependencies["@playwright/test"]' "$HERE/package.json")"
BUN_VERSION="1.4.4"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"
SUFFIX="$$"
NETWORK="yuyin-e2e-${SUFFIX}"
PG="yuyin-e2e-pg-${SUFFIX}"
PG_IMAGE="postgres:16.16-alpine"
DB_URL="postgres://yuyin:yuyin-ci-only@${PG}:5432/yuyin"

cleanup() {
  docker rm -f "$PG" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NETWORK" >/dev/null
docker run -d --name "$PG" --network "$NETWORK" \
  -e POSTGRES_USER=yuyin -e POSTGRES_PASSWORD=yuyin-ci-only -e POSTGRES_DB=yuyin \
  --health-cmd "pg_isready -U yuyin -d yuyin" --health-interval 2s --health-retries 30 \
  "$PG_IMAGE" >/dev/null
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$PG")" = "healthy" ]; do sleep 1; done

# The repository is copied in (without node_modules, so native packages are built for Linux).
# Only the snapshot directory is copied back out, owned by the calling user.
docker run --rm --network "$NETWORK" --ipc=host \
  -e CI=1 -e DATABASE_URL="$DB_URL" -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -v "$ROOT":/src \
  -w /work "$IMAGE" bash -euo pipefail -c '
    tar -C /src --exclude=node_modules --exclude=.next --exclude=.git --exclude=target \
      --exclude=.auth --exclude=test-results --exclude=playwright-report -cf - . | tar -C /work -xf -
    npm install -g bun@'"$BUN_VERSION"' >/dev/null
    bun install --frozen-lockfile
    cd apps/console
    bun run build
    status=0
    bun run e2e "$@" || status=$?
    rm -rf /src/apps/console/tests/e2e/__snapshots__
    if [ -d tests/e2e/__snapshots__ ]; then
      cp -r tests/e2e/__snapshots__ /src/apps/console/tests/e2e/__snapshots__
      chown -R "$HOST_UID:$HOST_GID" /src/apps/console/tests/e2e/__snapshots__
    fi
    for dir in playwright-report test-results; do
      if [ -d "$dir" ]; then
        rm -rf "/src/apps/console/$dir"
        cp -r "$dir" "/src/apps/console/$dir"
        chown -R "$HOST_UID:$HOST_GID" "/src/apps/console/$dir"
      fi
    done
    exit $status
  ' bash "$@"
