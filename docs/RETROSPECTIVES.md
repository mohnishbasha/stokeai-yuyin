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
