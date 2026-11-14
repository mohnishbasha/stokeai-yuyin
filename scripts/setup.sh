#!/usr/bin/env bash
# Checks build prerequisites (ARCHITECTURE 16.2) and installs project dependencies.
# Reports what is missing. Never installs system packages.
# Exits 1 only when a tool needed for `make build` and `make check` is missing.
set -euo pipefail
cd "$(dirname "$0")/.."

missing_required=0
have() { command -v "$1" >/dev/null 2>&1; }
check() { # check <required|optional> <tool> <purpose>
  if have "$2"; then
    printf '  ok       %-16s %s\n' "$2" "$3"
  elif [[ "$1" == required ]]; then
    printf '  MISSING  %-16s %s (required)\n' "$2" "$3"
    missing_required=1
  else
    printf '  missing  %-16s %s (optional)\n' "$2" "$3"
  fi
}

echo "Required for build and check:"
check required cargo   "Rust, version from rust-toolchain.toml"
check required rustup  "installs the pinned Rust toolchain"
check required bun     "TypeScript workspace"
check required git     "version metadata"
check required jq      "scripts/check-versions.sh"
echo "Optional:"
check optional uv               "Python SDK (packages/sdk-python)"
check optional cc               "C toolchain for libopus and ONNX Runtime bindings (Sprint 2)"
check optional cmake            "C toolchain (Sprint 2)"
check optional pkg-config       "C toolchain (Sprint 2)"
check optional cargo-deny       "licence and advisory checks"
check optional cargo-chef       "container builds"
check optional cargo-tarpaulin  "coverage"
check optional gitleaks         "secret scanning"
check optional docker           "make dev, containers"
check optional kubectl          "Helm path (Sprint 3)"
check optional helm             "Helm path (Sprint 3)"
check optional kind             "Helm path (Sprint 3)"
check optional cosign           "image-push (Sprint 6)"
check optional syft             "image-push (Sprint 6)"
check optional oras             "models-artifact (Sprint 6)"
if have docker && ! docker buildx version >/dev/null 2>&1; then
  echo "  missing  docker buildx     multi-arch images (optional)"
fi

if [[ "$missing_required" == 1 ]]; then
  echo "setup: install the required tools above and run make setup again" >&2
  exit 1
fi

echo "Installing dependencies:"
rustup show active-toolchain >/dev/null 2>&1 || rustup toolchain install
cargo fetch --locked
bun install --frozen-lockfile
if have uv; then
  uv sync --project packages/sdk-python --frozen
fi
scripts/fetch-models.sh
echo "setup: done"
