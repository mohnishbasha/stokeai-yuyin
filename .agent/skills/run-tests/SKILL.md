---
name: run-tests
description: Run the Rust, TypeScript, and Python test suites and print a one-line result for each.
---

# run-tests

## When to use

Before opening a PR, and after any code change.

## What it runs

1. `cargo test --workspace`
2. `bun run test`
3. `uv run --group dev pytest` inside `packages/sdk-python`

All three always run, even if an earlier one fails.

## Output

A summary block with one `pass` or `FAIL` line per suite.

## Exit codes

0 if all three suites pass, 1 if any fails.

## Usage

```
bash .agent/skills/run-tests/run.sh
```
