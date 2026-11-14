#!/usr/bin/env bash
# Licence check for code dependencies (S0-T07). Exits non-zero on any licence outside the allowlist.
#   Rust:   cargo deny check licenses (allowlist in deny.toml)
#   JS:     license fields of installed packages under node_modules
#   Python: the SDK has no runtime dependencies yet, so nothing to check.
# Environment overrides, used by tests:
#   DENY_CONFIG     path to a deny.toml (default: <repo>/deny.toml)
#   NODE_MODULES    directory to scan (default: <repo>/node_modules)
#   SKIP_RUST=1     skip the Rust check
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DENY_CONFIG="${DENY_CONFIG:-$ROOT/deny.toml}"
NODE_MODULES="${NODE_MODULES:-$ROOT/node_modules}"

# SPDX identifiers allowed for JS packages. Keep in sync with deny.toml.
ALLOWED='["MIT","Apache-2.0","BSD-2-Clause","BSD-3-Clause","ISC","Zlib","Unicode-3.0","Unicode-DFS-2016","MPL-2.0"]'
# Explicit per-package exceptions (package names). Each needs a reason here.
#   BlueOak-1.0.0 is a permissive licence (similar to MIT/ISC) used by the minimatch family,
#   pulled in by eslint tooling. Not widened into the allowlist; owner to confirm.
EXCEPTIONS='["minimatch","@isaacs/nonrecursive-glob-match"]'

fail=0

if [[ "${SKIP_RUST:-0}" != "1" ]]; then
  echo "licence-check: Rust (cargo deny)"
  (cd "$ROOT" && cargo deny --manifest-path Cargo.toml --config "$DENY_CONFIG" check licenses) || fail=1
fi

echo "licence-check: JS ($NODE_MODULES)"
if [[ ! -d "$NODE_MODULES" ]]; then
  echo "licence-check: $NODE_MODULES not found; run bun install first" >&2
  exit 2
fi
# An SPDX expression passes when every identifier in it is allowed, with OR meaning any one
# allowed alternative suffices. Handled by splitting on OR then requiring all AND parts allowed.
bad="$(find "$NODE_MODULES" -name package.json -not -path '*/node_modules/*/node_modules/.bin/*' -print0 \
  | xargs -0 jq -r --argjson allowed "$ALLOWED" --argjson exc "$EXCEPTIONS" '
      select(.name != null and .version != null and (.private != true))
      | . as $p
      | (if (.license|type)=="string" then .license
         elif (.license|type)=="object" then .license.type
         elif (.licenses|type)=="array" then ([.licenses[].type]|join(" OR "))
         else "UNKNOWN" end) as $l
      | ($l | gsub("[()]";"") | split(" OR ")
         | map(split(" AND ") | all(.[]; . as $i | $allowed | index($i) != null))
         | any) as $ok
      | select($ok|not)
      | select(($exc | index($p.name)) == null)
      | "\($p.name)@\($p.version): \($l)"' 2>/dev/null | sort -u)"
if [[ -n "$bad" ]]; then
  echo "licence-check: JS packages with a licence outside the allowlist:" >&2
  echo "$bad" >&2
  fail=1
fi

echo "licence-check: Python SDK has no runtime dependencies; nothing to check"

if [[ $fail -ne 0 ]]; then
  echo "licence-check: FAILED" >&2
  exit 1
fi
echo "licence-check: ok"
