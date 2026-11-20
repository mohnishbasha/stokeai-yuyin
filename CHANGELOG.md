# Changelog

All notable changes to Yuyin are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). `VERSION` is the single source of truth for the version number.

Sections: Added, Changed, Changed readings, Deprecated, Removed, Fixed, Security. "Changed readings" lists normalisation changes that alter how an existing input is spoken.

## [Unreleased]

### Added
- Sprint 2 close: Playwright harness with 24 visual snapshots, axe checks on every route in both themes, and a Devanagari fixture page (S2-T08, S2-T09); console screens C1 to C10 on a typed mock data layer with `?state=` flags (S2-T05); component library with preview routes (S2-T02). Operator screens O1 to O7 on mock data with reason and confirmation on mock mutations (S2-T05 follow-up); a pulse line frame rate check under 4x CPU throttle (S2-T03).
- Built-in console auth (S2-T04, ADR-031): auth schema migration (`organizations`, `users`, `memberships`, `login_tokens`, `sessions`), the `yuyin-admin` operator command (`org create`, `user create`, `login-token issue`), single-use hashed login tokens with 15 minute expiry, server-side sessions in an HttpOnly Secure SameSite cookie, CSRF protection on mutations, owner/admin/developer/billing roles, an organization switcher, a proxy that redirects unauthenticated requests, and an `OPERATOR_USER_IDS` allowlist for `/operator`.
- Docs site shell (S2-T07): `apps/docs` is a static Next.js site with MDX pages for the six documentation screens, a sidebar, client-side search over an index built at build time, an API reference generated from `api/openapi.yaml`, and a changelog page built from `CHANGELOG.md`. CI fails if the reference cannot be generated.
- Pulse line (S2-T03): `PulseLine` canvas component driven by a mock audio stream, with a static level meter under `prefers-reduced-motion`, an `aria-hidden` line with a `role="status"` text alternative, forced-colours support, and a preview at `/preview/components/pulse-line`.
- Console shell (S2-T01): Next.js App Router app with route groups `(marketing)`, `(console)` and `(operator)`, Tailwind v4 CSS-variable design tokens, dark default and light theme with a toggle, self-hosted IBM Plex fonts including Devanagari, a `/healthz` route, a standalone console image, and a Lighthouse CI check.
- `yuyin-text` front end: Hindi and English number, currency, date and time, digit string, unit, percent, range, email, and URL verbalisation; acronym lexicon with tenant overrides; script and language tagging with a Roman Hindi lexicon; a segmenter with a short first segment; a 1,244-row golden corpus with `make golden` and `scripts/golden-add.sh`; property tests and a weekly fuzz job; and a purity check that keeps the crate free of I/O.
- Engine bake-off (`bench/engine-bakeoff/`), licence evidence (`docs/licences/`), and ADR-015 (Proposed, waiting on owner decision #184).
- `SynthesisEngine` trait with supporting types and a deterministic `FakeEngine` (sine sweep, configurable delay and chunk size, cancellation within 20 ms) in `yuyin-engine`.
- Local dev stack: `deploy/compose/docker-compose.dev.yml` (Postgres 16, Valkey, stripe-mock), `scripts/dev.sh`, `.env.development.example`, and a placeholder gateway serving `/healthz`.
- Monorepo scaffold: Rust workspace, Bun workspace, Python SDK placeholder.
- Version source of truth (`VERSION`) with `scripts/check-versions.sh` and `scripts/extract-changelog.sh`.
- Agent repository files: AGENTS.md, CLAUDE.md, SKILLS.md, SOUL.md, and four agent skills.
- Root `Makefile` with every target from ARCHITECTURE 16.1, `make help`, `scripts/setup.sh`, and a `tests/smoke` suite for `make smoke`.
- OpenAPI 3.1 skeleton at `api/openapi.yaml` covering every contract path, with Redocly lint (`bun run lint:openapi`) and a version check against `VERSION`.
- Legal files: proprietary `LICENSE`, draft `EULA.md`, `THIRD_PARTY_LICENSES.md`, `MODELS.md`, and the `licence-check` job (`scripts/licence-check.sh`, `deny.toml`).
- README with links to the spec docs and the owner checklist.
- Supply chain checks: Dependabot for five ecosystems, `scripts/audit.sh` (cargo audit, cargo deny, bun audit), a gitleaks config with a `yy_live_`/`yy_test_` rule, a pre-commit hook (`scripts/install-hooks.sh`), and the `security` workflow.
- CI workflow (`.github/workflows/ci.yml`) with lint and type-check on amd64 and arm64, unit, coverage gate (`scripts/coverage.sh`, `.coverage-thresholds.toml`), integration, contract, and e2e jobs.
- Container images: `deploy/docker/Dockerfile.gateway` (cargo-chef, `slim` and `full` targets, distroless, non-root, OCI labels), `Dockerfile.console`, `.dockerignore`, `yuyin-gateway healthcheck`, `make image` and `make image-multiarch`, and a native amd64 and arm64 `image-build` CI job.

### Changed
- The golden corpus floor (`MIN_ROWS`) is raised to 1,244 rows, and the `run-golden` skill prints the runner's own per-class table.
