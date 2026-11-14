#!/usr/bin/env bash
# SC-22: tsconfig.base.json enables strict, noUncheckedIndexedAccess, and
# exactOptionalPropertyTypes. Each flag is proven by a probe that only it rejects.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
dir="$(mktemp -d "$ROOT/.tsprobe.XXXXXX")"
trap 'rm -rf "$dir"' EXIT
printf '{ "extends": "../tsconfig.base.json", "compilerOptions": { "noEmit": true }, "include": ["probe.ts"] }\n' > "$dir/tsconfig.json"

expect_reject() {
  local flag=$1 code=$2
  printf '%s\n' "$code" > "$dir/probe.ts"
  if bunx tsc -p "$dir/tsconfig.json" >/dev/null 2>&1; then
    echo "FAIL: $flag is not enforced"
    exit 1
  fi
}
expect_reject strict 'export function f(x) { return x; }'
expect_reject noUncheckedIndexedAccess 'const a: number[] = []; export const n: number = a[0];'
expect_reject exactOptionalPropertyTypes 'type T = { x?: number }; export const t: T = { x: undefined };'
echo "ok: smoke_tsconfig_base_strictflags_enabled"
