# Shared helpers for scaffold smoke tests. Sourced, not executed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Clones the committed tree (HEAD) into a temporary directory and prints its path.
# Uncommitted changes are not included, so the test sees what a fresh clone sees.
clean_clone() {
  local dir
  dir="$(mktemp -d)"
  git clone --quiet --no-hardlinks "$ROOT" "$dir/repo"
  echo "$dir/repo"
}

# Builds a gateway image target (slim or full) tagged $2 from the working tree, with the
# same build arguments `make image` passes. Needs Docker.
build_gateway_image() {
  local target="$1" tag="$2"
  docker build --quiet -f "$ROOT/deploy/docker/Dockerfile.gateway" --target "$target" \
    --build-arg VERSION="$(tr -d '[:space:]' <"$ROOT/VERSION")" \
    --build-arg GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)" \
    --build-arg SOURCE="${SOURCE:-https://github.com/mohnishbasha/stokeai-yuyin}" \
    --build-arg CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t "$tag" "$ROOT" >/dev/null
}
