# Yuyin

*Speech that starts before the sentence ends.*

Yuyin turns text into natural speech and streams the audio back while it is still being
generated, over REST or WebSocket. It reads rupee amounts, dates, phone numbers, OTPs, and
acronyms the way a person would, switches between Hindi and English inside one sentence,
and runs on standard CPU servers in the cloud or on your own hardware.

## What it does

- Streaming text-to-speech over REST and WebSocket
- Hindi, Hinglish, English (India), English (US), with mid-sentence switching
- Built-in normalisation for currency, dates, phone numbers, OTPs, and acronyms
- Pace from 0.5x to 2x, 24 kHz Opus, PCM, or WAV
- Prepaid, per-character pricing with no seats or setup fees
- Hosted, or self-hosted inside your network

## Quickstart

    curl -N https://api.yuyin.openstoke.com/v1/speech \
      -H "Authorization: Bearer $YUYIN_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"text":"आपकी EMI ₹12,450 है, due date 05/12/2026.","voice":"<voice-id>"}' \
      --output out.ogg

## Repository layout

Kept in sync with [AGENTS.md](AGENTS.md) and docs/ARCHITECTURE.md section 16.8.

```
yuyin-tts/                           (repository root: stokeai-yuyin, see ADR-016)
├── VERSION  CHANGELOG.md  LICENSE  EULA.md  THIRD_PARTY_LICENSES.md  README.md
├── AGENTS.md  CLAUDE.md  SKILLS.md  SOUL.md
├── Cargo.toml  Cargo.lock  rust-toolchain.toml  Makefile  .dockerignore
├── package.json  bun.lock  tsconfig.base.json  .coverage-thresholds.toml  .gitignore
├── .github/
│   ├── workflows/{ci.yml,release.yml,deploy-staging.yml,weekly-fuzz.yml,licence-check.yml}
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

## Development

    make setup && make build       # local build
    make dev                       # local deploy: Postgres, Valkey, stripe-mock, gateway, console
    make image && make up          # run from OCI images with Compose
    make kind-up && make kind-load && make helm-install   # deploy the Helm chart to a local cluster
    cargo test --workspace         # Rust tests
    bun run test                   # TypeScript tests
    .agent/skills/run-golden/run.sh   # normalisation golden corpus

`make help` lists every target. Targets for work planned in a later sprint print
"available from Sprint N" and exit 0. Copy `.env.development.example` to
`.env.development` before `make dev`.

## Requirements

Rust (see rust-toolchain.toml), Bun, Docker, Python 3.10+ for the Python SDK.
`make setup` reports anything missing.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design](docs/DESIGN.md)
- [Sprint plan](docs/SPRINT_PLAN.md)
- [Test plan](docs/TEST_PLAN.md)
- [Owner checklist](docs/OWNER_CHECKLIST.md): actions only the owner can take
- [Changelog](CHANGELOG.md)

## License

Proprietary. Copyright 2026 Serverless Ventures LLC. All rights reserved.
See LICENSE, EULA.md, and THIRD_PARTY_LICENSES.md. Contact: legal@serverlessvc.com
