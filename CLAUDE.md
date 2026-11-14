@import AGENTS.md

# CLAUDE.md

Claude-specific guidance. Shared rules, commands, and the repository tree are in AGENTS.md, imported above. The character and hard constraints of the project are in SOUL.md.

## Memory model: which file to read for what

| Question | Read |
|---|---|
| What should the product do? | `docs/PRD.md` (behaviour) |
| What is the contract, the design, or the decision? | `docs/ARCHITECTURE.md` (contracts and decisions) |
| What should the UI look like? | `docs/DESIGN.md` (UI) |
| Which scenario covers this? | `docs/TEST_PLAN.md` (scenarios) |
| What is next? | `docs/SPRINT_PLAN.md` (what is next) |
| What did we learn? | `docs/RETROSPECTIVES.md` (what was learned) |

## Key entry points

| Directory | Purpose |
|---|---|
| `crates/yuyin-text/` | Text normalisation, language tagging, golden corpus |
| `crates/yuyin-engine/` | Engine trait, `FakeEngine`, ONNX engine, worker pool |
| `crates/yuyin-audio/` | Opus, Ogg, WAV, PCM encoding |
| `crates/yuyin-meter/` | Character counting, pricing, reservations, billing |
| `crates/yuyin-licence/` | Self-host licence verification and usage report |
| `crates/yuyin-gateway/` | REST and WebSocket gateway, auth, admission, drain |
| `apps/console/` | Customer console (Next.js) |
| `apps/docs/` | Public documentation site |
| `packages/` | TypeScript SDK, Python SDK, CLI, MCP server |
| `config/` | Pricing, voices, capacity, limits, policy patterns |
| `migrations/` | Database migrations |
| `deploy/` | Dockerfiles, Compose, Helm, systemd, Terraform |
| `scripts/` | Build, version, fixture, and golden-row helpers |
| `tests/` | Scaffold, smoke, contract, regression tests |
| `.agent/skills/` | Runnable agent skills, indexed in SKILLS.md |

## Before writing any code

- [ ] The GitHub issue is read, including its acceptance criteria.
- [ ] The spec sections it references are read (PRD, ARCHITECTURE, DESIGN as relevant).
- [ ] Test scenarios are added to `docs/TEST_PLAN.md`.
- [ ] A failing test is written first.

## PR checklist

Verbatim from `.github/pull_request_template.md`:

```
## What
## Why (issue link)
Closes #

## Spec impact (pick one)
- [ ] A: internal only, no spec change
- [ ] B: spec updated in this PR (list sections)
- [ ] C: spec issue filed (link), scheduled this sprint

## Tests
- [ ] Scenarios added to docs/TEST_PLAN.md
- [ ] Failing test written first
- [ ] Coverage not below thresholds

## Checks run locally
- [ ] cargo fmt --check && cargo clippy --workspace -- -D warnings
- [ ] cargo test --workspace
- [ ] bun run lint && bun run type-check && bun run test
```

## Claude-specific rules

- Prefer small PRs. One task, one PR.
- Never mark a gate green without running it. Paste or summarise the real output.
- Ask before any action in the owner-only list (see `docs/OWNER_CHECKLIST.md`).
- Conventional Commits, no em dashes in prose, comments, or commit messages.
