---
name: run-golden
description: Run the normalisation golden corpus and print per-class pass counts and any diffs.
---

# run-golden

## When to use

Before and after any change to the normaliser. Golden rows are added first, then the normaliser changes.

## What it runs

`cargo test -p yuyin-text golden`. Tests are named `golden_{lang}_{class}_{id}`, for example `golden_hi_currency_0001` and `golden_en_currency_0002`. The script groups results by class.

## Output

The full test output (failing rows show their diff), then a per-class table of `passed / total`.

While `crates/yuyin-text/golden/` holds no corpus, it prints `golden corpus empty: 0 rows (corpus arrives in Sprint 1, S1-T01)` and exits 0.

## Exit codes

0 if every golden row passes or the corpus is empty, otherwise the exit code of `cargo test`.

## Usage

```
bash .agent/skills/run-golden/run.sh
```
