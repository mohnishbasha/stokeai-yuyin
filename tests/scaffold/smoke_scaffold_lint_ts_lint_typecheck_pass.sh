#!/usr/bin/env bash
# SC-04: `bun run lint` and `bun run type-check` exit 0 with 0 warnings, and a
# deliberate lint error (an explicit `any`) makes lint fail.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
bun run lint >/dev/null
bun run type-check >/dev/null
probe="packages/sdk-ts/src/lint-probe.ts"
trap 'rm -f "$probe"' EXIT
printf 'export const probe: any = 1;\n' > "$probe"
if bunx eslint --max-warnings 0 "$probe" >/dev/null 2>&1; then
  echo "FAIL: eslint accepted an explicit any"
  exit 1
fi
echo "ok: smoke_scaffold_lint_ts_lint_typecheck_pass"
