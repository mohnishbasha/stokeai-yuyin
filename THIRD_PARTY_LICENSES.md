# Third-Party Licenses

Yuyin's own code is proprietary (see LICENSE). This file records the licences of the third-party code it depends on. Model weights and voices are covered separately in MODELS.md.

## Policy

Allowed for code dependencies: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib, Unicode (Unicode-3.0, Unicode-DFS-2016), and MPL-2.0 for unmodified use. Anything else fails CI. The allowlist is in `deny.toml` (Rust) and `scripts/licence-check.sh` (JavaScript).

## How the check runs

`scripts/licence-check.sh` runs in the CI job `licence-check` (`.github/workflows/licence-check.yml`) and locally.

- Rust: `cargo deny check licenses`, configured by `deny.toml`. The workspace crates use `LicenseRef-Proprietary` and are `publish = false`, so they are ignored.
- JavaScript: reads the `license` field of every installed package in `node_modules` (run `bun install` first) and compares it with the allowlist.
- Python: the SDK (`packages/sdk-python`) has no runtime dependencies yet. Add it to the script when it does.

## Exceptions

| Package | Licence | Reason |
|---|---|---|
| `minimatch`, `@isaacs/nonrecursive-glob-match` | BlueOak-1.0.0 | Permissive licence, transitive dev dependency of eslint tooling. Listed by name in `scripts/licence-check.sh`. Owner to confirm. |

## Fonts

IBM Plex Sans, IBM Plex Sans Devanagari and IBM Plex Mono are licensed under the SIL Open Font License 1.1. The WOFF2 files and licence texts are in `apps/console/src/fonts/`, and the texts are copied into the console image at `/licenses/fonts/`.

## Current dependency summary

| Ecosystem | Third-party runtime dependencies | Notes |
|---|---|---|
| Rust | none | Workspace crates are placeholders |
| JavaScript | dev tooling only (eslint, prettier, typescript, vitest) | Mostly MIT, Apache-2.0, ISC, BSD |
| Python | none | |

## Generating the full notice file

Release builds attach the full licence texts. For Rust, generate them with `cargo about generate` once the first third-party crate is added and a `about.toml` is created; for JavaScript, use the output of the licence check as the inventory. Regenerate this file for each release. Release images copy it to `/licenses/`.

## Embedded data

| Data | Source | Licence | Record |
|---|---|---|---|
| Roman Hindi word forms in `crates/yuyin-text/data/roman_hindi_lexicon.tsv` (part) | Aksharantar, AI4Bharat, Hindi rows with source `AK-Freq` | CC BY 4.0 (attribution: "Aksharantar, AI4Bharat, <https://huggingface.co/datasets/ai4bharat/Aksharantar>") | `docs/licences/roman-hindi-lexicon.md` |
