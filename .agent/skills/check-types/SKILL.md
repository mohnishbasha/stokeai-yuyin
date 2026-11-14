---
name: check-types
description: Run clippy with warnings as errors, the TypeScript type-check, and mypy in strict mode.
---

# check-types

## When to use

After changing signatures, types, or public APIs in any language.

## What it runs

1. `cargo clippy --workspace --all-targets -- -D warnings`
2. `bun run type-check`
3. `uv run --with mypy mypy --strict yuyin` inside `packages/sdk-python`

All three always run, even if an earlier one fails.

## Output

A summary block with one `pass` or `FAIL` line per check.

## Exit codes

0 if all three pass, 1 if any fails.

## Usage

```
bash .agent/skills/check-types/run.sh
```
