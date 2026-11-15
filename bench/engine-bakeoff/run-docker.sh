#!/usr/bin/env bash
# Runs the bake-off inside a Linux container limited to 4 CPUs, the shape of the 4 vCPU node in
# NFR-001. Usage:
#   bench/engine-bakeoff/run-docker.sh arm64 [bakeoff.py bench args...]
#   bench/engine-bakeoff/run-docker.sh amd64 [args...]   # emulated on an arm64 host, NOT representative
#   bench/engine-bakeoff/run-docker.sh arm64-listen      # renders the listening sample instead
# Results go to out/ (gitignored) unless --out points elsewhere inside the bench directory.
set -euo pipefail
cd "$(dirname "$0")"
# uv image pinned by digest (python 3.12, Debian bookworm slim, multi-arch).
IMAGE="ghcr.io/astral-sh/uv:python3.12-bookworm-slim@sha256:e5b65587bce7de595f299855d7385fe7fca39b8a74baa261ba1b7147afa78e58"
target="${1:-arm64}"
shift || true
case "$target" in
  arm64 | arm64-listen) platform=linux/arm64 ;;
  amd64 | amd64-listen) platform=linux/amd64 ;;
  *) echo "usage: $0 arm64|amd64|arm64-listen|amd64-listen [args...]" >&2; exit 2 ;;
esac
cmd=(bakeoff.py bench --label "docker-${target}-4cpu" --out "out/bench-${target}")
[[ "$target" == *-listen ]] && cmd=(listen.py --out "out/listening")
docker run --rm --platform "$platform" --cpus 4 --memory 6g \
  -v "$PWD":/bench -w /bench \
  -e UV_PROJECT_ENVIRONMENT=/tmp/venv -e UV_CACHE_DIR=/bench/out/uv-cache-"${platform#linux/}" \
  "$IMAGE" sh -c 'uv sync --frozen --quiet && /tmp/venv/bin/python "$@"' _ "${cmd[@]}" "$@"
