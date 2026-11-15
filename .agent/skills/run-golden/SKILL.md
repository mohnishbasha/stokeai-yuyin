---
name: run-golden
description: Run the normalisation golden corpus and print per-class pass counts and any diffs.
---

# run-golden

## When to use

Before and after any change to the normaliser. Golden rows are added first, then the normaliser changes.

## What it runs

`cargo test -p yuyin-text --test golden -- --nocapture`. The corpus is the TSV files in `crates/yuyin-text/golden/`. Row ids follow `golden_{lang}_{class}_{slug}`, for example `golden_hi_acronym_kyc_pending`. The test fails if any row regresses or the corpus falls below the `MIN_ROWS` floor in `crates/yuyin-text/tests/golden.rs`.

## Output

A per-class table of `passed / total` with a total line, printed by the golden test, and the diff of any failing row.

If `crates/yuyin-text/golden/` holds no TSV files, it prints `golden corpus empty: 0 rows` and exits 0.

## Exit codes

0 if every golden row passes or the corpus is empty, otherwise the exit code of `cargo test`.

## Usage

```
bash .agent/skills/run-golden/run.sh
```
