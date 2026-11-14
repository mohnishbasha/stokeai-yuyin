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
