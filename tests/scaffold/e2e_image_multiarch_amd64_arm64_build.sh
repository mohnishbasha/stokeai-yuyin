#!/usr/bin/env bash
# SC-16: the gateway image builds for linux/amd64 and linux/arm64 without pushing, and each
# result has the architecture it was built for. CI runs this on native runners with PLATFORMS
# set to the runner's own platform (ADR-018); locally both build and one may be emulated.
# Needs Docker with buildx.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
platforms="${PLATFORMS:-linux/amd64,linux/arm64}"
IFS=',' read -ra list <<<"$platforms"
for p in "${list[@]}"; do
  tag="yuyin-gateway:sc16-${p#linux/}"
  docker buildx build --quiet --platform "$p" --load -f deploy/docker/Dockerfile.gateway --target slim \
    --build-arg VERSION="$(tr -d '[:space:]' <VERSION)" --build-arg GIT_SHA="$(git rev-parse HEAD)" \
    -t "$tag" . >/dev/null || { echo "FAIL: build for $p failed"; exit 1; }
  arch="$(docker inspect -f '{{.Architecture}}' "$tag")"
  [[ "$arch" == "${p#linux/}" ]] || { echo "FAIL: $p build has architecture $arch"; exit 1; }
done
echo "ok: e2e_image_multiarch_amd64_arm64_build"
