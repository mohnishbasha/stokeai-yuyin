# Retrospectives

One entry per sprint, written at the Sprint End Protocol. Owner waivers for gate items are recorded here.

## Sprint 0: Scaffold

**Dates:** 2026-11-10 to 2026-11-14
**Gate:** all items pass (see docs/SPRINT_PLAN.md, Sprint 0 gate). No owner waivers.
**Staging:** promotion PR #168 (`develop` into `staging`) is open and waits for one approving review (owner checklist B3). The `sprint-0-complete` tag is created on the `staging` merge commit after #168 merges.

### What was built

| Issue | Task | PR |
|---|---|---|
| #1 | S0-T01 Monorepo layout | #145 |
| #2 | S0-T02 Rust workspace and toolchain | #146 |
| #3 | S0-T03 Bun workspace, TypeScript base config, ESLint, Prettier | #147 |
| #4 | S0-T04 CI pipeline and coverage gate | #157 |
| #5 | S0-T05 Version source of truth and scripts | #148 |
| #6 | S0-T06 Agent repository files | #150 |
| #7 | S0-T07 Licence and legal files | #152 |
| #8 | S0-T08 Local dev stack | #151 |
| #9 | S0-T09 OpenAPI skeleton and contract lint | #154 |
| #10 | S0-T10 Dependabot, audit jobs, secret scanning | #156 |
| #11 | S0-T11 README and owner checklist | #153 |
| #12 | S0-T12 Root Makefile and setup script | #155 |
| #13 | S0-T13 Container images | #162 |

Follow-ups merged in the sprint:
- #166 pins TypeScript to 6.0.3, because the Dependabot bump to 7.0.2 broke `make lint` on `develop`.
- #167 is the spec doc audit.

### Spec sections updated

- ARCHITECTURE:
  - ADR-017: `develop` is the default branch, and `staging` and `main` are promotion branches.
  - 16.1: Makefile targets.
  - 16.6: workflows and CI jobs.
  - 16.8: repository tree, kept in sync with AGENTS.md.
- SPRINT_PLAN: the Sprint 0 "Test scenarios to add" lines use the implemented test names.
- TEST_PLAN 6.1: SC-01 to SC-42 and AK-23. Every Sprint 0 row is ✅ Automated.

### Tests added

There are 42 Sprint 0 scenarios, all automated.

| Type | Count |
|---|---|
| Smoke | 22 |
| E2E | 9 |
| Integration | 4 |
| Contract | 4 |
| Unit | 3 |

The gateway has 17 Rust unit tests. Each TypeScript package and the Python SDK has one placeholder test.

Gate evidence:
- `make setup && make build && make check` runs in a fresh `rust:1.100.0-bookworm` container (SC-34).
- `make dev` followed by `make smoke` passes against the local stack.
- `make image` builds natively on amd64 and arm64 runners in the `image-build` job.
- Lint and coverage failures fail CI. Probe PRs #159 and #161 show this (SC-41, SC-42).

### Coverage delta

Sprint 0 started with no coverage measurement. At sprint end, `scripts/coverage.sh` gives:
- yuyin-gateway: 86.21% (threshold 80%).
- `packages/sdk-ts`, `packages/cli`, `packages/mcp`, `integrations/pi`, and `packages/sdk-python`: 100% each (one placeholder line).

Crates and paths with no instrumented lines yet are skipped by the gate until code lands.

### What worked

- One branch, issue, and PR per task.
  - Each PR carried its TEST_PLAN rows and a CHANGELOG line.
  - Each issue got an implementation comment before closing.
- Independent tasks (T07, T09, T10, T13, and the doc audit) ran in parallel on isolated git worktrees.
- Scaffold tests run against a clean clone of HEAD, so they see what CI sees.
- The fresh-container test runs setup, build, and check from nothing, so a missing prerequisite would show up there and not first on a contributor's machine.
- Probe PRs prove the CI gates on GitHub itself instead of only asserting the workflow text.

### What did not work

- Parallel branches all appended to CHANGELOG.md and TEST_PLAN 6.1, so most merges conflicted.
  - Force-pushing a rebased branch is not allowed in this setup.
  - Each conflict was resolved by merging `develop` into the feature branch.
- Dependabot opened major-version PRs on its first run, and they were merged without waiting for CI.
  - TypeScript 7.0.2 broke `make lint` on `develop`, because typescript-eslint supports TypeScript below 6.1 only.
  - `develop` has no required status checks, so nothing stopped the merge.
- The first CI probe PRs branched from `develop` before `ci.yml` existed there. The first coverage probe failed lint (dead code) instead of coverage.
- Ports 5432 and 8080 are taken on the build machine. The dev stack and tests needed port overrides (`YUYIN_DEV_*_PORT`, `YUYIN_BIND`).
- Owner blockers B1 to B5 took many recheck runs before they cleared.

### What to change

- Make the CI jobs required status checks on `develop`, so a red PR (including Dependabot's) cannot merge. This is owner checklist O17.
- Reserve TEST_PLAN ID blocks per task when work is split, and merge `develop` into each branch before opening its PR.
- Review Dependabot major-version PRs by hand. The TypeScript major is ignored until typescript-eslint supports it.
- Decide the staging approval path (B3) before the Sprint 1 end, so promotion does not stall each sprint.

## Sprint 1: Backend Foundations

**Dates:** 2026-11-14 to 2026-11-15
**Gate:** all five items pass (see docs/SPRINT_PLAN.md, Sprint 1 gate). There are no owner waivers. The ADR-015 item is met by owner issue #184 rather than an engine choice.
**Staging:** the promotion PR (`develop` into `staging`) is opened after this entry merges and waits for the owner (see docs/OWNER_CHECKLIST.md). The `sprint-1-complete` tag goes on the `staging` merge commit after it merges.

### What was built

| Issue | Task | PR |
|---|---|---|
| #14 | S1-T01 Golden corpus format and runner | #181, #188 |
| #15 | S1-T02 Script and language tagging | #192 |
| #16 | S1-T03 Number verbalisation, Hindi and English, Indian numbering | #189 |
| #17 | S1-T04 Currency | #191 |
| #18 | S1-T05 Dates and times | #195 |
| #19 | S1-T06 Phone numbers, OTPs, digit strings | #193 |
| #20 | S1-T07 Acronym lexicon and overrides | #182 |
| #21 | S1-T08 Units, percent, ranges, email, URL | #194 |
| #22 | S1-T09 Segmenter with short first segment | #183 |
| #23 | S1-T10 Engine bake-off spike and ADR | #190 |
| #24 | S1-T11 `SynthesisEngine` trait and fake engine | #180 |
| #25 | S1-T12 Property tests and fuzzing for the normaliser | #196 |

Also merged in the sprint:
- #185 adds ADR-029 (database).
- #197 is the spec doc audit.
- The sprint close PR ratchets the golden floor and fixes the `run-golden` skill summary.

Carried to Sprint 3, each with an explanation on its issue:
- #198 (S3-T18) carries three S1-T10 criteria:
  - x86 measurements, because the bake-off ran on arm64 only.
  - The human listening pass.
  - The ADR-015 engine choice, which waits on owner decision #184.
- #199 (S3-T19) carries six Sprint 1 scenarios that stayed Deferred: NM-RNG-03, NM-LNG-01 to 03, LT-12, and LT-13.

### Spec sections updated

- ARCHITECTURE:
  - 5.1: the text pipeline module split and types.
  - 6 and ADR-009: no engine chosen yet.
  - 7: segment budgets.
  - ADR-015: Proposed, blocked on #184, with the full record in `docs/adr/ADR-015-engine-selection.md` and evidence in `docs/licences/`.
  - ADR-029.
  - 16.8: the `yuyin-text` tree, kept in sync with AGENTS.md.
- PRD: OQ-13 and OQ-14 record the bake-off outcome.
- TEST_PLAN:
  - Section 5: the golden corpus format and the growth plan to 1,500 rows.
  - 6.2 to 6.5: the Sprint 1 rows use the real test and golden ids.
- SPRINT_PLAN:
  - The Sprint 1 criteria and gate are ticked.
  - S3-T18 and S3-T19 are added.
  - The critical path runs through #184.

### Tests added

TEST_PLAN has 185 Sprint 1 scenarios. 178 are automated and 7 are Deferred: six are carried to #199, and EN-30 is blocked on #184.

| Type | Automated | Deferred |
|---|---|---|
| Unit | 97 | 1 |
| Golden | 73 | 4 |
| Property | 8 | 1 |
| Integration | 0 | 1 |

Gate evidence:
- Golden corpus:
  - 1,244 rows across 20 classes, 1,244 pass: hi 409, hinglish 242, en-IN 295, en-US 298.
  - The `MIN_ROWS` floor is now 1,244.
- Tagging accuracy on the 2,158-token held-out set is 98.24% (2,120 correct), against a target of 95%.
- The Roman Hindi lexicon has 27,506 rows, with its licence in `docs/licences/roman-hindi-lexicon.md`.
- The `tests/purity.rs` dependency allowlist and source scan pass, so `yuyin-text` does no network or file I/O.
- Five property tests run 10,000 cases each. The `normalise` fuzz target runs weekly with a 600 second budget.

### Coverage delta

From `scripts/coverage.sh` at the sprint end:

| Crate or path | Sprint 0 | Sprint 1 | Threshold |
|---|---|---|---|
| yuyin-text | not instrumented | 99.23% (2,070 of 2,086 lines) | 92% |
| yuyin-engine | not instrumented | 98.96% (95 of 96 lines) | 75% |
| yuyin-gateway | 86.21% | 86.21% | 80% |

The TypeScript and Python placeholders are unchanged at 100%.

### What worked

- Golden rows came before code. Each class task added its rows first, so a regression shows up as a named row diff.
- The purity check is a test, not a review rule. Any I/O dependency or `std::fs` or `std::net` use in `yuyin-text` fails `cargo test`.
- The bake-off followed the stop rule. With no licence-clean Hindi voice, it recorded the evidence, raised #184, and did not ship a voice with unclear rights.
- Running the property tests at 10,000 cases under tarpaulin needed a longer timeout, and that was found and fixed inside the task (S1-T12).

### What did not work

- All twelve issues closed with their acceptance criteria unticked, so the closing protocol was not fully followed. The sprint end audit checked each criterion against the code and ticked 49 of 52. The three open ones moved to #198.
- The bake-off could not measure x86, because O4 (AWS) is deferred and the build machine is arm64.
- The golden floor (`MIN_ROWS`) lagged the corpus: 570 against 1,244 rows. The `run-golden` skill still parsed per-row test names after the runner became one test with its own per-class table.
- `develop` still has no required status checks (O17), so a red PR can still merge.

### What to change

- Tick each acceptance criterion on the issue in the PR that closes it, with evidence in the implementation comment.
- Raise `MIN_ROWS` in every PR that adds golden rows, as TEST_PLAN section 5 already says.
- Get owner decision #184 before Sprint 3 starts. S3-T18 and S3-T01 (ONNX engine) wait on it.
- Run the x86 bake-off on a GitHub-hosted `ubuntu-latest` runner, so it does not wait on O4.
