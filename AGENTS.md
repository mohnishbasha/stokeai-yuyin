# AGENTS.md

**Yuyin** is a proprietary streaming text-to-speech service for Hindi, Hinglish, and English, owned by Serverless Ventures LLC. Read SOUL.md for the project's values and hard constraints.

## Commands

The root Makefile is the documented entry point; `make help` lists every target. Targets for later sprints print "available from Sprint N" and exit 0.

| Task | Makefile | Direct equivalent |
|---|---|---|
| Install | `make setup` | `scripts/setup.sh` (checks prerequisites, then `bun install`, `uv sync`) |
| Build | `make build` | `cargo build --workspace` and `bun run build` |
| Dev stack | `make dev` | `scripts/dev.sh` (`make down` stops it) |
| Test, all | `make test` | `cargo test --workspace && bun run test && uv run --project packages/sdk-python pytest -q packages/sdk-python/tests` |
| Test, Rust | `make test` | `cargo test --workspace` |
| Test, TypeScript | `make test` | `bun run test` |
| Test, Python | `make test` | `uv run --project packages/sdk-python pytest -q packages/sdk-python/tests` |
| Test, golden | `make golden` | `cargo test -p yuyin-text golden` (corpus from Sprint 1) |
| Test, e2e | `make e2e` | `bash tests/scaffold/e2e_*.sh` (needs Docker) |
| Scaffold smoke tests | none | `bash tests/scaffold/run.sh` |
| Smoke, running stack | `make smoke` | `bash tests/smoke/run.sh` (URL from `YUYIN_SMOKE_URL`) |
| Lint | `make lint` | `cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings && bun run lint && bun run lint:openapi` |
| Type-check | `make type-check` | `bun run type-check` |
| Benchmarks | `make bench` | harness arrives in Sprint 3 (S3-T13) |
| Version check | `make check-versions` | `scripts/check-versions.sh` |
| Dependency audit | none | `scripts/audit.sh` |
| Install git hooks (gitleaks pre-commit) | none | `scripts/install-hooks.sh` |

`make check` is what CI runs: lint, type-check, test, and the version check. Skills that wrap these commands are listed in SKILLS.md and live in `.agent/skills/`.

## Repository structure

Kept in sync with docs/ARCHITECTURE.md section 16.8.

```
yuyin-tts/                           (repository root: stokeai-yuyin, see ADR-016)
├── VERSION  CHANGELOG.md  LICENSE  EULA.md  THIRD_PARTY_LICENSES.md  README.md
├── AGENTS.md  CLAUDE.md  SKILLS.md  SOUL.md
├── Cargo.toml  Cargo.lock  rust-toolchain.toml  Makefile  .dockerignore
├── package.json  bun.lock  tsconfig.base.json  .coverage-thresholds.toml  .gitignore
├── .github/
│   ├── workflows/{ci.yml,release.yml,deploy-staging.yml,weekly-fuzz.yml,licence-check.yml,security.yml}
│   ├── ISSUE_TEMPLATE/{task.md,bug_report.md}
│   ├── pull_request_template.md
│   └── dependabot.yml
├── .agent/skills/{run-tests,check-types,run-golden,run-bench}/{SKILL.md,run.sh}
├── api/openapi.yaml
├── config/{pricing.toml,voices.toml,capacity.toml,limits.toml,policy-patterns.toml}
├── crates/
│   ├── yuyin-text/    src/{lib.rs,tag.rs,classify.rs,verbalise/,translit.rs,segment.rs,lexicon.rs}
│   │                  data/{acronyms.tsv,roman_hindi_lexicon.tsv,hindi_numbers.tsv}  golden/*.tsv  tests/
│   ├── yuyin-engine/  src/{lib.rs,traits.rs,fake.rs,onnx.rs,registry.rs,pool.rs}
│   ├── yuyin-audio/   src/{lib.rs,opus.rs,ogg.rs,wav.rs,pcm.rs,stretch.rs}
│   ├── yuyin-meter/   src/{lib.rs,count.rs,price.rs,reserve.rs,batcher.rs,lua/}
│   ├── yuyin-licence/ src/{lib.rs,verify.rs,report.rs}
│   ├── yuyin-gateway/ src/{main.rs,config.rs,auth.rs,admission.rs,drain.rs,rest.rs,ws.rs,voices.rs,usage.rs,metrics.rs,errors.rs}
│   │                  tests/{integration/,regression/,smoke/}
│   └── yuyin-count-wasm/
├── migrations/
├── apps/{console/,docs/}
├── packages/{sdk-ts/,sdk-python/,cli/,mcp/}
├── integrations/{pi/,goose/toolkit.yaml,opencode/README.md}
├── bench/{METHOD.md,corpus/,engine-bakeoff/,loadgen/,results/}
├── deploy/
│   ├── docker/{Dockerfile.gateway,Dockerfile.console,Dockerfile.mcp}
│   ├── compose/{docker-compose.dev.yml,docker-compose.local.yml,docker-compose.selfhost.yml,docker-compose.prod.yml}
│   ├── helm/yuyin/
│   ├── systemd/yuyin-gateway.service
│   └── terraform/{modules/,envs/stage/,envs/prod/}
├── scripts/{dev.sh,check-versions.sh,bump-version.sh,extract-changelog.sh,validate-fixtures.sh,golden-add.sh,listening-sheet.sh,fetch-models.sh}
└── docs/
    ├── PRD.md  ARCHITECTURE.md  DESIGN.md  SPRINT_PLAN.md  TEST_PLAN.md
    ├── RETROSPECTIVES.md  OWNER_CHECKLIST.md  THREAT_MODEL.md  DATA_INVENTORY.md
    └── adr/  licences/  runbooks/
```

Not every path exists yet. Files arrive with the sprint task that owns them (docs/SPRINT_PLAN.md).

## Code style

### Rust

- `#![forbid(unsafe_code)]` in every crate except where FFI requires it. There, every `unsafe` block has a `// SAFETY:` comment.
- No `unwrap()`, `expect()`, or `panic!` outside tests and `main` startup. Libraries return `Result<T, E>` with `thiserror` enums. Binaries use `anyhow` only at the top level.
- No blocking calls on the async runtime. CPU work goes to the worker pool.
- `cargo clippy --workspace --all-targets -- -D warnings` is clean. `clippy::pedantic` is on, with a documented allowlist.
- Public items have doc comments. Every public function in `yuyin-text` has a doctest with a Hindi and an English example.
- Money is `MicroUsd` (`i64`). Character counts are `Chars` (`u64`). No floats in billing code.
- Timeouts on every network call. No unbounded channels or queues.
- Log through `tracing`. Request text is a `SensitiveText` whose `Debug` and `Display` print only the length.

### TypeScript and React

- `strict` on. No `any`, no `// @ts-ignore`, no non-null assertion without a comment.
- No `console.log` in committed code. Use the logger.
- Server Components by default. Client Components only where interaction requires it.
- Typed repository layer for data access, always setting the Nile tenant context. No raw SQL in route handlers or components.
- Zod validation on every route handler input and webhook payload.
- Money is formatted from integer micro-USD through one helper. Dates are UTC in storage, the user's locale in display.
- Every user-visible console string goes through a messages file so Hindi localisation can be added later.

### Python (SDK only)

- `ruff` and `mypy --strict` clean. Public API fully typed. Runtime dependencies limited to `httpx`, `websockets`, and `pydantic` if needed.

### General

- No magic numbers. Limits live in `config/` or in named constants with a comment pointing at the PRD requirement id.
- TODO format: `// TODO(#issue-number): text`.
- Conventional Commits: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`.
- No em dashes in prose, comments, or commit messages. Use a colon, comma, or full stop.
- No hype words in copy. State what the product does and show the measurement.
- Hindi and English are equals: examples, tests, and docs carry both.

## Rules

- ALWAYS add golden rows before changing the normaliser.
- ALWAYS update the spec doc in the same PR as a behaviour change.
- ALWAYS use `MicroUsd` and `Chars` newtypes in billing code.
- ALWAYS run synthesis on the worker pool.
- NEVER log or store request text or audio.
- NEVER hand-edit `config/capacity.toml` or any published benchmark number.
- NEVER add a model, voice, or dataset without a recorded licence.
- NEVER commit model weights, secrets, or licence files.
- NEVER weaken the capacity, drain, or isolation tests.
- NEVER perform owner-only actions (see docs/OWNER_CHECKLIST.md).

## Versioning

`VERSION` is the single source of truth. After any version change, run `scripts/check-versions.sh`. It exits 1 and names the first file that differs. CHANGELOG.md follows Keep a Changelog.

## Boundaries

Do not modify these without an explicit task that names them:

- `migrations/` once a migration has been applied
- `docs/licences/`
- `deploy/terraform/envs/prod/`
