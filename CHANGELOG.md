# Changelog

All notable changes to Yuyin are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). `VERSION` is the single source of truth for the version number.

Sections: Added, Changed, Changed readings, Deprecated, Removed, Fixed, Security. "Changed readings" lists normalisation changes that alter how an existing input is spoken.

## [Unreleased]

### Added
- Local dev stack: `deploy/compose/docker-compose.dev.yml` (Postgres 16, Valkey, stripe-mock), `scripts/dev.sh`, `.env.development.example`, and a placeholder gateway serving `/healthz`.
- Monorepo scaffold: Rust workspace, Bun workspace, Python SDK placeholder.
- Version source of truth (`VERSION`) with `scripts/check-versions.sh` and `scripts/extract-changelog.sh`.
- Agent repository files: AGENTS.md, CLAUDE.md, SKILLS.md, SOUL.md, and four agent skills.
- Legal files: proprietary `LICENSE`, draft `EULA.md`, `THIRD_PARTY_LICENSES.md`, `MODELS.md`, and the `licence-check` job (`scripts/licence-check.sh`, `deny.toml`).
- README with links to the spec docs and the owner checklist.
