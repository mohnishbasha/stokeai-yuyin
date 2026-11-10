# YUYIN - Master Build Prompt
## Streaming text-to-speech API for Hindi, Hinglish, and English, served from CPU

---

## Project Identity

**Name:** `Yuyin`
**GitHub repo:** `serverless-ventures/yuyin-tts`
**Primary domain:** `getyuyin.com` (preferred), fallback `yuyintts.com`
**Subdomains:** `api.` (data plane), `console.` (accounts and billing), `docs.` (documentation), `status.` (status page)
**npm scope:** `@yuyin-tts`
**PyPI package:** `yuyin`
**Container registry:** `ghcr.io/serverless-ventures/yuyin-{gateway,console,mcp}`
**Tagline:** *Speech that starts before the sentence ends.*
**Short description (GitHub About field):** Streaming text-to-speech API for Hindi, Hinglish, and English that runs on ordinary CPU servers.
**Repository visibility:** Private. Source not distributed.
**Distribution model:** Hosted pay-as-you-go API (prepaid credits) plus a licensed self-host edition for customers who need audio to stay in their own data centre.
**License:** Proprietary. Copyright 2026 Serverless Ventures LLC. All rights reserved.
**Long description (README opening):** Yuyin turns text into natural speech and streams the audio back while it is still being generated, over REST or WebSocket. It reads rupee amounts, dates, phone numbers, OTPs, and acronyms the way a person would, switches between Hindi and English inside one sentence, and runs on standard CPU servers in the cloud or on the customer's own hardware.

**Why Yuyin:** Yuyin (语音, yǔyīn) is the Mandarin word for speech, the spoken sound of language. It joins 语 (language, words) and 音 (sound), which is exactly what the product does: it turns language into sound. It is also the standard technical term in Chinese for speech technology, as in 语音合成 (speech synthesis). It is five letters, two syllables, and pronounced "yoo-yin".

> **Name status:** Yuyin is the working name for now. Domain, npm scope, PyPI name, and trademark availability have NOT been verified, and because the word is a generic term in Chinese it may be hard to protect or to rank for in Chinese-language search. The executing agent must not register anything. The owner verifies availability before Sprint 0 ends. The name appears in code only through the constants `PRODUCT_NAME`, `PRODUCT_SLUG`, and `KEY_PREFIX` so a rename is a single change set.

---

## Reference Product and What "Similar" Means

This product is in the same category as vartaloop.ai, a streaming TTS API for Hindi, Hinglish, and English. The capability shape we are matching:

| Capability | Reference product behaviour | Yuyin v1 commitment |
|---|---|---|
| Transport | Text in over REST or WebSocket, audio streamed back as generated | Same |
| Languages | Hindi, Hinglish, English (India), English (US), mid-sentence switching | Same four, with switching |
| Normalisation | Currency, dates, phone numbers, OTP digits, acronyms such as EMI and KYC | Same, as a tested library with a golden corpus |
| Pace control | 0.5x to 2x per request | Same |
| Output | 24 kHz in Opus (default), PCM, WAV | Same |
| Compute | Runs on standard CPU servers | Same. No GPU in the serving path |
| Billing | Prepaid, per 1,000 characters, HTTP 402 when credits run out | Same model, prices set by owner |
| Overload | HTTP 503 with retry time before any audio, streams in progress are never cut | Same |
| Deployment | Hosted region or customer data centre | Hosted on AWS, plus self-host edition |
| Custom voice | Trained from about 30 minutes of consented studio audio | Intake and consent workflow in Sprint 12, training is an operator runbook |
| Roadmap | Speech recognition next, then a voice agent | Out of scope for v1, tracked as issues |

**Hard rules about the reference product:**

1. Do not copy any text, design, layout, imagery, voice names, sample scripts, or benchmark figures from vartaloop.ai or its docs. Everything in Yuyin is written and designed from scratch.
2. Do not publish any performance number that our own benchmark harness did not measure. The reference product's latency claims are not our targets and are not to be repeated in our marketing.
3. Do not name the reference product anywhere in the repository, the site, or the docs.

---

## Decisions Already Made (do not reopen without an ADR)

| # | Decision | Choice | Reason |
|---|---|---|---|
| D1 | Product type | Multi-tenant SaaS API plus self-host edition, not a desktop app | The product is an API. The skill's desktop defaults (Tauri, SQLite) do not apply |
| D2 | Data plane language | Rust (Axum, Tokio) | Latency-sensitive streaming, predictable memory, single static binary for self-host |
| D3 | Control plane | Next.js (App Router) console on Vercel, TypeScript | Matches the CaseVase pattern. Accounts and billing are not latency-critical |
| D4 | Auth for humans | Clerk (organizations = tenants) | Existing portfolio integration |
| D5 | Auth for machines | Yuyin API keys, hashed at rest, verified in the gateway | Clerk is never in the synthesis hot path |
| D6 | Database | Nile (multi-tenant Postgres) | Existing portfolio pattern, tenant isolation built in |
| D7 | Hot-path state | Valkey or Redis (ElastiCache) | Key cache, balance reservation, concurrency counters |
| D8 | Payments | Stripe Checkout for prepaid top-ups, behind a `PaymentProvider` interface | Existing integration. Razorpay and UPI are a v1.1 adapter |
| D9 | Speech model | Open-weights neural TTS run through ONNX Runtime on CPU, behind a `SynthesisEngine` trait, chosen by a measured bake-off in Sprint 1 | We are not training a foundation model in v1. The trait keeps the door open for our own model later |
| D10 | Primary region | AWS `ap-south-1` (Mumbai) for the data plane | The target listeners are in India. Region is configuration, not code |
| D11 | Billing unit | Unicode code points of the submitted text, before normalisation | Predictable for customers. Matras and punctuation count |
| D12 | Money representation | Integer micro-USD everywhere. No floats | Ledger correctness |
| D13 | Telemetry | No third-party analytics in the console, site, CLI, or self-host edition. First-party operational metrics only | Portfolio privacy stance |
| D14 | Harnesses | MCP server (Goose, OpenCode, Claude Code), Pi extension | Portfolio default |

**Owner inputs still needed (the agent uses the placeholder until told otherwise):**

| Input | Placeholder | Where it lives |
|---|---|---|
| Price per 1,000 characters, Opus and PCM | 2,000 micro-USD ($0.002) | `pricing` table, seeded from `config/pricing.toml` |
| Price per 1,000 characters, WAV | 2,400 micro-USD ($0.0024) | same |
| Minimum top-up | $5.00 | same |
| Launch grant | 1,000,000 characters for the first 1,000 verified signups | same |
| Voice names | Generated list in `config/voices.toml`, owner approves | Sprint 3 |

---

## EXECUTION ORDER - THIS IS MANDATORY

The first action you take when executing this prompt is to generate the five product specification documents listed in Step 1 below. No GitHub setup, no scaffolding, no code of any kind is written before those documents exist on disk and are committed.

1. **Step 1:** Generate `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/SPRINT_PLAN.md`, `docs/TEST_PLAN.md`. Commit them.
2. **Step 2:** GitHub project setup: repository, branch protection, labels, milestones, project board, templates.
3. **Step 3:** Create every GitHub issue from `docs/SPRINT_PLAN.md`.
4. **Step 4 onward:** Execute sprints in order, Sprint 0 through Sprint 12. Each sprint ends at a gate. A gate that is not green blocks the next sprint.

If you are about to write code and Step 1 is not complete: stop. Complete Step 1 first.

**Source of truth:** Once `docs/PRD.md` and the other four documents exist, they supersede this prompt. This prompt seeds them. Where this prompt and a committed spec document disagree, the spec document wins, and the disagreement must have an entry in the ARCHITECTURE decision log explaining why.

**Things only the owner does (never the agent):** registering domains, creating cloud accounts, entering payment details, creating Stripe live keys, accepting third-party terms, approving voice names, publishing packages to npm or PyPI, promoting to production. The agent prepares each of these and stops.

---

## Step 1 - Product Specification Documents

Generate all five. Each must be complete enough that an engineer who has not read this prompt could build from it.

### 1.1 `docs/PRD.md`

**Required sections:** Problem, Users, Goals and non-goals, User stories, Functional requirements, Non-functional requirements, Acceptance criteria (one block per FR), Pricing and billing rules, Abuse and consent policy summary, Open questions.

**Users (personas):**

- **Integrating developer.** Builds a voice bot, IVR flow, or app feature. Wants a key, a curl command, and audio in under five minutes.
- **Voice platform engineer** at a bank, insurer, lender, or contact-centre vendor. Cares about latency under load, correct reading of amounts and OTPs, data residency, and predictable cost.
- **Operator** (Serverless Ventures). Runs the fleet, watches capacity, handles abuse reports and refunds.
- **Self-host administrator.** Deploys the gateway inside a private network with no outbound internet.

**User stories (minimum set, expand to at least 30):**

```
US-001  As a developer, I sign up, verify my email, and receive free characters so I can try the API without paying.
US-002  As a developer, I create an API key in the console and see the secret exactly once.
US-003  As a developer, I POST text and receive audio that starts playing before synthesis of the whole text is finished.
US-004  As a developer, I open a WebSocket, send text in pieces as my LLM produces it, and hear continuous speech.
US-005  As a developer, I list available voices filtered by language and style.
US-006  As a developer, I write "आपकी EMI ₹12,450 है, due date 05/12/2026" and hear it read correctly.
US-007  As a developer, I send an OTP and hear each digit spoken separately at a slower pace.
US-008  As a developer, I mix Hindi and English in one sentence, in Devanagari or Roman script, and the voice does not break.
US-009  As a developer, I set pace from 0.5 to 2.0 per request.
US-010  As a developer, I choose Opus, PCM, or WAV output.
US-011  As a developer, I preview how my text will be normalised without paying for synthesis.
US-012  As a developer, I see my balance and per-day usage in the console and through the API.
US-013  As a developer, I top up with a card and my balance updates within seconds.
US-014  As a developer, I receive a clear 402 when I am out of credits, and requests work again right after a top-up.
US-015  As a platform engineer, I receive a 503 with Retry-After when the service is full, before any audio byte, so I can fail over cleanly.
US-016  As a platform engineer, my in-progress streams are never cut by overload or by a deploy.
US-017  As a platform engineer, I read a published benchmark method and can reproduce the numbers.
US-018  As a platform engineer, I revoke a leaked key and it stops working within 10 seconds.
US-019  As a platform engineer, I restrict a key to specific voices and a monthly character cap.
US-020  As an admin of an organization, I invite teammates and control who can create keys and who can pay.
US-021  As a self-host administrator, I run one binary or one Helm chart with a licence file and no outbound network.
US-022  As a brand owner, I submit about 30 minutes of studio audio with recorded consent from the speaker to request a custom voice.
US-023  As a speaker, I can withdraw consent and have my custom voice disabled.
US-024  As an operator, I see fleet capacity, active streams, and time to first audio per node.
US-025  As an operator, I suspend an organization that violates the acceptable use policy and every key stops at once.
US-026  As an operator, I issue a refund or a goodwill credit with an audit trail.
US-027  As an agent harness user, I ask my coding agent to speak a line and it calls Yuyin through MCP.
US-028  As a CLI user, I pipe text into `yuyin speak` and audio plays or saves to a file.
US-029  As a developer, I use an official TypeScript or Python SDK with streaming helpers.
US-030  As a developer, I read docs with copy-paste examples for curl, TypeScript, Python, and WebSocket.
```

**Functional requirements (seed list, expand and number every one):**

```
FR-001  REST synthesis endpoint with streamed response body
FR-002  WebSocket synthesis endpoint with incremental text input
FR-003  Voice catalogue endpoint
FR-004  Language handling: hi, hinglish, en-IN, en-US, auto
FR-005  Script handling: Devanagari, Roman Hindi, English, mixed
FR-006  Normalisation: cardinal and ordinal numbers, Indian numbering (lakh, crore)
FR-007  Normalisation: currency (INR, USD), including paise and cents
FR-008  Normalisation: dates and times in common Indian and US formats
FR-009  Normalisation: phone numbers, OTPs, PINs, account and card tails read digit by digit
FR-010  Normalisation: acronym lexicon (EMI, KYC, UPI, PAN, IFSC, NEFT, GST, ATM, OTP, and others) with per-tenant overrides
FR-011  Normalisation: units, percentages, ranges, email addresses, URLs
FR-012  Normalisation preview endpoint (no audio, no charge, rate limited)
FR-013  Pace control 0.5 to 2.0
FR-014  Output formats: Opus in Ogg (default), raw PCM s16le, WAV, all at 24 kHz mono
FR-015  API key lifecycle: create, list, rename, restrict, revoke, last-used
FR-016  Prepaid balance, top-up through Stripe Checkout, ledger, receipts
FR-017  Launch grant on email verification, limited to the first N organizations
FR-018  Character metering by Unicode code point with reservation and settlement
FR-019  402 on insufficient credits, 503 with Retry-After at capacity, 429 on rate limit
FR-020  Usage API and console usage views (by day, key, voice, format)
FR-021  Organization management and roles (owner, admin, developer, billing)
FR-022  Playground in the console with live waveform and time-to-first-audio readout
FR-023  Public marketing site with live demo, pricing, benchmarks page, FAQ, legal pages
FR-024  Documentation site with quickstart, API reference from OpenAPI, guides, changelog
FR-025  TypeScript SDK and Python SDK
FR-026  Operator admin: organizations, suspension, credits, refunds, audit log
FR-027  Self-host edition with offline licence validation and local usage report
FR-028  CLI
FR-029  MCP server
FR-030  Custom voice intake: consent capture, upload, quality checks, status tracking
FR-031  Acceptable use enforcement hooks and abuse report intake
FR-032  Status page feed and incident banner
```

**Non-functional requirements (seed list):**

```
NFR-001  Time to first audio, server side (request fully received to first audio byte written),
         warm node, 60-character sentence, Opus: target p50 <= 60 ms, p95 <= 150 ms on a
         4 vCPU node at 50% capacity. These are targets to measure against, not claims.
NFR-002  Real-time factor per stream <= 0.25 on one core for the default voice.
NFR-003  Node capacity (max concurrent streams) is measured by the benchmark harness and written
         into config. It is never hand-edited above the measured value.
NFR-004  Zero in-progress streams terminated by deploys, scale-in, or overload. Drain timeout 120 s.
NFR-005  Availability target 99.9% monthly for the hosted data plane.
NFR-006  Billing accuracy: ledger and gateway meter reconcile to zero difference daily.
NFR-007  Text and audio are not persisted by default. Request logs hold metadata only.
NFR-008  Tenant isolation enforced at the database layer (Nile tenant context) and tested.
NFR-009  API keys stored only as SHA-256 hashes with a non-secret prefix for lookup.
NFR-010  Key revocation effective fleet-wide within 10 seconds.
NFR-011  Normalisation golden corpus pass rate 100% in CI. Corpus has at least 1,500 cases by v1.0.0.
NFR-012  Gateway cold start to ready (model loaded and warmed) <= 20 s.
NFR-013  Gateway memory per node <= 2 GiB with all v1 voices loaded.
NFR-014  Images built for linux/amd64 and linux/arm64.
NFR-015  Console pages meet WCAG 2.2 AA. Devanagari renders correctly everywhere text is shown.
NFR-016  All secrets in AWS Secrets Manager or Vercel encrypted env. None in the repository.
NFR-017  Every third-party model and voice has a recorded licence that permits commercial hosted use.
```

Every FR gets an acceptance criteria block in Given / When / Then form. Example to follow:

```
FR-019 AC-1  Given an organization with balance 0 and no grant remaining,
             when it calls POST /v1/speech with valid text,
             then the response is HTTP 402 with error.code = "insufficient_credits",
             no audio bytes are sent, and no ledger entry is written.
FR-019 AC-2  Given a node whose active stream count equals its configured capacity,
             when a new synthesis request arrives,
             then the response is HTTP 503 with a Retry-After header in whole seconds
             and error.code = "at_capacity", sent before any audio byte,
             and every stream already in progress completes normally.
```

### 1.2 `docs/ARCHITECTURE.md`

**Required sections:** System overview diagram, Component responsibilities, Decision log (seed with D1 to D14 above as ADR-001 onward), Request lifecycle for REST and WebSocket, Text front-end pipeline, Engine abstraction, Streaming and segmentation strategy, Admission control and draining, Metering and ledger design, Data model, Full API contract, Error model, Security model, Observability, Capacity model, Build and Deployment (local build, local deploy, OCI images, Helm chart, mirroring the Build and Deployment section of this prompt), Failure modes table.

**System overview (seed):**

```
                      +----------------------+        +------------------+
  Browser  ---------> |  console (Next.js)   | -----> |  Clerk           |
                      |  marketing + docs    | -----> |  Stripe          |
                      +----------+-----------+        +------------------+
                                 | SQL (tenant context)
                                 v
                      +----------------------+
                      |  Nile Postgres       |  orgs, keys, ledger, usage, voices, consent
                      +----------+-----------+
                                 ^  batched ledger writes, key sync
                                 |
  API client  --REST/WS-->  +----+-----------------+      +-----------------+
  SDK / CLI / MCP           |  yuyin-gateway      | <--> |  Valkey / Redis |
                            |  (Rust, Axum)        |      |  key cache,     |
                            |  auth, metering,     |      |  reservations,  |
                            |  admission control   |      |  rate limits    |
                            |  +----------------+  |      +-----------------+
                            |  | yuyin-text    |  |
                            |  | yuyin-engine  |  |   models loaded from local disk
                            |  | yuyin-audio   |  |   (baked into image or mounted PVC)
                            |  +----------------+  |
                            +----------------------+
```

**Component responsibilities:**

| Component | Language | Responsibility |
|---|---|---|
| `crates/yuyin-text` | Rust | Script detection, language tagging, normalisation, segmentation. Pure, no I/O |
| `crates/yuyin-engine` | Rust | `SynthesisEngine` trait, ONNX engine implementation, voice registry, warmup |
| `crates/yuyin-audio` | Rust | Resampling, time-stretch for pace, Opus and Ogg muxing, WAV header, PCM framing |
| `crates/yuyin-meter` | Rust | Character counting, price lookup, reservation and settlement, ledger batcher |
| `crates/yuyin-gateway` | Rust | HTTP and WebSocket server, auth, admission control, draining, metrics |
| `crates/yuyin-licence` | Rust | Self-host licence verification (Ed25519), offline usage report |
| `apps/console` | TypeScript | Console, marketing site, playground, operator admin, Stripe webhooks |
| `apps/docs` | MDX | Documentation site built from MDX plus the OpenAPI file |
| `packages/sdk-ts` | TypeScript | Official TypeScript SDK |
| `packages/sdk-python` | Python | Official Python SDK |
| `packages/cli` | TypeScript | `yuyin` CLI, compiled with `bun build --compile` |
| `packages/mcp` | TypeScript | MCP server over stdio and streamable HTTP |
| `integrations/` | mixed | Pi extension, Goose toolkit, OpenCode config |
| `bench/` | Rust + scripts | Benchmark and load harness, published method |

**Text front-end pipeline (specify each stage with input and output types):**

```
raw text
  -> unicode normalise (NFC), strip control characters, validate length
  -> tokenise into spans
  -> tag each span: script (Deva | Latn | Digit | Symbol) and language (hi | en)
       Roman-script Hindi detection uses a lexicon plus character n-gram scorer
  -> classify semiotic spans: MONEY, DATE, TIME, PHONE, OTP, CARDINAL, ORDINAL,
       PERCENT, UNIT, ACRONYM, EMAIL, URL, RANGE
  -> verbalise each semiotic span in the language of its context
       ("₹1,25,000" in a Hindi sentence -> "एक लाख पच्चीस हज़ार रुपये")
  -> transliterate Roman Hindi to Devanagari where the engine needs it
  -> segment into clauses with a short first segment to minimise time to first audio
  -> emit Vec<Segment { text, lang, pace_hint, char_span }>
```

Rules that must be written into the spec:

- OTP detection: 4 to 8 digits near a trigger word (OTP, code, कोड, पिन, PIN, verification) are read digit by digit with a pace hint of 0.85. Without a trigger word, 4-digit numbers are read as cardinals except years.
- Phone numbers: Indian 10-digit mobile and +91 forms are read digit by digit in groups (5 and 5). US forms in groups (3, 3, 4).
- Currency: Indian digit grouping (1,25,000) and Western grouping (125,000) both parse. Amounts verbalise in the sentence's language. Paise and cents handled.
- Dates: `DD/MM/YYYY` is the default for hi, hinglish, and en-IN. `MM/DD/YYYY` is the default for en-US. ISO dates always parse. An ambiguous date never silently swaps day and month across locales.
- Acronyms: lexicon decides letter-by-letter ("KYC", "EMI") versus word ("PAN" as a word in Indian usage). Tenants can override through a per-organization lexicon, capped at 500 entries.
- The normaliser is deterministic. Same input and same options give the same output.

**Engine abstraction (seed):**

```rust
pub trait SynthesisEngine: Send + Sync {
    fn id(&self) -> &'static str;
    fn voices(&self) -> &[VoiceInfo];
    fn sample_rate(&self) -> u32;
    /// Synthesise one segment. Implementations call `sink` with PCM f32 chunks
    /// as soon as they are available. Must be cancellable through `cancel`.
    fn synthesise(
        &self,
        segment: &Segment,
        voice: &VoiceId,
        opts: &SynthOptions,
        cancel: &CancellationToken,
        sink: &mut dyn FnMut(&[f32]) -> Result<(), SinkClosed>,
    ) -> Result<SegmentStats, EngineError>;
    fn warmup(&self) -> Result<Duration, EngineError>;
}
```

Synthesis is CPU-bound and never runs on the Tokio runtime threads. A fixed-size worker pool (one OS thread per allotted core, ONNX intra-op threads = 1) pulls segments from a per-stream queue. Audio flows back to the async side over a bounded channel so a slow client applies backpressure to its own stream only.

**Admission control and draining:**

- Each node has `capacity_streams`, written by the benchmark harness for that instance type.
- A semaphore guards admission. Acquisition is non-blocking. Failure returns 503 with `Retry-After` computed from the median remaining duration of active streams, clamped to 1 to 10 seconds.
- Admission happens after auth and credit reservation checks but before the response status line is sent, so a rejected request never receives audio.
- On SIGTERM the node flips readiness to false, stops admitting, and waits up to 120 s for active streams. Kubernetes `terminationGracePeriodSeconds` is 150.
- Fleet metric `yuyin_active_streams / yuyin_capacity_streams` drives the HPA with a target of 0.6.

**Metering and ledger design:**

- Characters billed = number of Unicode scalar values in the submitted `text` field after NFC, before normalisation. Whitespace and punctuation count.
- Cost in micro-USD = `ceil(chars * price_per_1k_micro_usd / 1000)`.
- Hot path: a Lua script in Redis atomically checks and reserves `cost` against the organization's cached balance. Key: `bal:{org_id}`.
- Settlement: on stream end the gateway computes delivered characters (the sum of `char_span` for segments whose audio was fully written to the socket), releases the difference, and enqueues a ledger event `{request_id, org_id, key_id, chars, cost, format, voice, started_at, ttfa_ms, status}`.
- A batcher writes ledger events to Postgres every 500 ms or 200 events, idempotent on `request_id`.
- A failure before any audio is delivered bills zero. A client disconnect bills only delivered segments.
- A reconciliation job runs daily. It recomputes each balance from the append-only ledger and alerts on any difference. Postgres is the source of truth. Redis is a cache that can be rebuilt.
- Top-ups: the Stripe webhook writes a `credit` ledger row and bumps the Redis balance through the same script. Webhooks are idempotent on the Stripe event id.

**Data model (seed, all tenant tables carry `tenant_id` for Nile):**

```
organizations(id, clerk_org_id, name, status[active|suspended], created_at)
api_keys(id, tenant_id, name, prefix, hash, scopes jsonb, voice_allowlist text[],
         monthly_char_cap bigint null, last_used_at, revoked_at, created_by, created_at)
ledger(id, tenant_id, kind[credit|debit|grant|refund|adjustment], amount_micro_usd bigint,
       chars bigint null, request_id text unique null, stripe_event_id text unique null,
       actor text, note text, created_at)
usage_daily(tenant_id, day, key_id, voice_id, format, requests, chars, cost_micro_usd)
request_log(id, tenant_id, key_id, request_id, voice_id, format, chars, ttfa_ms,
            duration_ms, status, error_code, created_at)   -- metadata only, 30 day retention
voices(id, engine_id, display_name, languages text[], gender, style, sample_url,
       visibility[public|private], owner_tenant_id null, licence_ref, status)
lexicon_entries(id, tenant_id, term, spoken_form, lang, created_at)
pricing(id, format, price_per_1k_micro_usd, effective_from)
grants(id, tenant_id, chars_granted, reason, created_at)
custom_voice_requests(id, tenant_id, status, speaker_name, consent_record_id, created_at)
consent_records(id, tenant_id, speaker_legal_name, statement_text, audio_object_key,
                signed_at, verified_by, withdrawn_at null)
audit_log(id, tenant_id null, actor, action, target, metadata jsonb, created_at)
```

**Full API contract (write the complete OpenAPI 3.1 file at `api/openapi.yaml`, and mirror it in this document):**

```
Base URL: https://api.getyuyin.com
Auth:     Authorization: Bearer yy_live_<prefix>_<secret>     (yy_test_ for test mode)

POST /v1/speech
  Request (application/json):
    text          string, required, 1..5000 code points
    voice         string, required, voice id from /v1/voices
    language      "auto" | "hi" | "hinglish" | "en-IN" | "en-US", default "auto"
    format        "opus" | "pcm" | "wav", default "opus"
    pace          number 0.5..2.0, default 1.0
    normalize     boolean, default true
    request_id    string, optional, idempotency and tracing
  Response 200:
    Content-Type: audio/ogg; codecs=opus | audio/pcm;rate=24000 | audio/wav
    Transfer-Encoding: chunked
    Headers: X-Request-Id, X-Yuyin-Voice, X-Yuyin-Chars
    Trailers: X-Yuyin-Chars-Billed, X-Yuyin-Ttfa-Ms
  Errors: 400, 401, 402, 403, 413, 422, 429, 503

GET  /v1/voices?language=&gender=&style=
GET  /v1/voices/{id}
POST /v1/normalize          { text, language } -> { segments: [{ text, lang }], chars }
GET  /v1/balance            -> { balance_micro_usd, grant_chars_remaining }
GET  /v1/usage?from=&to=&group_by=day|key|voice|format
GET  /healthz               liveness
GET  /readyz                readiness (model warmed, not draining)
GET  /metrics               Prometheus, internal network only

WebSocket: wss://api.getyuyin.com/v1/speech/stream
  Auth: Authorization header, or first message { "type": "auth", "api_key": "..." } for browsers
  Client -> server (JSON text frames):
    { "type": "start", "voice": "...", "language": "auto", "format": "opus", "pace": 1.0 }
    { "type": "text",  "text": "..." }        may be sent many times, partial sentences allowed
    { "type": "flush" }                        synthesise whatever is buffered now
    { "type": "end" }
  Server -> client:
    { "type": "started", "request_id": "...", "sample_rate": 24000 }
    binary frames: audio in the requested format
    { "type": "segment", "chars": 42, "ttfa_ms": 31 }
    { "type": "done", "chars_billed": 137 }
    { "type": "error", "code": "...", "message": "...", "retry_after": 3 }
  Limits: 20,000 code points per connection, 10 minute max duration, 30 s idle timeout

Error body (all endpoints):
  { "error": { "code": "insufficient_credits", "message": "...", "request_id": "..." } }

Error codes:
  invalid_request(400) invalid_api_key(401) insufficient_credits(402) key_restricted(403)
  org_suspended(403) text_too_long(413) unknown_voice(422) unsupported_language(422)
  rate_limited(429) at_capacity(503) engine_unavailable(503)
```

**Failure modes table (fill for every row):** Redis unavailable, Postgres unavailable, Stripe webhook delayed, model file corrupt, worker thread panic, client stalls reading, node OOM, clock skew, licence expired (self-host). For each: detection, behaviour, customer impact, recovery. Policy seed: if Redis is down the gateway fails closed for organizations without a recent cached balance and serves others for up to 60 seconds from the local cache, then fails closed.

### 1.3 `docs/DESIGN.md`

**Required sections:** Design principles, Color tokens (dark and light), Typography, Spacing, Component inventory, Wireframes (ASCII) for every screen, Signature element, Motion, Accessibility, Content voice, Anti-patterns. Seed content is in the Design System section of this prompt. Screens to wireframe:

```
Marketing:  Home (with live demo), Pricing, Benchmarks, Custom voice, FAQ, About, Contact,
            Terms, Privacy, Acceptable use, Refunds
Console:    Onboarding, Playground, API keys, Usage, Billing and top-up, Lexicon,
            Voices, Custom voice request, Team, Settings
Operator:   Organizations, Organization detail, Ledger adjustments, Abuse queue,
            Custom voice queue, Fleet capacity, Audit log
Docs:       Quickstart, API reference, Guides, SDKs, Self-hosting, Changelog
```

### 1.4 `docs/SPRINT_PLAN.md`

All thirteen sprints (0 to 12) from this prompt, every task with ID (`S{n}-T{nn}`), title, labels, description, acceptance criteria, estimate (XS, S, M, L, XL), and dependencies. Include the gate checklist for each sprint and a dependency graph.

### 1.5 `docs/TEST_PLAN.md`

**Required sections:** Strategy, Test pyramid, Coverage targets, Naming convention, Fixtures and golden files, Scenario tables per feature area, Performance test method, Smoke checklist, Manual listening protocol.

Scenario tables must exist for: normalisation (by semiotic class and language), language tagging, segmentation, engine, audio encoders, REST endpoint, WebSocket endpoint, auth, metering and ledger, admission control, draining, console flows, Stripe webhooks, operator admin, SDKs, CLI, MCP, self-host licence, custom voice intake.

**Manual listening protocol:** automated tests cannot judge how speech sounds. Each release includes a 40-utterance listening sheet per voice (10 each for Hindi, Hinglish, en-IN, en-US, covering money, dates, OTPs, names, and code-switching) scored 1 to 5 by a human for intelligibility and naturalness. The agent generates the audio and the sheet. A human fills it in. A voice below a mean of 3.5 does not ship.

---

## Step 2 - GitHub Project Setup

### 2.1 Repository

```bash
gh repo create serverless-ventures/yuyin-tts --private \
  --description "Streaming text-to-speech API for Hindi, Hinglish, and English that runs on ordinary CPU servers."
git init && git checkout -b main
git add docs/ && git commit -m "docs: add product specification documents"
git remote add origin git@github.com:serverless-ventures/yuyin-tts.git
git push -u origin main
git checkout -b staging && git push -u origin staging
git checkout -b develop && git push -u origin develop
```

### 2.2 Branch Protection

| Branch | Rules |
|---|---|
| `main` | Require PR, 1 approval, all CI checks, linear history, no force push, no deletion, signed tags for releases |
| `staging` | Require PR, 1 approval, all CI checks, no force push |
| `develop` | Require PR, all CI checks |

### 2.3 Git Branch Strategy

```
main      -> production releases only, protected, requires 1+ approvals
staging   -> staging environment, requires 1 approval
develop   -> integration branch, all feature work merges here
feature/* -> off develop
fix/*     -> off develop (or main for hotfixes)
chore/*   -> non-functional changes
docs/*    -> documentation only
```

Rules:
- No direct commits to `main` or `staging`. Ever.
- All PRs require passing CI before merge.
- Hotfixes branch from `main`, merge to `main` and back-merge to `develop`.
- `main` tagged for every release using semantic versioning.

### 2.4 Labels (create all)

```bash
create() { gh label create "$1" --color "$2" --description "$3" --force; }
# type
create "type: feature"   1D76DB "New capability"
create "type: bug"       D73A4A "Something is wrong"
create "type: chore"     C5DEF5 "Tooling and maintenance"
create "type: docs"      0075CA "Documentation"
create "type: test"      BFD4F2 "Test infrastructure or coverage"
create "type: refactor"  D4C5F9 "No behaviour change"
create "type: perf"      FBCA04 "Performance"
create "type: security"  B60205 "Security"
create "type: spike"     E99695 "Time-boxed investigation"
create "enhancement"     A2EEEF "Deferred idea, not scheduled"
# area
create "area: text"      0E8A16 "Normalisation and segmentation"
create "area: engine"    0E8A16 "Synthesis engine and voices"
create "area: audio"     0E8A16 "Encoding, pace, formats"
create "area: gateway"   0E8A16 "REST, WebSocket, admission"
create "area: metering"  0E8A16 "Credits, ledger, pricing"
create "area: console"   0E8A16 "Console and playground"
create "area: site"      0E8A16 "Marketing site"
create "area: docs-site" 0E8A16 "Documentation site"
create "area: sdk"       0E8A16 "TypeScript and Python SDKs"
create "area: cli"       0E8A16 "CLI"
create "area: mcp"       0E8A16 "MCP server and harnesses"
create "area: selfhost"  0E8A16 "Self-host edition and licence"
create "area: infra"     0E8A16 "Terraform, Helm, CI"
create "area: bench"     0E8A16 "Benchmarks and load tests"
create "area: voice-intake" 0E8A16 "Custom voice and consent"
create "area: legal"     0E8A16 "Licence, terms, policies"
# priority
create "priority: p0"    B60205 "Blocks the sprint gate"
create "priority: p1"    D93F0B "Must land this sprint"
create "priority: p2"    FBCA04 "Should land this sprint"
create "priority: p3"    C2E0C6 "Nice to have"
# status
create "status: blocked"       000000 "Waiting on something"
create "status: needs-owner"   5319E7 "Needs an owner decision or action"
create "status: needs-spec"    5319E7 "Spec change required first"
create "status: in-review"     0052CC "PR open"
# size
create "size: XS" EDEDED "Under 1 hour"
create "size: S"  EDEDED "Half a day"
create "size: M"  EDEDED "One day"
create "size: L"  EDEDED "Two to three days"
create "size: XL" EDEDED "Split this"
# sprint
for n in 0 1 2 3 4 5 6 7 8 9 10 11 12; do create "sprint: $n" 006B75 "Sprint $n"; done
```

### 2.5 Milestones

One per sprint, named `Sprint {n}: {Name}`, with the sprint goal as the description and a due date computed from the start date and the durations in Appendix H.

### 2.6 Project Board

`gh project create --owner serverless-ventures --title "Yuyin"` with columns Backlog, Ready, In Progress, In Review, Done. Automation: new issues go to Backlog, an opened PR moves the linked issue to In Review, a merged PR moves it to Done.

### 2.7 Templates

Create `.github/ISSUE_TEMPLATE/task.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, and `.github/pull_request_template.md`.

Task template fields: Task ID, Sprint, Description, Acceptance criteria (checkboxes), Spec references (PRD FR ids, ARCHITECTURE sections), Test scenarios to add, Dependencies, Estimate.

PR template:

```markdown
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

---

## Step 3 - Create All GitHub Issues

**Creation protocol.** For every task in `docs/SPRINT_PLAN.md` create one issue:

- Title: `[S{n}-T{nn}] {Task title}`
- Body: the task template, fully filled
- Labels: one `type:`, one or more `area:`, one `priority:`, one `size:`, one `sprint:`
- Milestone: the sprint milestone
- Project: Yuyin board, Backlog column

Create issues in sprint order. After creation, write the issue number back into `docs/SPRINT_PLAN.md` next to each task ID and commit.

**Implementation comment protocol.** Before closing any issue, add a comment containing: what was built, files touched, spec sections updated, tests added (names and counts), anything deferred and the follow-up issue number, and how to verify by hand.

**Closing protocol.** An issue closes only when its PR is merged to `develop`, CI is green, every acceptance criterion is checked, and the implementation comment exists. Issues are closed by the PR (`Closes #n`), not by hand.

Also create one `enhancement` issue for every item in the Out of Scope section.

---

## Step 4+ - Sprint Execution

### Sprint Start Protocol
1. Move all sprint issues from Backlog to In Progress on the project board
2. Assign issues to yourself
3. Pull latest `develop` and verify it is up to date with `staging`
4. Pick the highest-priority unblocked issue
5. Read the relevant PRD, ARCHITECTURE, and TEST_PLAN sections before writing code
6. Add test scenarios for this feature to `docs/TEST_PLAN.md` before writing code
7. Create a branch: `git checkout -b feature/s{n}-t{nn}-{short-slug} develop`
8. Write failing tests first (TDD) and confirm they fail for the right reason
9. Implement until tests pass
10. Update `docs/TEST_PLAN.md` to mark new scenarios as ✅ Automated
11. Update relevant spec doc in the same branch if behavior changed
12. Open PR against `develop`. The PR description must state which spec sections were updated
13. Wait for CI (lint + type-check + unit + integration + coverage threshold)
14. Merge
15. Add implementation comment and close issue
16. Pick next issue

### Spec Change Protocol
Any PR that changes user-facing behavior, API contracts, database schema, or architectural decisions must satisfy one of:

- **A: No spec change.** PR description explicitly states "internal only, no spec change" and the reviewer agrees
- **B: Spec updated in same PR.** Relevant `docs/` file updated alongside code
- **C: Spec issue filed.** Separate GitHub issue created before the code PR merges, scheduled in the current sprint, closed within the same sprint

Option C is not a deferral mechanism.

Any change to `api/openapi.yaml` also requires regenerating both SDK type layers and the docs API reference in the same PR.

### Test Scenario Generation Protocol
1. Open `docs/TEST_PLAN.md` and add scenarios for the feature before writing code
2. Use naming convention: `{type}_{module}_{operation}_{scenario}_{outcome}`
3. Mark new scenarios as ⚠️ Deferred until the test is written, then ✅ Automated
4. Scenarios too hard to automate: ❌ Skipped with a written reason and a manual step
5. The test file must have a test for every ✅ scenario when the feature PR merges

### Sprint End Protocol
1. All sprint issues closed or moved to the next sprint with an explanation
2. Run the full sprint gate checklist
3. Spec doc audit: review all five docs for stale sections and update before proceeding
4. Coverage check: `cargo tarpaulin --workspace` and `vitest --coverage`, confirm targets are met
5. Merge `develop` into `staging` via PR
6. Run manual smoke tests on staging using the TEST_PLAN.md smoke checklist
7. Document the sprint retrospective in `docs/RETROSPECTIVES.md`:
   - What was built (links to closed issues)
   - Spec sections updated
   - Tests added (counts by type)
   - Coverage delta
   - What worked, what did not, what to change
8. Tag the staging build: `git tag sprint-{n}-complete && git push origin sprint-{n}-complete`

### Definition of Done

A feature is done when:
- [ ] Code implemented and compiles without errors
- [ ] Unit tests written and passing
- [ ] `bun run lint` exits 0 with 0 warnings
- [ ] `cargo clippy --workspace -- -D warnings` exits 0 (if Rust changes)
- [ ] `bun run type-check` exits 0
- [ ] Coverage has not dropped below thresholds
- [ ] PR opened against `develop` with issue linked
- [ ] CI green on all target platforms (linux/amd64 and linux/arm64 for the gateway; macOS, Linux, Windows for the CLI)
- [ ] Spec doc changes committed in the same PR (or Option A or C confirmed)
- [ ] New test scenarios added to TEST_PLAN.md
- [ ] Implementation comment added to the issue before closing

### Coverage Targets

```toml
# .coverage-thresholds.toml
[rust]
yuyin-text = 92
yuyin-audio = 85
yuyin-meter = 90
yuyin-engine = 75
yuyin-gateway = 80
yuyin-licence = 90

[typescript]
"apps/console/src/lib" = 85
"apps/console/src/components" = 75
"packages/sdk-ts/src" = 85
"packages/cli/src" = 80
"packages/mcp/src" = 80
"integrations/pi/src" = 70

[python]
"packages/sdk-python/yuyin" = 85
```

---

## Sprint 0 - Scaffold

**Milestone:** Sprint 0: Scaffold | **Duration:** 1 week
**Goal:** An empty but fully wired monorepo. CI is green, every agent file exists, nothing ships yet.

| ID | Title | Labels | Size |
|---|---|---|---|
| S0-T01 | Monorepo layout | chore, infra | M |
| S0-T02 | Rust workspace and toolchain | chore, infra | S |
| S0-T03 | Bun workspace, TypeScript base config, ESLint, Prettier | chore, infra | S |
| S0-T04 | CI pipeline | ci, infra | L |
| S0-T05 | Version source of truth and scripts | chore, infra | S |
| S0-T06 | Agent repository files | docs | M |
| S0-T07 | Licence and legal files | legal | S |
| S0-T08 | Local dev stack | chore, infra | M |
| S0-T09 | OpenAPI skeleton and contract lint | docs, gateway | S |
| S0-T10 | Dependabot, audit jobs, secret scanning | security | S |
| S0-T11 | Owner checklist | docs | XS |
| S0-T12 | Makefile and build entry points | chore, infra | M |
| S0-T13 | Container skeletons and image build in CI | ci, infra | M |

**S0-T01 Monorepo layout.** Create the tree in Appendix B. Every crate and package compiles with a placeholder and one passing test.
AC: `cargo build --workspace` and `bun install && bun run build` exit 0 on a clean clone.

**S0-T02 Rust workspace.** `rust-toolchain.toml` pinned to current stable. Workspace `Cargo.toml` with `[workspace.package]` version, edition 2021 or later, shared lints (`unsafe_code = "forbid"` except in `yuyin-engine` and `yuyin-audio` where FFI may need it, there `deny` with documented allows). `rustfmt.toml`, `clippy.toml`.
AC: `cargo fmt --check` and `cargo clippy --workspace -- -D warnings` exit 0.

**S0-T03 Bun workspace.** Root `package.json` with workspaces `apps/*`, `packages/*`, `integrations/*`. `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Scripts: `lint`, `type-check`, `test`, `build`.
AC: all four scripts exit 0.

**S0-T04 CI pipeline.** `.github/workflows/ci.yml`:

```yaml
jobs:
  lint-and-typecheck:   # ubuntu amd64 + arm64 runners; fmt, clippy, eslint, tsc
  unit-tests:           # needs lint; cargo test, vitest, pytest
  coverage:             # needs unit; tarpaulin + vitest coverage; fails under thresholds
  integration-tests:    # needs unit; service containers: postgres, valkey
  contract-tests:       # needs unit; openapi lint, SDK type drift check
  e2e-tests:            # needs integration; Playwright against local stack
  version-check:        # on PRs to staging and main; scripts/check-versions.sh
  cli-matrix:           # macOS, Linux, Windows; builds and smoke-tests the CLI (from Sprint 8)
  harness-smoke-tests:  # staging and release only (from Sprint 10)
```

AC: a PR with a deliberate lint error fails. A PR that drops coverage under threshold fails.

**S0-T05 Version scripts.** Root `VERSION` file with `0.1.0`. Add `scripts/check-versions.sh` and `scripts/extract-changelog.sh` exactly as given in the Versioning section. `CHANGELOG.md` with an `[Unreleased]` section.
AC: changing one package version makes `check-versions.sh` exit 1 naming the file.

**S0-T06 Agent repository files.** Generate `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `SKILLS.md`, `SOUL.md`, `.agent/skills/run-tests/{SKILL.md,run.sh}`, `.agent/skills/check-types/{SKILL.md,run.sh}`, `.agent/skills/run-golden/{SKILL.md,run.sh}` (runs the normalisation golden corpus), `.agent/skills/run-bench/{SKILL.md,run.sh}`. Content requirements are in Appendix J.
AC: each `run.sh` is executable and exits 0 on the scaffold.

**S0-T07 Licence and legal files.** `LICENSE` (proprietary, all rights reserved, Serverless Ventures LLC, 2026), `EULA.md` for the self-host edition (governing law Texas, venue Williamson County, contact legal@serverlessvc.com, liability cap at trailing 12 months of fees, clause reserving the right to change pricing and tiers), `THIRD_PARTY_LICENSES.md` (generated by `cargo about` and a license checker for npm, plus a hand-maintained `MODELS.md` section for model and voice licences). Mark the EULA as a draft that needs attorney review.
AC: files exist. CI job `licence-check` fails on any dependency with a licence outside the allowlist (MIT, Apache-2.0, BSD-2, BSD-3, ISC, Zlib, Unicode, MPL-2.0 for unmodified use).

**S0-T08 Local dev stack.** `docker-compose.dev.yml` with Postgres 16, Valkey, and `stripe-mock`. `scripts/dev.sh` starts everything. `.env.development.example` committed.
AC: `scripts/dev.sh` brings up the stack and `/healthz` on the placeholder gateway returns 200.

**S0-T09 OpenAPI skeleton.** `api/openapi.yaml` with every path from the contract stubbed. Lint with Spectral or Redocly in CI.
AC: lint exits 0. The file is the single source for SDK types and the docs reference.

**S0-T10 Supply chain.** Dependabot for cargo, npm, pip, GitHub Actions, Docker. `cargo audit` and `cargo deny` in CI. `bun audit` or equivalent. Gitleaks pre-commit and in CI.
AC: a commit containing a fake `yy_live_` secret is rejected.

**S0-T11 Owner checklist.** `docs/OWNER_CHECKLIST.md` listing every action only the owner can take, with the sprint by which it is needed: domain registration, name and trademark check, AWS account and region, Clerk application, Nile database, Stripe account and products, Vercel project, npm and PyPI org, GHCR access, pricing decision, voice name approval, attorney review of legal pages.
AC: file exists and is linked from the README.

**S0-T12 Makefile.** Root `Makefile` with every target listed in the Build and Deployment section. Targets for things that do not exist yet print "available from Sprint N" and exit 0. `make help` is generated from target comments. `make setup` checks prerequisites and reports what is missing.
AC: in a fresh container, `make setup && make build && make check` exits 0. `make dev` brings up the dev stack.

**S0-T13 Container skeletons.** `deploy/docker/Dockerfile.gateway` (multi-stage with `cargo-chef`, `slim` and `full` targets), `Dockerfile.console`, `.dockerignore`, OCI labels wired to `VERSION` and the commit. `make image` works for the placeholder gateway. CI builds both architectures on every PR without pushing.
AC: `docker run` of the placeholder image answers `/healthz`. A test asserts the OCI labels are present and correct, the user is non-root, and no `.env` file exists in any layer.

**Sprint 0 gate:**
- [ ] `make setup && make build && make check` passes on a clean clone
- [ ] `make dev` starts the local stack and `make smoke` passes against it
- [ ] `make image` builds for linux/amd64 and linux/arm64 in CI
- [ ] All five spec docs committed and linked from the README
- [ ] CI green on `develop`
- [ ] All agent files present
- [ ] `check-versions.sh` passes
- [ ] Licence check passes
- [ ] Every sprint issue exists on the board

---

## Sprint 1 - Text Front-End and Engine Selection

**Milestone:** Sprint 1: Backend Foundations | **Duration:** 1 week
**Goal:** Text goes in, correctly normalised and segmented text comes out, and we know which speech engine we are shipping, backed by measurements and a licence review. No network code.

| ID | Title | Labels | Size |
|---|---|---|---|
| S1-T01 | Golden corpus format and runner | test, text | M |
| S1-T02 | Script and language tagging | feature, text | L |
| S1-T03 | Number verbalisation, Hindi and English, Indian numbering | feature, text | L |
| S1-T04 | Currency | feature, text | M |
| S1-T05 | Dates and times | feature, text | M |
| S1-T06 | Phone numbers, OTPs, digit strings | feature, text | M |
| S1-T07 | Acronym lexicon and overrides | feature, text | M |
| S1-T08 | Units, percent, ranges, email, URL | feature, text | M |
| S1-T09 | Segmenter with short first segment | feature, text | M |
| S1-T10 | Engine bake-off spike and ADR | spike, engine | L |
| S1-T11 | `SynthesisEngine` trait and fake engine | feature, engine | S |
| S1-T12 | Property tests and fuzzing for the normaliser | test, text | M |

**S1-T01 Golden corpus.** `crates/yuyin-text/golden/*.tsv` with columns `id`, `lang`, `class`, `input`, `expected`, `notes`. A test harness runs every row. Start with at least 400 rows written by hand across all classes and four languages. Add a `scripts/golden-add.sh` helper.
AC: runner reports per-class pass counts. CI fails on any regression. Corpus grows to 1,500 rows by v1.0.0 (NFR-011).

**S1-T02 Tagging.** Per-token script detection from Unicode blocks. Roman Hindi detection with a bundled lexicon (at least 20,000 frequent romanised Hindi word forms, sourced from data with a permissive licence, licence recorded) plus a character n-gram scorer for unknown words. `language: "auto"` infers sentence-level matrix language. An explicit `language` constrains the tagger.
AC: at least 95% token-level accuracy on a held-out set of 2,000 hand-labelled Hinglish tokens in `tests/data/tagging/`.

**S1-T03 Numbers.** Cardinals to 10^15, ordinals, decimals, negatives, fractions. Hindi forms for 0 to 99 are irregular and must be a table, not a rule. Indian grouping (lakh, crore, arab) for hi, hinglish, en-IN. Western grouping (million, billion) for en-US.
AC: golden rows for every integer 0 to 100 in Hindi, boundary values, and 100 random values checked by round-trip property test (verbalise then parse).

**S1-T04 Currency.** `₹`, `Rs`, `Rs.`, `INR`, `रु`, `$`, `USD`. Paise and cents. "₹1.5 lakh", "₹2 Cr", "Rs 12,450/-".
AC: 120 golden rows pass.

**S1-T05 Dates and times.** Numeric dates per locale rule in the ARCHITECTURE spec, month names in both languages, relative formats untouched, 12 and 24 hour times, "5:30 PM", "17:30 hrs", durations.
AC: 120 golden rows pass. An ambiguity test proves 05/12/2026 reads as 5 December for en-IN and May 12 for en-US.

**S1-T06 Digit strings.** Rules as specified. Card and account tails ("ending 4417", "XXXX1234"), PIN codes (6-digit Indian postal codes read digit by digit when preceded by "PIN" or "पिन कोड"), Aadhaar-like and PAN-like patterns read character by character.
AC: 150 golden rows pass, including negative cases (years, quantities).

**S1-T07 Acronyms.** Built-in lexicon of at least 300 entries for banking, insurance, telecom, and government terms. Per-tenant overrides passed in as a parameter (the crate does no I/O).
AC: override precedence test passes. Unknown all-caps tokens of 2 to 5 letters default to letter-by-letter.

**S1-T08 Other classes.** Units (kg, km, GB, Mbps, %), ranges ("10-15 days"), emails, URLs (spoken form, with "dot" and "slash").
AC: 100 golden rows pass.

**S1-T09 Segmenter.** Split on sentence and clause punctuation in both scripts (including the danda `।`). The first segment is capped at about 60 code points by splitting on the earliest safe boundary. Later segments are capped at about 200. Each segment records its span in the original text for billing.
AC: the union of spans covers the input exactly with no overlap (property test). No segment splits inside a semiotic span.

**S1-T10 Engine bake-off (time box: 3 days).** Evaluate at least three open-weights TTS options that can run on CPU through ONNX Runtime or an equivalent permissively licensed runtime. Start from this candidate list and add any better option found at implementation time: Kokoro-family models, VITS-family voices such as those distributed for Piper, Matcha-TTS-family models, each through a runtime such as sherpa-onnx or the `ort` crate directly. For each candidate record:

- Licence of the code, the weights, each voice, and the phonemiser, with links. Reject anything that does not clearly allow commercial hosted use and redistribution inside a container image. Pay particular attention to GPL-licensed phonemisers and voices trained on datasets with non-commercial terms.
- Languages and voices available for Hindi, Indian English, US English.
- Whether the model supports chunked or incremental output inside a segment.
- Measured on a 4 vCPU x86 instance and a 4 vCPU ARM instance: real-time factor, time to first audio for a 60-character segment, peak memory, load time.
- A 20-utterance listening sample per language.

Write `docs/adr/ADR-015-engine-selection.md` with the table, the choice, and the fallback. If no candidate has an acceptable Hindi voice with a clean licence, stop and raise a `status: needs-owner` issue. Do not ship a voice with unclear rights.
AC: ADR merged. Benchmark scripts committed under `bench/engine-bakeoff/`. Licence evidence saved in `docs/licences/`.

**S1-T11 Engine trait.** Trait as in the ARCHITECTURE spec. `FakeEngine` generates a deterministic sine sweep whose length is proportional to text length, with a configurable delay, for use in every test above the engine layer.
AC: trait compiles, fake engine has tests, cancellation stops synthesis within 20 ms.

**S1-T12 Property and fuzz tests.** `proptest` for invariants: never panics on arbitrary Unicode, output is deterministic, output contains no ASCII digits when `normalize = true`, span coverage is exact. `cargo fuzz` target with a 10 minute CI budget on a weekly schedule.
AC: properties pass with 10,000 cases each.

**Sprint 1 gate:**
- [ ] Golden corpus at least 400 rows, 100% pass
- [ ] `yuyin-text` coverage at least 92%
- [ ] Tagging accuracy target met
- [ ] ADR-015 merged with a licence-clean engine choice, or an owner issue raised
- [ ] No network or file I/O in `yuyin-text` (enforced by a dependency check)

---

## Sprint 2 - Console and Site Shell

**Milestone:** Sprint 2: UI Shell | **Duration:** 1 week
**Goal:** The design system exists and every screen is navigable with mock data. Nothing is wired to real services except Clerk sign-in.

| ID | Title | Labels | Size |
|---|---|---|---|
| S2-T01 | Next.js app, Tailwind tokens, fonts | feature, console | M |
| S2-T02 | Component library | feature, console | L |
| S2-T03 | Signature element: the pulse line | feature, console | M |
| S2-T04 | Clerk auth and organization switcher | feature, console | M |
| S2-T05 | Console screens with mock data | feature, console | L |
| S2-T06 | Marketing site shell | feature, site | M |
| S2-T07 | Docs site shell | feature, docs-site | M |
| S2-T08 | Accessibility and Devanagari rendering checks | test, console | S |
| S2-T09 | Playwright harness and visual snapshots | test, console | M |

**S2-T01.** Next.js App Router, TypeScript strict, Tailwind with tokens from the Design System section expressed as CSS variables, dark theme default with a light theme. Self-host the fonts. Route groups: `(marketing)`, `(console)`, `(operator)`.
AC: Lighthouse performance at least 90 and accessibility at least 95 on the home shell.

**S2-T02.** Button, Input, Textarea (with code point counter that counts the same way as the gateway), Select, VoicePicker, Table, Tabs, Dialog, Toast, Badge, CodeBlock with copy and language tabs (curl, TypeScript, Python), KeyReveal (shows a secret once), BalanceMeter, UsageChart, EmptyState, ErrorState. Each has a Storybook story or an equivalent preview route and a unit test.
AC: every component has keyboard support and a visible focus ring.

**S2-T03.** The pulse line component described in the Design System section, driven by a mock audio stream.
AC: renders at 60 fps on a mid-range laptop, respects `prefers-reduced-motion`, has an accessible text alternative.

**S2-T04.** Clerk sign-up, sign-in, email verification, organizations, roles mapped to owner, admin, developer, billing. Middleware protects `(console)` and `(operator)`. Operator access is an allowlist of Clerk user ids from the environment.
AC: e2e test covers sign-up to first console view using Clerk test mode.

**S2-T05.** All console screens from DESIGN.md, backed by a typed mock data layer behind the same interfaces the real data layer will implement.
AC: every screen reachable, every empty and error state viewable through a query flag.

**S2-T06.** Home with a demo panel (mock), Pricing (reads `config/pricing.toml`), Benchmarks page (placeholder that states numbers will be published from the harness), Custom voice, FAQ, About, Contact, legal page stubs. All copy original. No performance claims.
AC: no page contains a latency or capacity number.

**S2-T07.** Docs site with MDX, sidebar, search, API reference generated from `api/openapi.yaml`.
AC: reference page builds from the OpenAPI file in CI.

**S2-T08.** axe checks in Playwright on every route. A fixture page renders 50 Devanagari strings with conjuncts and matras, snapshot-tested.
AC: zero serious or critical axe violations.

**S2-T09.** Playwright config, auth fixture, visual snapshots for 12 key screens in both themes.
AC: runs in CI in under 6 minutes.

**Sprint 2 gate:**
- [ ] Every screen in DESIGN.md exists and is navigable
- [ ] Design tokens are the only source of colour, type, and spacing values
- [ ] Zero serious accessibility violations
- [ ] Visual snapshots committed

---

## Sprint 3 - Streaming Synthesis (Core Feature)

**Milestone:** Sprint 3: Core Feature | **Duration:** 2 weeks
**Goal:** The feature that IS the product. A curl command with a real key placeholder returns audio that starts playing while synthesis is still running, over REST and over WebSocket, with honest overload behaviour.

| ID | Title | Labels | Size |
|---|---|---|---|
| S3-T01 | ONNX engine implementation | feature, engine | XL |
| S3-T02 | Voice registry and `config/voices.toml` | feature, engine | M |
| S3-T03 | Worker pool and per-stream pipeline | feature, gateway | L |
| S3-T04 | Opus encoder and Ogg muxer | feature, audio | L |
| S3-T05 | PCM and WAV outputs | feature, audio | S |
| S3-T06 | Pace control | feature, audio | M |
| S3-T07 | REST endpoint `POST /v1/speech` | feature, gateway | L |
| S3-T08 | WebSocket endpoint | feature, gateway | L |
| S3-T09 | Admission control and 503 behaviour | feature, gateway | M |
| S3-T10 | Graceful draining | feature, gateway | M |
| S3-T11 | Voices and normalise endpoints | feature, gateway | S |
| S3-T12 | Metrics, tracing, structured logs | feature, gateway | M |
| S3-T13 | Benchmark harness v1 and capacity file | feature, bench | L |
| S3-T14 | Static dev key auth shim | chore, gateway | XS |
| S3-T15 | Listening sheet generator | test, engine | S |
| S3-T16 | Gateway image with models and `healthcheck` subcommand | feature, infra | M |
| S3-T17 | Minimal Helm chart and kind install in CI | feature, infra | L |

**S3-T01 ONNX engine.** Implement `SynthesisEngine` for the engine chosen in ADR-015. Load models from `YUYIN_MODEL_DIR`. One session per voice or a shared session with speaker embeddings, whichever the model supports. Intra-op threads 1, inter-op 1. Phonemisation through the licence-approved front-end from the ADR. Emit PCM in chunks as soon as the model yields them. If the model cannot yield inside a segment, the short-first-segment rule is what delivers low time to first audio, and the spec must say so. Verify model file checksums at load.
AC: synthesises all four languages. `warmup()` runs one utterance per voice. A corrupt model file fails startup with a clear error and a non-zero exit.

**S3-T02 Voice registry.** `config/voices.toml` lists id, display name, engine voice reference, languages, gender, style, licence reference, sample text. Voice ids are stable slugs. Display names are original Indian and English first names proposed by the agent and approved by the owner. Ship only voices that passed the licence review. The v1 target is at least 6 public voices covering all four languages. Do not pad the catalogue with near-duplicates.
AC: every voice in the registry has a `licence_ref` that resolves to a file in `docs/licences/`. CI fails otherwise.

**S3-T03 Pipeline.** Per request: normalise and segment, enqueue segments to the worker pool, receive PCM over a bounded channel, encode, write. Workers are dedicated OS threads pinned to the configured core count. Cancellation propagates when the client disconnects. A panicking worker is caught, the stream ends with an error event, and the worker is replaced.
AC: with `FakeEngine`, 200 concurrent streams complete with no cross-talk (each stream's audio matches its expected deterministic signal).

**S3-T04 Opus.** 24 kHz mono, 20 ms frames, default 32 kbps, Ogg pages flushed at least every 100 ms so players can start early. For WebSocket, send Ogg pages as binary frames (document this, and offer `format: "opus_raw"` as a non-default option only if the spec decides so).
AC: output plays in Chrome, Firefox, Safari, ffplay, and VLC. An integration test decodes the stream with a reference decoder and checks duration within 2%.

**S3-T05 PCM and WAV.** PCM is s16le. WAV over a stream uses a header with the data length set to the maximum value and documents that behaviour.
AC: decodes in ffmpeg and in the browser Web Audio API.

**S3-T06 Pace.** Prefer the model's native duration or length-scale control. Where the model has none, use a pitch-preserving time-stretch (WSOLA) in `yuyin-audio`. Range 0.5 to 2.0, clamped, validated.
AC: measured output duration is within 5% of `baseline / pace` across the range. Pitch shift is under 1% (measured on a test tone path for the time-stretch implementation).

**S3-T07 REST.** As in the contract. The status line and headers are sent only after admission succeeds and the first audio chunk is ready or 300 ms have passed, whichever is first (so pre-audio failures can still return a proper error status). Trailers carry billed characters and time to first audio.
AC: scenario tests for every error code. `curl --no-buffer` shows bytes arriving before synthesis completes for a 1,000 character input.

**S3-T08 WebSocket.** Protocol as in the contract. Incoming text is buffered until a segment boundary or `flush`. Supports LLM-style token streaming: partial words are held until whitespace or punctuation arrives. Backpressure: if the client stops reading, synthesis for that stream pauses, and after 30 s the stream is closed.
AC: a test client that sends one word every 50 ms hears continuous speech with no gap longer than 400 ms beyond what the text timing implies (measured on `FakeEngine`).

**S3-T09 Admission.** As specified. `capacity_streams` loaded from `config/capacity.toml` keyed by instance class, overridable by env.
AC: at capacity, the next request gets 503 with `Retry-After` and zero audio bytes. Active streams finish with byte-identical output to an unloaded run on `FakeEngine`.

**S3-T10 Draining.** SIGTERM handling as specified. `/readyz` returns 503 while draining.
AC: an integration test sends SIGTERM during 20 active streams. All 20 complete. New requests are refused. Process exits 0.

**S3-T11.** `GET /v1/voices`, `GET /v1/voices/{id}`, `POST /v1/normalize` (rate limited to 60 per minute per key, never billed).
AC: contract tests pass against `api/openapi.yaml`.

**S3-T12 Observability.** Prometheus metrics: `yuyin_active_streams`, `yuyin_capacity_streams`, `yuyin_ttfa_seconds` (histogram, by voice and format), `yuyin_rtf` (histogram), `yuyin_requests_total` (by status and code), `yuyin_chars_total`, `yuyin_rejected_total` (by reason), `yuyin_worker_queue_depth`. OpenTelemetry traces with spans for normalise, queue wait, synthesis, encode. JSON logs with request id. Logs never contain request text unless `YUYIN_DEBUG_LOG_TEXT=true`, which is refused in the prod profile.
AC: a test asserts that no log line at info level contains the submitted text.

**S3-T13 Benchmark harness.** `bench/` contains a load generator (Rust) that drives REST and WebSocket at fixed concurrency levels with a fixed public corpus (`bench/corpus/*.txt`, original sentences in all four languages), records client-side and server-side time to first audio, real-time factor, error rates, and CPU. It finds the highest concurrency at which p95 real-time factor stays under 0.8 and no stream underruns, and writes that as `capacity_streams` to `config/capacity.toml` with a 20% safety margin. `bench/METHOD.md` documents hardware, corpus, commands, and how to reproduce.
AC: one command reproduces the run. Results are written to `bench/results/{date}-{instance}.json`. NFR-001 and NFR-002 are evaluated and the result is recorded in the retrospective, pass or fail. If they fail, open a `type: perf` issue. Do not adjust the numbers.

**S3-T14.** `YUYIN_DEV_API_KEY` accepted only when `YUYIN_ENV=dev`. Removed from the auth path by a compile-time feature in release builds.
AC: release build rejects the dev key. Test proves it.

**S3-T15.** `scripts/listening-sheet.sh` renders the 40 utterances per voice to `out/listening/{voice}/` and writes a CSV score sheet.
AC: sheet generated for every public voice. A `status: needs-owner` issue requests scoring.

**S3-T16 Gateway image.** The `full` image carries the real models in their own layer. `yuyin-gateway healthcheck` exits 0 when `/readyz` is ready. `make up` runs the stack from the built images.
AC: `make image && make up && make smoke` passes with `ENGINE=onnx`. The models layer digest does not change when only Rust code changes.

**S3-T17 Minimal chart.** Deployment, Service, ConfigMap, probes, drain settings, `values-kind.yaml`, `values.schema.json`, one `helm test`. `kind.yml` workflow installs it and runs the smoke suite and the rolling-upgrade test.
AC: `make kind-up && make image && make kind-load && make helm-install && make helm-test` passes locally and in CI.

**Sprint 3 gate:**
- [ ] Image builds, chart installs on kind, smoke suite passes against it (required at every gate from here on)
- [ ] `curl` to REST returns playable streamed Opus, PCM, and WAV in all four languages
- [ ] WebSocket incremental text works end to end with the reference client
- [ ] 503 before audio and no cut streams, proven by tests
- [ ] Drain test passes
- [ ] Benchmark harness run recorded, capacity file generated from measurement
- [ ] Listening sheets generated and sent to the owner
- [ ] No request text in logs

---

## Sprint 4 - Accounts, Keys, Metering, Credits

**Milestone:** Sprint 4: Secondary Feature | **Duration:** 1 week
**Goal:** Real customers can sign up, create keys, pay, and be billed correctly. The ledger reconciles.

| ID | Title | Labels | Size |
|---|---|---|---|
| S4-T01 | Database schema and migrations on Nile | feature, metering | M |
| S4-T02 | Tenant isolation tests | test, security | M |
| S4-T03 | API key lifecycle in the console | feature, console | M |
| S4-T04 | Gateway key verification and cache | feature, gateway | M |
| S4-T05 | Character counting and price lookup | feature, metering | S |
| S4-T06 | Redis reservation and settlement | feature, metering | L |
| S4-T07 | Ledger batcher and idempotency | feature, metering | M |
| S4-T08 | Stripe Checkout top-ups and webhooks | feature, console | L |
| S4-T09 | Launch grant | feature, metering | S |
| S4-T10 | 402, 429, key restrictions | feature, gateway | M |
| S4-T11 | Balance and usage endpoints and views | feature, gateway, console | M |
| S4-T12 | Reconciliation job and alert | feature, metering | M |
| S4-T13 | Per-tenant lexicon | feature, console, text | S |

**S4-T01.** Schema from the ARCHITECTURE spec with SQL migrations (`sqlx migrate` for the gateway side, the same SQL applied in the console's migration runner, one migrations directory, one owner). The ledger is append-only: no UPDATE or DELETE grants for the application role, enforced by database permissions and a trigger.
AC: migration up and down pass on a clean database. An attempted UPDATE on `ledger` fails.

**S4-T02.** Tests that create two tenants and prove that every query path in the console and the gateway returns only the caller's rows, including when a tenant id is forged in a request body.
AC: at least 25 isolation tests, all passing. One test per table.

**S4-T03.** Create (name, optional voice allowlist, optional monthly cap), list with prefix and last used, rename, revoke. Key format `yy_live_{8 char prefix}_{32 byte base62 secret}`. Only the SHA-256 hash and prefix are stored. The secret is shown once in `KeyReveal`.
AC: the secret never appears in any log, response other than creation, or database column. A test greps for it.

**S4-T04.** Gateway parses the key, looks up by prefix in Redis (fall through to Postgres), compares hashes in constant time, caches for 60 s. Revocation publishes on a Redis channel that every gateway subscribes to and evicts within 10 s (NFR-010). Organization suspension uses the same channel.
AC: revoke-to-reject measured under 10 s across two gateway instances in an integration test.

**S4-T05.** `count_chars(text) -> u64` counts Unicode scalar values after NFC. One implementation in Rust, exposed to the console through a WASM build so the playground counter matches the bill exactly.
AC: a shared fixture file of 200 strings gives identical counts in Rust and in the browser.

**S4-T06.** Lua scripts: `reserve(org, cost) -> ok | insufficient`, `settle(org, reserved, actual)`, `credit(org, amount)`. Balance cache is hydrated from the ledger sum on miss. Reservations carry a TTL so a crashed gateway cannot strand credit.
AC: a concurrency test with 500 parallel reservations against a balance that covers exactly 100 admits exactly 100.

**S4-T07.** Batcher as specified. On Postgres outage, events are spooled to local disk (bounded, 100 MB) and replayed. Duplicate `request_id` is a no-op.
AC: kill Postgres mid-run, restart, and the ledger contains every event exactly once.

**S4-T08.** Top-up page with preset amounts and a custom amount at or above the minimum. Stripe Checkout in payment mode. Webhook handler verifies signatures, handles `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`, idempotent on event id. Receipts come from Stripe. Refunds follow the written refund policy: unused prepaid balance refundable within the window the owner sets.
AC: e2e in Stripe test mode: pay, balance increases within 5 s, replayed webhook does not double-credit, refund reduces balance and writes a ledger row.

**S4-T09.** On first email verification of an organization's owner, if fewer than `grant_limit` organizations hold a grant, write a `grant` row. Grant characters are consumed before paid balance. Abuse guard: one grant per organization and one per normalised owner email address (plus-tags and dots folded where the mail provider ignores them).
AC: the 1,001st organization receives no grant. A race test with 50 concurrent verifications at the boundary never exceeds the limit.

**S4-T10.** 402 path, per-key rate limits (default 20 requests per second, 10 concurrent streams, configurable per organization), voice allowlist (403 `key_restricted`), monthly cap (402 with a distinct message), suspended organization (403 `org_suspended`).
AC: scenario tests for each.

**S4-T11.** `GET /v1/balance`, `GET /v1/usage`, console Usage and Billing screens on real data. `usage_daily` is maintained by the batcher.
AC: usage totals equal the ledger totals for the same period in a property test over random workloads.

**S4-T12.** Daily job recomputes balances from the ledger, compares with Redis and with the sum of `usage_daily`, writes a report row, and raises an alert on any difference.
AC: an injected 1 micro-USD discrepancy is detected.

**S4-T13.** Console screen to manage lexicon entries. The gateway loads a tenant's lexicon with the key cache entry and passes it to the normaliser.
AC: an override changes the spoken form in the normalise endpoint for that tenant only.

**Sprint 4 gate:**
- [ ] Sign up, create key, top up in Stripe test mode, synthesise, see usage: all in one e2e test
- [ ] Ledger reconciles to zero after a 10,000 request soak with random disconnects
- [ ] Isolation suite green
- [ ] No secret material in logs or database
- [ ] Revocation under 10 s

---

## Sprint 5 - Playground, Docs, SDKs, Benchmarks Page

**Milestone:** Sprint 5: Tertiary Feature | **Duration:** 1 week
**Goal:** A developer goes from landing page to hearing their own text in under five minutes, without talking to anyone.

| ID | Title | Labels | Size |
|---|---|---|---|
| S5-T01 | Console playground on the real API | feature, console | L |
| S5-T02 | Public demo on the home page | feature, site | M |
| S5-T03 | TypeScript SDK | feature, sdk | L |
| S5-T04 | Python SDK | feature, sdk | L |
| S5-T05 | Docs content | docs, docs-site | L |
| S5-T06 | Benchmarks page from harness output | feature, site | M |
| S5-T07 | Onboarding flow | feature, console | S |
| S5-T08 | Changelog and status feed | feature, site | S |

**S5-T01.** Text box with live code point count and estimated cost, voice picker with samples, language, format, pace, a "show normalised text" toggle that calls `/v1/normalize`, play over WebSocket with the pulse line and a measured time-to-first-audio readout (labelled as measured in this browser, including network), and a "copy as curl / TypeScript / Python" panel. Uses a short-lived, organization-scoped playground token minted by the console, never a long-lived key in the browser.
AC: e2e test plays audio and asserts the readout is populated.

**S5-T02.** A limited public demo: fixed set of voices, 200 code point limit, per-IP and global rate limits, served through a console route that holds a restricted key server-side. Sample texts are original and avoid anything that reads like a real bank message with real-looking numbers.
AC: the demo cannot be used to synthesise more than the configured daily budget. Test proves the budget cut-off.

**S5-T03.** `@yuyin-tts/sdk`: `speak()` returning a `ReadableStream`, `speakToFile()` in Node, `stream()` WebSocket session with `write(text)`, `flush()`, `end()`, async iteration over audio chunks, typed errors per error code, retries with backoff that honour `Retry-After` on 503 and 429 and never retry 402. Types generated from OpenAPI. Works in Node 20+, Bun, Deno, and browsers.
AC: contract tests against a mock server generated from the OpenAPI file, plus live tests against the local gateway.

**S5-T04.** `yuyin` on PyPI (publishing is an owner action): sync and async clients, same surface, `httpx` and `websockets`, type hints, `py.typed`.
AC: same contract and live tests as the TypeScript SDK. Python 3.10+.

**S5-T05.** Quickstart (key to audio in three steps), Streaming over REST, Streaming over WebSocket with an LLM, Normalisation guide with a table of what is read how, Languages and code-switching, Voices, Pace and formats, Billing and character counting, Errors and retries, Rate limits and capacity behaviour, Security and data handling, SDK references, Self-hosting (stub until Sprint 7), FAQ. Every code sample is executed in CI against the local stack.
AC: docs sample test job is green. No sample contains a real key.

**S5-T06.** The Benchmarks page renders the latest file in `bench/results/` through a build step: hardware, corpus, method link, time to first audio percentiles, real-time factor, measured capacity per node, date. If no result file exists for the production instance class, the page says so instead of showing numbers.
AC: changing the results file changes the page. No number on the page is hand-typed (a lint rule checks the page source for numeric literals).

**S5-T07.** After sign-up: create the first key, show the curl command pre-filled, play a sample. Three steps, skippable.
AC: median time from verified email to first audio under 3 minutes in a hallway test with two people (owner arranges). The agent records the instruction in the owner checklist.

**S5-T08.** Changelog page built from `CHANGELOG.md`. Status page: a simple first-party page fed by a health prober, with a manual incident banner controlled from the operator console.
AC: an incident created in the operator console shows on the site within 60 s.

**Sprint 5 gate:**
- [ ] Playground plays real audio in Chrome, Firefox, and Safari
- [ ] Both SDKs pass contract and live tests
- [ ] Every docs code sample runs in CI
- [ ] Benchmarks page shows only harness-generated numbers
- [ ] Public demo budget limits proven

---

## Sprint 6 - Release v1.0.0

**Milestone:** Sprint 6: Release | **Duration:** 1 week
**Goal:** Production-ready hosted service. Infrastructure as code, security review, operator tooling, legal pages, and the v1.0.0 tag.

| ID | Title | Labels | Size |
|---|---|---|---|
| S6-T01 | Terraform for AWS | feature, infra | XL |
| S6-T02 | Gateway image and deploy pipeline | ci, infra | L |
| S6-T03 | Operator console | feature, console | L |
| S6-T04 | Acceptable use enforcement and abuse intake | feature, security | M |
| S6-T05 | Legal pages | legal, site | M |
| S6-T06 | Security review and threat model | security | L |
| S6-T07 | Load, soak, and chaos tests on staging | test, bench | L |
| S6-T08 | Alerts, dashboards, runbooks | docs, infra | M |
| S6-T09 | Backup, restore, and data retention jobs | feature, infra | M |
| S6-T10 | Release v1.0.0 | chore | S |

**S6-T01.** Terraform modules: VPC, EKS (or ECS if the ADR prefers, decide and record), node group of compute-optimised CPU instances in `ap-south-1` (benchmark both x86 and Graviton classes and pick by cost per stream), ALB or NLB with WebSocket support and idle timeout above 10 minutes, ElastiCache, Secrets Manager, ECR pull-through or GHCR pull secret, CloudWatch, Route 53 or Cloudflare DNS records, WAF with rate rules. Separate state per environment. `terraform plan` runs in CI. `apply` to prod is an owner action.
AC: staging environment created from scratch by `terraform apply` with no manual steps other than secrets.

**S6-T02.** Multi-arch image built with `cargo-chef`, distroless base, non-root, read-only root filesystem, models baked into a separate image layer with checksums, signed with cosign keyless, SBOM attached. Deploy by Helm with rolling update `maxUnavailable: 0`, `preStop` hook, and the drain timeout.
AC: a staging deploy during a 50-stream load test cuts zero streams.

**S6-T03.** Organizations list and detail, suspend and unsuspend, manual credit and debit with required reason, refund trigger, key list (prefix only), abuse queue, custom voice queue (stub), fleet capacity view, incident banner, audit log. Every operator action writes to `audit_log`.
AC: every mutation has an audit row. Tested.

**S6-T04.** Acceptable use policy enforcement: sign-up requires accepting the policy, a public abuse report form, operator suspension, per-organization velocity alerts (sudden volume spikes from new accounts), and a default block on new accounts synthesising text that matches a small set of high-risk fraud patterns (requests for OTPs, card numbers, or PINs phrased as an instruction to the listener to disclose them) until the organization completes business verification in the console. Blocks return 403 `policy_review_required` with a link. The pattern set lives in config and has tests for false positives on ordinary bank notification text ("Your OTP is 4 5 1 2. Do not share it with anyone" must pass).
AC: tests for block, pass, and verified-organization bypass. Policy document linked from every 403 of this kind.

**S6-T05.** Terms of Service, Privacy Policy, Acceptable Use Policy, Refund Policy, and a Voice Consent Policy. Written from scratch as drafts. Governing law Texas, venue Williamson County, contact legal@serverlessvc.com. Each page carries a visible "draft pending legal review" banner controlled by an env flag that only the owner turns off.
AC: pages exist. The banner flag defaults to on in every environment.

**S6-T06.** `docs/THREAT_MODEL.md` (STRIDE per component), dependency audit clean, container scan clean of high and critical findings, headers and CSP on the console, SSRF and injection review of every input path, WebSocket auth and origin checks, rate limit bypass attempts, key enumeration timing test, secrets rotation procedure tested once.
AC: findings table with every item closed or accepted by the owner in writing.

**S6-T07.** On staging: ramp to measured capacity, 2 hour soak at 60% capacity with random client disconnects, node kill during load, Redis failover, Postgres outage for 60 s. Ledger reconciles after each.
AC: results written to `bench/results/` and summarised in the retrospective. Zero unexplained cut streams outside the killed node.

**S6-T08.** Dashboards: fleet utilisation, time to first audio, error rates by code, ledger lag, webhook failures. Alerts with runbooks in `docs/runbooks/`: capacity above 80% for 5 minutes, p95 time to first audio above target for 10 minutes, reconciliation mismatch, ledger spool growing, webhook failures, certificate expiry.
AC: each alert fired once on staging by fault injection.

**S6-T09.** Nile backups verified by a restore drill, `request_log` 30 day retention job, account deletion flow that removes personal data and keeps the financial ledger as required for accounting, with the retention rule documented in the privacy policy draft.
AC: restore drill documented with timings.

**S6-T10.** Follow the Release Checklist in the Versioning section. Tag `v1.0.0`.
AC: release exists with changelog body, signed images, and SBOMs. Production promotion is an owner action.

**Sprint 6 gate:**
- [ ] Staging built entirely from Terraform and Helm
- [ ] Zero cut streams during a rolling deploy under load
- [ ] Security findings closed or accepted in writing
- [ ] Soak and chaos tests recorded, ledger reconciles
- [ ] Legal drafts in place with review banner on
- [ ] Listening sheets scored by a human, every shipping voice at or above 3.5
- [ ] `v1.0.0` tagged, release checklist complete

---

## Versioning, Changelog, and Release

### Semantic Versioning

`MAJOR.MINOR.PATCH` for the product as a whole. One version for the gateway, console, SDKs, CLI, MCP server, and Helm chart.

- **MAJOR:** a breaking change to the public API, WebSocket protocol, SDK surface, self-host configuration, or billing semantics.
- **MINOR:** new voices, languages, endpoints, optional fields, or normalisation classes that do not change existing output.
- **PATCH:** bug fixes. A normalisation fix that changes how an existing input is spoken is a PATCH only if the old reading was wrong per the spec. It must be listed in the changelog under "Changed readings" because customers can hear it.

The HTTP API path version (`/v1`) changes only on a MAJOR that breaks the wire contract.

### Version Source of Truth

The root `VERSION` file. Every other version field derives from it and is checked in CI.

### `scripts/check-versions.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

CANONICAL=$(tr -d '[:space:]' < VERSION)

check() {
  local actual=$1 file=$2
  if [[ "$actual" != "$CANONICAL" ]]; then
    echo "✗ Version mismatch in $file: expected $CANONICAL, got $actual"
    exit 1
  fi
  echo "✓ $file: $CANONICAL"
}

check "$(grep -m1 -A20 '^\[workspace.package\]' Cargo.toml | grep -m1 '^version' | cut -d'"' -f2)" "Cargo.toml [workspace.package]"
check "$(jq -r '.version' package.json)" "package.json"
for pkg in apps/console packages/sdk-ts packages/cli packages/mcp integrations/pi; do
  check "$(jq -r '.version' "$pkg/package.json")" "$pkg/package.json"
done
check "$(grep -m1 '^version' packages/sdk-python/pyproject.toml | cut -d'"' -f2)" "packages/sdk-python/pyproject.toml"
check "$(grep -m1 '^  version:' api/openapi.yaml | awk '{print $2}' | tr -d '"')" "api/openapi.yaml info.version"
check "$(grep -m1 '^version:' deploy/helm/yuyin/Chart.yaml | awk '{print $2}' | tr -d '"')" "deploy/helm/yuyin/Chart.yaml version"
check "$(grep -m1 '^appVersion:' deploy/helm/yuyin/Chart.yaml | awk '{print $2}' | tr -d '"')" "deploy/helm/yuyin/Chart.yaml appVersion"

echo "── All versions consistent: $CANONICAL ──"
```

Paths that do not exist yet in early sprints are added to the script in the sprint that creates them. The script must never skip a file silently.

### Version Bump Process

1. `scripts/bump-version.sh <new-version>` writes `VERSION` and every derived file.
2. Move `[Unreleased]` entries in `CHANGELOG.md` under `## [<new-version>] - YYYY-MM-DD` and add a fresh empty `[Unreleased]`.
3. Run `scripts/check-versions.sh`.
4. Commit as `chore: release v<new-version>` on a `chore/release-<new-version>` branch and open a PR to `staging`.

### Changelog Protocol

Keep a Changelog format. `[Unreleased]` is always present. Sections: Added, Changed, Changed readings, Deprecated, Removed, Fixed, Security. Every PR that changes behaviour adds a line under `[Unreleased]`. CI fails a PR labelled `type: feature` or `type: bug` that does not touch `CHANGELOG.md`.

### `scripts/extract-changelog.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSION="${1:?Usage: $0 <version>}"
awk "/^## \\[${VERSION}\\]/{found=1; next} found && /^## \\[/{exit} found{print}" CHANGELOG.md
```

### Git Tagging Strategy

- Releases: annotated, signed tags on `main`: `git tag -s v1.0.0 -m "Yuyin v1.0.0"`.
- Sprints: lightweight tags on `staging`: `sprint-{n}-complete`.
- Release candidates: `v1.0.0-rc.1` on `staging`.

### Release Workflow (CI)

```
PR chore/release-x.y.z -> staging
        |
        v
CI: full suite + check-versions + licence-check
        |
        v
merge -> staging deploy (automatic) -> tag vX.Y.Z-rc.N
        |
        v
staging validation: smoke checklist, load test at 60% capacity, listening sheet diff
        |
        v
PR staging -> main (1 approval)
        |
        v
merge -> owner pushes signed tag vX.Y.Z
        |
        v
release.yml on tag:
  build multi-arch images -> cosign sign -> SBOM attach -> push GHCR
  build CLI binaries (macOS universal, linux x64/arm64, windows x64) -> checksums
  build SDK packages (not published, artifacts only)
  package Helm chart -> push OCI chart to GHCR
  build self-host tarball (binary + models + licence docs)
  create GitHub Release with extract-changelog.sh output
        |
        v
owner actions: promote images to prod (Helm upgrade), publish npm and PyPI, announce
```

### Release Checklist

**Pre-release**
- [ ] All milestone issues closed
- [ ] `[Unreleased]` moved, version bumped, `check-versions.sh` green
- [ ] Golden corpus 100%, coverage thresholds met
- [ ] `THIRD_PARTY_LICENSES.md` and model licence table regenerated
- [ ] OpenAPI diff reviewed, no unintended breaking change
- [ ] Changed readings listed, if any

**Staging validation**
- [ ] Smoke checklist from TEST_PLAN.md
- [ ] Rolling deploy under load, zero cut streams
- [ ] Ledger reconciliation clean after load test
- [ ] Benchmarks rerun if engine, model, or instance class changed
- [ ] Listening sheet rerun for any changed voice

**Release**
- [ ] PR staging to main approved and merged
- [ ] Signed tag pushed by owner
- [ ] Release workflow green, images signed, SBOMs attached
- [ ] Production Helm upgrade by owner, canary 10% for 30 minutes then full

### Post-Release Actions

- Back-merge `main` into `develop`
- Verify the status page and dashboards for one hour
- Publish the changelog page
- Open the next milestone
- File issues for anything deferred during release

---

## Coding Standards

### Rust

- Edition as set in the workspace. `#![forbid(unsafe_code)]` in every crate except where FFI requires it, and there every `unsafe` block has a `// SAFETY:` comment.
- No `unwrap()`, `expect()`, or `panic!` outside tests and `main` startup. Library crates return `Result<T, E>` with `thiserror` error enums. Binaries use `anyhow` only at the top level.
- No blocking calls on the async runtime. CPU work goes to the worker pool. File I/O at startup only.
- `cargo clippy --workspace --all-targets -- -D warnings` clean. `clippy::pedantic` enabled with a documented allowlist.
- Public items have doc comments. Every public function in `yuyin-text` has a doctest with a Hindi and an English example.
- Money is `i64` micro-USD in a newtype `MicroUsd`. Character counts are `u64` in a newtype `Chars`. No floats in billing code. A lint test greps `yuyin-meter` for `f32` and `f64`.
- Timeouts on every network call. No unbounded channels or queues.
- Logging through `tracing`. No `println!` outside the CLI entry point of dev tools.
- Request text is a `SensitiveText` newtype whose `Debug` and `Display` print only the length.

### TypeScript and React

- `strict` on. No `any`. No non-null assertions without a comment. No `// @ts-ignore`.
- No `console.log` in committed code. Use the logger.
- Server Components by default. Client Components only where interaction requires it.
- Data access through a typed repository layer that always sets the Nile tenant context. No raw SQL in route handlers or components.
- Zod validation on every route handler input and every webhook payload.
- Zustand for client state that crosses components (playground session). No global state for server data.
- Components are small, named by what they are, and have tests for behaviour, not markup.
- Dates in UTC in storage, the user's locale in display. Money formatted from integer micro-USD through one helper.

### Python (SDK only)

- `ruff` and `mypy --strict` clean. Public API fully typed. No runtime dependencies beyond `httpx`, `websockets`, and `pydantic` if needed.

### General

- No magic numbers. Limits and defaults live in `config/` or named constants with a comment pointing to the PRD requirement id.
- TODO format: `// TODO(#issue-number): text`. A TODO without an issue fails lint.
- Conventional Commits:

```
feat:     new feature
fix:      bug fix
chore:    maintenance, tooling, dependencies
docs:     documentation only
test:     testing infrastructure or coverage
refactor: code improvement, no behavior change
perf:     performance improvement
ci:       GitHub Actions and pipelines
```

- No em dashes in any prose, copy, comment, or commit message. Use a colon, comma, or full stop.
- Copy never uses "game-changer", "revolutionary", "blazing", or similar. State what the product does and show the measurement.
- Every user-visible string in the console goes through a messages file so Hindi localisation can be added later.

---

## Security Guidelines

### API and Gateway

- TLS 1.2+ only at the edge. HSTS on every hostname.
- API keys: 32 random bytes from the OS CSPRNG, stored as SHA-256 hash, compared in constant time, shown once, prefixed so secret scanners can detect them. Register the pattern with GitHub secret scanning when the owner is ready.
- Authentication runs before any body parsing beyond a size check. Maximum request body 64 KiB.
- Input validation: length in code points, allowed Unicode categories, control characters stripped, voice id against the registry. Reject, never truncate silently.
- WebSocket: origin allowlist for browser tokens, per-connection limits, ping every 20 s, close on protocol violation.
- Rate limits at three levels: WAF per IP, gateway per key, gateway per organization.
- `/metrics` and admin ports bind to the internal network only.
- The synthesis worker never opens network connections and never reads files outside `YUYIN_MODEL_DIR`. Enforce with a seccomp profile and a read-only root filesystem.
- Model files are verified by SHA-256 against a manifest signed at build time.

### Console

- Clerk for sessions. CSRF protection on all mutations. Strict CSP with nonces, no inline scripts, `frame-ancestors 'none'`.
- Role checks on the server for every action. The client never decides authorisation.
- Stripe webhooks verified by signature. Secrets in Vercel encrypted env.
- Operator routes require an allowlisted user and a fresh session (re-auth within 15 minutes for credit and suspension actions).
- Playground tokens are short-lived (5 minutes), scoped to one organization, limited to the playground rate.

### Data and Privacy

- Text and audio are processed in memory and not stored. `request_log` keeps metadata only.
- No third-party analytics, session replay, or advertising pixels anywhere. Server-side first-party page counts only.
- The self-host edition makes zero outbound connections. A test runs it in a network namespace with no route out and asserts normal operation.
- Personal data inventory in `docs/DATA_INVENTORY.md`: what, where, why, retention.
- Consent recordings for custom voices are stored in S3 with KMS encryption and Object Lock, access logged, and retrievable only by operators.

### Voice Safety

- No voice cloning from arbitrary audio. Custom voices are created only through the consent workflow with identity verification of the speaker.
- No voices that imitate a real public figure. The intake form states this and the operator checks it.
- Consent can be withdrawn. Withdrawal disables the voice within one business day and is recorded.
- The acceptable use policy prohibits impersonation, fraud, harassment, and deceptive robocalls, and the enforcement hooks in S6-T04 exist to act on it.

### Dependency and Supply Chain

- `cargo audit`, `cargo deny`, npm audit, and `pip-audit` in CI. High and critical findings block merge.
- Lock files committed. Dependabot weekly.
- GitHub Actions pinned by commit SHA.
- Images signed with cosign keyless, SBOM (SPDX) attached, base images pinned by digest.
- Licence allowlist enforced for code. Model and voice licences reviewed by hand and recorded.

### Network Defaults

- Local development binds to `127.0.0.1` only.
- The self-host edition binds to `127.0.0.1` by default and requires an explicit `--bind` to listen elsewhere.

---

## Design System

The full system lives in `docs/DESIGN.md`. This section seeds it. The look is a precise instrument: dark, quiet, with one warm accent. It must render Devanagari as carefully as Latin.

### Color Tokens

```
Dark theme (default)
--bg-0        #0B0D10    page
--bg-1        #12151A    panels
--bg-2        #1A1E25    raised, inputs
--bg-3        #242A33    hover, selected
--line        #2B323C    borders, dividers
--text-0      #F2F4F7    primary
--text-1      #B4BCC8    secondary
--text-2      #7C8696    tertiary, placeholders
--accent      #F5A524    marigold: primary actions, the pulse line
--accent-ink  #1A1200    text on accent
--accent-dim  #F5A52433  glows, focus halo
--ok          #3DD68C
--warn        #F5A524
--err         #F2555A
--info        #5AA9F2

Light theme
--bg-0 #FBFAF7  --bg-1 #FFFFFF  --bg-2 #F3F1EC  --bg-3 #E9E6DF  --line #DAD6CC
--text-0 #14171C  --text-1 #474E5A  --text-2 #7A8290
--accent #C77700  --accent-ink #FFFFFF
```

All text and background pairs meet WCAG AA. Verify with an automated contrast test over the token table.

### Typography

```
Sans (UI and prose):  IBM Plex Sans
Devanagari:           IBM Plex Sans Devanagari   (same family, matched metrics)
Mono (code, numbers): IBM Plex Mono

Scale (px / line height):
  display   44 / 52   weight 500
  h1        32 / 40   weight 500
  h2        24 / 32   weight 500
  h3        18 / 26   weight 600
  body      15 / 24   weight 400
  small     13 / 20   weight 400
  mono      13 / 20   weight 400
```

Rules: weights 400, 500, 600 only. Numbers in tables and meters use the mono face with tabular figures. Devanagari text gets a line height 4 px larger than Latin at the same size so matras do not clip. Verify the font licences (SIL Open Font License expected) and record them.

### Spacing

4 px base. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Radius: 6 px for controls, 10 px for panels. One elevation level only, expressed by `--bg-2` and a 1 px `--line` border, no drop shadows.

### Signature Element: the pulse line

A single horizontal line in `--accent` that sits flat when idle and becomes a live waveform as audio arrives. The left end carries a small mono readout of milliseconds to first audio, counting up from the moment of the request and freezing when the first audio chunk lands. It appears in the playground, in the home page demo, and as a 2 px page-top progress indicator in the console. It is the only animated element in the product. It respects reduced motion by showing a static level meter instead.

### Component Inventory

Listed in S2-T02. Each component in DESIGN.md gets: purpose, anatomy, states (default, hover, focus, active, disabled, loading, error), keyboard behaviour, and a do and do-not pair.

### Content Voice

Plain, specific, technical. Say what happens and what it costs. Show the request and the response. Hindi examples appear next to English ones as equals, not as a novelty. No exclamation marks.

### Anti-Patterns (must not appear)

- Gradient hero backgrounds, glowing orbs, or abstract "AI" imagery
- Sound-wave stock illustrations, robot or microphone clip art
- More than one accent colour on a screen
- Drop shadows, glassmorphism, or blurred backdrops
- Performance numbers that did not come from the harness
- Fake testimonials, invented customer logos, or invented usage counters
- Animated counters, typewriter effects, or autoplaying audio
- Emoji in UI copy
- Any layout, phrasing, or imagery taken from another TTS vendor's site

---

## Environment Model

| | dev | stage | prod |
|---|---|---|---|
| Where | Laptop, Docker Compose | AWS `ap-south-1`, small cluster | AWS `ap-south-1` |
| Console | `localhost:3000` | `console.stage.getyuyin.com` (Vercel preview env) | `console.getyuyin.com` |
| API | `localhost:8080` | `api.stage.getyuyin.com` | `api.getyuyin.com` |
| Database | Local Postgres | Nile staging database | Nile production database |
| Payments | `stripe-mock` | Stripe test mode | Stripe live mode |
| Auth | Clerk development instance | Clerk development instance | Clerk production instance |
| Key prefix | `yy_test_` | `yy_test_` | `yy_live_` |
| Engine | `FakeEngine` by default, real engine opt-in | Real engine | Real engine |
| Deploy | manual | automatic on merge to `staging` | owner, on signed tag |

### Environment Variables

| Name | dev | stage | prod |
|---|---|---|---|
| `YUYIN_ENV` | `dev` | `stage` | `prod` |
| `YUYIN_BIND` | `127.0.0.1:8080` | `0.0.0.0:8080` | `0.0.0.0:8080` |
| `YUYIN_METRICS_BIND` | `127.0.0.1:9090` | `0.0.0.0:9090` (internal) | `0.0.0.0:9090` (internal) |
| `YUYIN_ENGINE` | `fake` | `onnx` | `onnx` |
| `YUYIN_MODEL_DIR` | `./models` | `/models` | `/models` |
| `YUYIN_WORKER_THREADS` | `2` | node vCPU count | node vCPU count |
| `YUYIN_CAPACITY_STREAMS` | `8` | from `capacity.toml` | from `capacity.toml` |
| `YUYIN_DRAIN_TIMEOUT_SECS` | `5` | `120` | `120` |
| `YUYIN_MAX_TEXT_CHARS` | `5000` | `5000` | `5000` |
| `YUYIN_DATABASE_URL` | local | secret | secret |
| `YUYIN_REDIS_URL` | `redis://127.0.0.1:6379` | secret | secret |
| `YUYIN_DEV_API_KEY` | set | unset | unset (rejected by build) |
| `YUYIN_DEBUG_LOG_TEXT` | `false` | `false` | refused |
| `YUYIN_OTLP_ENDPOINT` | unset | collector | collector |
| `YUYIN_LICENCE_FILE` | unset | unset | unset (self-host only) |
| `YUYIN_MODE` | `hosted` | `hosted` | `hosted` (`selfhost` in that edition) |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | stage URL | prod URL |
| `CLERK_SECRET_KEY` | dev secret | secret | secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | dev | dev | prod |
| `STRIPE_SECRET_KEY` | mock | test secret | live secret |
| `STRIPE_WEBHOOK_SECRET` | mock | secret | secret |
| `NILE_DATABASE_URL` | local | secret | secret |
| `OPERATOR_USER_IDS` | your id | allowlist | allowlist |
| `LEGAL_DRAFT_BANNER` | `on` | `on` | `on` until owner sets `off` |
| `PUBLIC_DEMO_DAILY_CHAR_BUDGET` | `10000` | `50000` | owner sets |

`.env.development.example` and `.env.stage.example` are committed with placeholder values. Real `.env` files are never committed.

---

## Build and Deployment

This section is the single reference for how Yuyin is built and shipped. It defines four paths that build on each other. Every path has one entry-point command, a verification step, and a sprint that owns it. `docs/ARCHITECTURE.md` must carry a "Build and Deployment" section that mirrors this one, and `docs/DEPLOYMENT.md` is the operator-facing guide generated from it.

| Path | What it gives you | Entry point | First available | Complete by |
|---|---|---|---|---|
| 1. Local build | Binaries and bundles on a developer machine | `make build` | Sprint 0 | Sprint 8 |
| 2. Local deploy | A running stack on one machine, native or Compose | `make dev`, `make up` | Sprint 0 | Sprint 7 |
| 3. OCI containerization | Signed multi-arch images and OCI artifacts in GHCR | `make image`, `make image-push` | Sprint 0 (skeleton) | Sprint 6 |
| 4. Helm on Kubernetes | The chart, installed on a local or remote cluster | `make kind-up`, `make helm-install` | Sprint 3 (minimal chart) | Sprint 11 |

**Rule:** the build and deployment paths are built incrementally from Sprint 0, not bolted on at the end. From Sprint 3 onward, every sprint gate includes "image builds, chart installs on kind, smoke suite passes against it".

### Single entry point: the Makefile

A root `Makefile` is the only documented way to build and deploy. Scripts under `scripts/` do the work; the Makefile names it. `make help` lists every target with a one-line description.

```
Build
  make setup            install toolchains and dependencies, fetch test models
  make build            build everything (debug)
  make build-release    build everything (release profile)
  make build-gateway    cargo build -p yuyin-gateway --release
  make build-console    bun run --cwd apps/console build
  make build-docs       bun run --cwd apps/docs build
  make build-sdk        build TypeScript and Python SDK packages
  make build-cli        bun build --compile for the host platform -> dist/cli/yuyin
  make build-mcp        build the MCP server package
  make build-wasm       build yuyin-count-wasm for the console
  make models           scripts/fetch-models.sh with checksum verification

Verify
  make lint  make type-check  make test  make golden  make e2e  make bench
  make check            lint + type-check + test + check-versions (what CI runs)

Local deploy
  make dev              native: Postgres, Valkey, stripe-mock in Compose; gateway and console on the host with reload
  make run-selfhost     native: release gateway in self-host mode with a dev licence
  make up               full stack in containers from locally built images
  make down             stop and remove the Compose stack
  make logs             follow logs
  make smoke            run tests/smoke against whatever is running (URL from YUYIN_SMOKE_URL)

Containers (OCI)
  make image            build all images for the host architecture, load into the local daemon
  make image-multiarch  buildx build linux/amd64 + linux/arm64 (no load)
  make image-push       push multi-arch images, sign, attach SBOM and provenance
  make image-scan       vulnerability scan, fail on high or critical
  make models-artifact  package models as an OCI artifact and push

Kubernetes (Helm)
  make helm-lint        helm lint + template with every values profile + schema validation
  make helm-package     package the chart and push it to GHCR as an OCI artifact
  make kind-up          create a local kind cluster with ingress and metrics
  make kind-load        load locally built images into kind
  make helm-install     helm upgrade --install into the current kube context
  make helm-test        helm test + smoke suite through the ingress
  make helm-uninstall   remove the release
  make kind-down        delete the local cluster
```

Variables: `VERSION` (defaults to the `VERSION` file), `REGISTRY` (defaults to `ghcr.io/serverless-ventures`), `PLATFORMS` (defaults to `linux/amd64,linux/arm64`), `ENGINE` (`fake` or `onnx`), `NAMESPACE` (defaults to `yuyin`), `VALUES` (defaults to `values-kind.yaml`).

### Path 1: Local build

**Prerequisites** (checked by `make setup`, which prints what is missing and never installs system packages without being asked):

```
Rust        version from rust-toolchain.toml, plus cargo-chef, cargo-deny, cargo-tarpaulin
Bun         current stable
Python      3.10+ (SDK only)
C toolchain cc, cmake, pkg-config (for libopus and ONNX Runtime bindings)
Docker      with buildx (paths 2 to 4)
kubectl, helm, kind  (path 4)
cosign, syft, oras   (image-push and models-artifact only)
```

**Build outputs:**

| Component | Command | Output |
|---|---|---|
| Gateway | `make build-gateway` | `target/release/yuyin-gateway` |
| Console | `make build-console` | `apps/console/.next` (standalone output enabled) |
| Docs | `make build-docs` | `apps/docs/dist` |
| TypeScript SDK | `make build-sdk` | `packages/sdk-ts/dist` |
| Python SDK | `make build-sdk` | `packages/sdk-python/dist/*.whl` |
| CLI | `make build-cli` | `dist/cli/yuyin` (host), `make build-cli-all` for all targets |
| MCP server | `make build-mcp` | `packages/mcp/dist` |
| Self-host tarball | `make dist-selfhost` | `dist/yuyin-selfhost-{version}-linux-{arch}.tar.gz` with checksums |

Requirements:

- A clean clone builds with `make setup && make build` and nothing else. CI proves this in a fresh container on every PR to `staging`.
- Release builds are reproducible within one toolchain: `--locked`, `SOURCE_DATE_EPOCH` set from the commit, no timestamps embedded. A CI job builds the gateway twice and compares hashes.
- The gateway links statically where licences allow (musl target for the self-host tarball). Record how libopus and ONNX Runtime are linked in an ADR.
- The binary reports its version and commit: `yuyin-gateway --version` prints `VERSION` and the git SHA.

### Path 2: Local deploy

Three ways to run locally, from fastest feedback to closest to production.

**2a. Native development (`make dev`).** Backing services run in Compose (`deploy/compose/docker-compose.dev.yml`: Postgres, Valkey, stripe-mock). The gateway runs on the host with `cargo watch`, the console with `bun dev`. `ENGINE=fake` by default so no models are needed. `ENGINE=onnx make dev` uses real models from `./models`.

```bash
make setup
cp .env.development.example .env.development
make dev
# gateway  http://127.0.0.1:8080   console  http://127.0.0.1:3000
curl -N http://127.0.0.1:8080/v1/speech \
  -H "Authorization: Bearer $YUYIN_DEV_API_KEY" -H "Content-Type: application/json" \
  -d '{"text":"नमस्ते, your OTP is 4512.","voice":"dev"}' --output out.ogg
```

**2b. Native self-host binary (`make run-selfhost`).** Builds the release gateway, generates a dev licence signed with a throwaway key, creates a local key, and starts the binary bound to `127.0.0.1`. This is what a customer runs on a single machine. A systemd unit (`deploy/systemd/yuyin-gateway.service`) and an install script are included in the tarball:

```bash
tar xzf yuyin-selfhost-<version>-linux-amd64.tar.gz && cd yuyin-selfhost-<version>
sudo ./install.sh --licence ./licence.json     # installs binary, models, unit; does not open any port beyond 127.0.0.1
sudo systemctl enable --now yuyin-gateway
yuyin-gateway admin keys create --name first
yuyin-gateway healthcheck
```

**2c. Compose (`make up`).** Runs the stack entirely from the OCI images built in path 3, so it tests the images, not the working tree.

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Backing services only, for `make dev` |
| `docker-compose.local.yml` | Full hosted-mode stack from local images: gateway, console, Postgres, Valkey, stripe-mock, with health checks and a one-shot model verifier |
| `docker-compose.selfhost.yml` | Self-host mode: gateway only, licence as a secret, read-only root filesystem |
| `docker-compose.prod.yml` | Single-node production: images pinned by digest, resource limits, internal network, reverse proxy, log rotation |

Every service has a health check, `depends_on` uses `condition: service_healthy`, and the gateway has `stop_grace_period: 150s` so the drain behaviour is the same as on Kubernetes.

**Verification for every local path:** `make smoke` runs `tests/smoke/` against the running stack and exits non-zero on any failure. It is the same suite used after a Helm install.

### Path 3: OCI containerization

**Images** (all OCI image format, all multi-arch `linux/amd64` and `linux/arm64`):

| Image | Dockerfile | Base | Contents |
|---|---|---|---|
| `yuyin-gateway` | `deploy/docker/Dockerfile.gateway` | distroless `cc` or `static`, pinned by digest | Gateway binary, default models, licences |
| `yuyin-gateway-slim` | same file, `--target slim` | same | Gateway binary only; models come from a volume or OCI artifact |
| `yuyin-console` | `deploy/docker/Dockerfile.console` | distroless Node, pinned by digest | Next.js standalone output (for clusters that do not use Vercel) |
| `yuyin-mcp` | `deploy/docker/Dockerfile.mcp` | distroless, pinned by digest | MCP server |

**Other OCI artifacts in GHCR:**

| Artifact | Reference | How |
|---|---|---|
| Helm chart | `oci://ghcr.io/serverless-ventures/charts/yuyin` | `helm push` |
| Model bundle | `ghcr.io/serverless-ventures/yuyin-models:<models-version>` | `oras push` with a manifest of file checksums |
| SBOM and provenance | attached to each image digest | `cosign attest`, buildx attestations |

**Gateway Dockerfile (shape to follow; verify base image tags and tool versions at implementation time):**

```dockerfile
# syntax=docker/dockerfile:1
ARG RUST_VERSION
FROM --platform=$BUILDPLATFORM rust:${RUST_VERSION}-bookworm AS chef
RUN cargo install cargo-chef --locked
WORKDIR /src

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
ARG TARGETARCH
COPY --from=planner /src/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo chef cook --release --locked --recipe-path recipe.json -p yuyin-gateway
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo build --release --locked -p yuyin-gateway

FROM scratch AS models
COPY models/ /models/
COPY config/models.sha256 /models/MANIFEST.sha256

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:<pin> AS slim
ARG VERSION REVISION CREATED
LABEL org.opencontainers.image.title="yuyin-gateway" \
      org.opencontainers.image.description="Streaming text-to-speech gateway" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      org.opencontainers.image.source="https://github.com/serverless-ventures/yuyin-tts" \
      org.opencontainers.image.vendor="Serverless Ventures LLC" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"
COPY --from=builder /src/target/release/yuyin-gateway /yuyin-gateway
COPY THIRD_PARTY_LICENSES.md EULA.md /licenses/
USER 65532:65532
EXPOSE 8080 9090
ENTRYPOINT ["/yuyin-gateway"]
CMD ["serve"]

FROM slim AS full
COPY --from=models /models /models
ENV YUYIN_MODEL_DIR=/models
```

Cross-compilation note: decide between native builds on per-architecture runners (simplest, preferred if ARM runners are available) and cross-compiling from `$BUILDPLATFORM`. Do not use QEMU emulation for the Rust build; it is too slow. Record the choice in an ADR.

**Image requirements (each is a CI check):**

- Runs as non-root with a read-only root filesystem and no shell
- Health check without a shell: `yuyin-gateway healthcheck` subcommand
- All OCI annotation labels above are present and match `VERSION` and the commit
- Base images pinned by digest and updated by Dependabot
- No secrets, `.env` files, or licence files in any layer (`.dockerignore` plus a layer scan)
- Models layer is separate from the binary layer so a code change does not re-push models
- Image size budget recorded in `docs/ARCHITECTURE.md`; CI warns on 10% growth
- `make image-scan` clean of high and critical findings

**Tagging:**

```
:<version>            immutable, e.g. 1.0.0        (release.yml on signed tag)
:<major>.<minor>      moving, e.g. 1.0
:sha-<short-sha>      every merge to develop and staging
:staging              moving, latest staging build
Deployments reference images by digest, never by a moving tag.
```

**Build, sign, push (what `make image-push` and `release.yml` run):**

```bash
docker buildx build --platform "$PLATFORMS" \
  --target full -f deploy/docker/Dockerfile.gateway \
  --build-arg VERSION="$VERSION" --build-arg REVISION="$(git rev-parse HEAD)" \
  --build-arg CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --provenance=mode=max --sbom=true \
  -t "$REGISTRY/yuyin-gateway:$VERSION" --push .

DIGEST=$(docker buildx imagetools inspect "$REGISTRY/yuyin-gateway:$VERSION" --format '{{.Manifest.Digest}}')
cosign sign --yes "$REGISTRY/yuyin-gateway@$DIGEST"                 # keyless, GitHub OIDC
syft "$REGISTRY/yuyin-gateway@$DIGEST" -o spdx-json > sbom.spdx.json
cosign attest --yes --predicate sbom.spdx.json --type spdxjson "$REGISTRY/yuyin-gateway@$DIGEST"

oras push "$REGISTRY/yuyin-models:$MODELS_VERSION" \
  --artifact-type application/vnd.yuyin.models.v1 models/:application/vnd.oci.image.layer.v1.tar

helm package deploy/helm/yuyin --version "$VERSION" --app-version "$VERSION"
helm push "yuyin-$VERSION.tgz" "oci://$REGISTRY/charts"
cosign sign --yes "$REGISTRY/charts/yuyin@$(...chart digest...)"
```

Pushing to GHCR from a developer machine is allowed only for `:sha-` tags in a personal namespace. Version tags are pushed only by `release.yml`.

**Verification a consumer can run:**

```bash
cosign verify ghcr.io/serverless-ventures/yuyin-gateway:1.0.0 \
  --certificate-identity-regexp 'https://github.com/serverless-ventures/yuyin-tts/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

### Path 4: Helm chart on Kubernetes

**Chart layout:**

```
deploy/helm/yuyin/
├── Chart.yaml                  # version and appVersion derive from VERSION
├── values.yaml                 # documented defaults
├── values.schema.json          # every value typed and validated
├── values-kind.yaml            # local cluster, FakeEngine, 1 replica
├── values-hosted.yaml          # AWS hosted mode
├── values-selfhost.yaml        # customer cluster, no egress
├── values-k3s-arm64.yaml       # two-node ARM64 k3s with Cilium
├── README.md                   # generated from values.yaml comments (helm-docs)
└── templates/
    ├── _helpers.tpl
    ├── deployment-gateway.yaml
    ├── service-gateway.yaml
    ├── service-metrics.yaml
    ├── ingress.yaml
    ├── hpa.yaml                # or KEDA ScaledObject, per ADR
    ├── pdb.yaml
    ├── configmap.yaml          # pricing, limits, capacity, voices, policy patterns
    ├── secret.yaml             # only when existingSecret is not set
    ├── externalsecret.yaml     # optional, External Secrets Operator
    ├── serviceaccount.yaml
    ├── networkpolicy.yaml
    ├── servicemonitor.yaml     # optional, Prometheus Operator
    ├── statefulset-valkey.yaml # optional in-cluster cache
    ├── deployment-console.yaml # optional, when not using Vercel
    ├── job-migrate.yaml        # pre-install, pre-upgrade hook (hosted mode)
    ├── NOTES.txt
    └── tests/
        ├── test-health.yaml
        └── test-synthesis.yaml
```

**Key values (seed for `values.yaml`):**

```yaml
mode: hosted                       # hosted | selfhost
image:
  repository: ghcr.io/serverless-ventures/yuyin-gateway
  digest: ""                       # required in hosted and selfhost profiles
  tag: ""                          # dev convenience only
  pullPolicy: IfNotPresent
imagePullSecrets: []
replicaCount: 2
engine: onnx                       # onnx | fake
workerThreads: 4                   # CPU request and limit are set equal to this
capacityStreams: null              # null = read from capacity ConfigMap for the node class
drainTimeoutSeconds: 120
models:
  source: image                    # image | ociArtifact | pvc
  ociArtifact: { reference: "", pullSecret: "" }
  pvc: { existingClaim: "", size: 10Gi, storageClass: "" }
resources:
  requests: { cpu: "4", memory: 2Gi }
  limits:   { cpu: "4", memory: 2Gi }
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 20
  targetStreamUtilization: 0.6
  scaleDownStabilizationSeconds: 300
ingress:
  enabled: true
  className: ""
  host: ""
  tls: { secretName: "" }
  annotations: {}                  # presets documented for AWS ALB and NGINX
  proxyTimeoutSeconds: 660
database: { existingSecret: "", urlKey: url }
redis:    { existingSecret: "", urlKey: url, inCluster: false }
licence:  { existingSecret: "", key: licence.json }   # selfhost only
networkPolicy: { enabled: true, allowEgressCidrs: [] }
metrics: { serviceMonitor: { enabled: false } }
podSecurityContext: { runAsNonRoot: true, runAsUser: 65532, fsGroup: 65532, seccompProfile: { type: RuntimeDefault } }
securityContext: { readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }
nodeSelector: {}
tolerations: []
topologySpreadConstraints: []      # default template spreads across zones
```

Chart rules:

- No secret values in `values.yaml` or any committed values file. Secrets come from `existingSecret` or External Secrets.
- `values.schema.json` rejects a hosted or self-host install without an image digest.
- Config changes roll pods through a checksum annotation on the Deployment.
- Rolling update `maxUnavailable: 0`, `maxSurge: 25%`, `terminationGracePeriodSeconds: 150`, `preStop` sleep 5, startup probe allowing 60 s for model warmup.
- Database migrations run as a pre-install and pre-upgrade hook Job with a backoff limit and a deadline, hosted mode only.
- No GPU resources anywhere in the chart. The serving path is CPU-only.

**Local Kubernetes deploy (the loop every developer and CI job uses):**

```bash
make kind-up                       # kind cluster + ingress-nginx + metrics-server
make image ENGINE=fake             # build local images
make kind-load                     # load them into kind
make helm-install VALUES=values-kind.yaml
make helm-test                     # helm test, then smoke suite through the ingress
kubectl -n yuyin get pods
curl -N http://yuyin.localtest.me/v1/speech -H "Authorization: Bearer $YUYIN_DEV_API_KEY" \
  -H "Content-Type: application/json" -d '{"text":"hello","voice":"dev"}' --output out.ogg
make kind-down
```

**Remote cluster install from the OCI chart:**

```bash
kubectl create namespace yuyin
kubectl -n yuyin create secret generic yuyin-db    --from-literal=url="$YUYIN_DATABASE_URL"
kubectl -n yuyin create secret generic yuyin-redis --from-literal=url="$YUYIN_REDIS_URL"

helm upgrade --install yuyin oci://ghcr.io/serverless-ventures/charts/yuyin \
  --version 1.0.0 --namespace yuyin \
  -f values-hosted.yaml \
  --set image.digest=sha256:<digest> \
  --set ingress.host=api.getyuyin.com \
  --atomic --wait --timeout 10m

helm test yuyin -n yuyin
helm history yuyin -n yuyin
helm rollback yuyin <revision> -n yuyin --wait      # rollback
```

Self-host cluster install differs only in the values profile and a licence secret:

```bash
kubectl -n yuyin create secret generic yuyin-licence --from-file=licence.json
helm upgrade --install yuyin oci://ghcr.io/serverless-ventures/charts/yuyin \
  --version 1.0.0 -n yuyin -f values-selfhost.yaml --set image.digest=sha256:<digest> --atomic --wait
```

Air-gapped clusters: `scripts/airgap-bundle.sh` produces a tarball of the images (`oras copy` or `docker save`), the chart, and the model artifact, plus a script that loads them into a private registry. Documented in `docs/DEPLOYMENT.md`.

**Chart verification (CI, every PR that touches `deploy/` or the gateway):**

1. `helm lint` and `helm template` with every values profile, output validated with `kubeconform`
2. `values.schema.json` negative tests (missing digest, bad mode)
3. kind job: install with `values-kind.yaml`, `helm test`, smoke suite
4. kind job: start 20 long streams, `helm upgrade` to a new image, assert zero cut streams
5. kind job: `helm rollback`, smoke suite again
6. `helm-docs` output is up to date

### CI and CD pipeline map

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | every PR | `make check`, image build for both architectures (no push), `make helm-lint` |
| `kind.yml` | PRs touching `deploy/` or `crates/`, and all PRs to `staging` | chart verification steps 3 to 5 |
| `deploy-staging.yml` | merge to `staging` | push `:sha-` and `:staging` images, sign, `helm upgrade` staging by digest, smoke suite |
| `release.yml` | signed `v*` tag | multi-arch images, SBOM, provenance, cosign, model artifact, OCI chart, CLI binaries, self-host tarball, GitHub Release |
| production deploy | owner, manually | `helm upgrade` by digest with canary, as in the Release Checklist |

### Where this is built in the sprint plan

| Sprint | Build and deployment work |
|---|---|
| 0 | Makefile, `make setup/build/check/dev`, Dockerfile skeletons, CI builds images |
| 3 | Real gateway image, `healthcheck` subcommand, minimal Helm chart, kind install in CI |
| 4 | Migration hook Job, Compose local stack with Postgres and Valkey |
| 6 | Signed multi-arch images, SBOM, staging deploy by digest, Terraform |
| 7 | Self-host binary, tarball, systemd unit, `docker-compose.selfhost.yml` |
| 8 | CLI binaries for all platforms |
| 11 | Chart completed: HPA, NetworkPolicy, all values profiles, OCI chart push, air-gap bundle, deployment docs |

---

## Dependency Versions

Verify the latest stable release of every dependency at implementation time and pin it. The constraints below are starting points, not instructions to use an old version. Record the chosen versions in `docs/ARCHITECTURE.md`.

### Rust

```toml
tokio            = { version = "1", features = ["rt-multi-thread", "macros", "signal", "sync", "time"] }
axum             = { version = "0.8", features = ["ws", "http2"] }   # or current stable
tower            = "0.5"
tower-http       = { version = "0.6", features = ["trace", "limit", "timeout", "cors"] }
hyper            = "1"
serde            = { version = "1", features = ["derive"] }
serde_json       = "1"
thiserror        = "2"
anyhow           = "1"
tracing          = "0.1"
tracing-subscriber = "0.3"
opentelemetry    = "*"     # pin current stable set together with its otlp and tracing crates
metrics / prometheus exporter = "*"   # pick one, record in ADR
sqlx             = { version = "0.8", features = ["postgres", "runtime-tokio", "tls-rustls", "macros", "migrate", "uuid", "time"] }
redis            = { version = "*", features = ["tokio-comp", "script", "connection-manager"] }
ort              = "2"     # ONNX Runtime bindings, only if ADR-015 selects direct ort
sherpa-onnx bindings = "*" # only if ADR-015 selects it
audiopus or opus = "*"     # libopus bindings; check licence and static linking
ogg              = "*"
rubato           = "*"     # resampling, if needed
unicode-normalization = "0.1"
unicode-segmentation  = "1"
sha2             = "0.10"
subtle           = "2"     # constant-time compare
ed25519-dalek    = "2"     # self-host licence verification
uuid             = { version = "1", features = ["v7"] }
time             = "0.3"
clap             = { version = "4", features = ["derive", "env"] }
proptest         = "1"     # dev
criterion        = "*"     # dev
wiremock         = "*"     # dev
```

### TypeScript

```json
{
  "next": "current stable",
  "react": "current stable",
  "typescript": "^5",
  "tailwindcss": "current stable",
  "@clerk/nextjs": "current stable",
  "stripe": "current stable",
  "zod": "current stable",
  "zustand": "^5",
  "@niledatabase/server": "current stable",
  "@modelcontextprotocol/sdk": "current stable",
  "vitest": "current stable",
  "@playwright/test": "current stable",
  "eslint": "^9",
  "openapi-typescript": "current stable"
}
```

### Python

```
httpx >= 0.27, websockets >= 13, pytest, pytest-asyncio, ruff, mypy
```

Before adding any dependency not listed here: check its licence against the allowlist, check its maintenance status, and add a line to the ARCHITECTURE decision log.

---

## Out of Scope for v1

Create one GitHub issue with the `enhancement` label for each item.

| Item | Why deferred |
|---|---|
| Speech-to-text | Separate product line. Needs its own models, data, and evaluation |
| Voice agent (STT + LLM + TTS loop, telephony) | Depends on speech-to-text. Large surface |
| Tamil, Telugu, Marathi, Bengali, Kannada and other Indic languages | Each needs a normaliser, a golden corpus, and a licence-clean voice |
| 8 kHz mu-law and A-law output for telephony | Small, likely first v1.1 item once a telephony customer asks |
| SSML and inline prosody tags | Needs a stable normaliser first |
| Word and viseme timestamps | Engine dependent |
| Training our own acoustic model | Research effort. The engine trait is the seam for it |
| Automated custom voice training pipeline | v1 has intake and consent. Training is an operator runbook until volume justifies automation |
| Razorpay, UPI, and INR pricing with GST invoices | Needs an Indian entity or a partner arrangement. The `PaymentProvider` interface is the seam |
| Postpaid invoicing and volume contracts | Sales motion, not product, for now |
| Multi-region active-active | Region is configuration. Add a second region when latency data from customers says so |
| SOC 2, ISO 27001 | Start evidence collection after launch |
| Hindi console localisation | Strings are already externalised |
| Batch and long-form synthesis API (audiobooks) | Different latency and pricing profile |
| Go, Java, and other SDKs | After the OpenAPI file has been stable for a quarter |
| Audio watermarking of output | Evaluate robust options for provenance after v1 |

---

## README Template

```markdown
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

    curl -N https://api.getyuyin.com/v1/speech \
      -H "Authorization: Bearer $YUYIN_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"text":"आपकी EMI ₹12,450 है, due date 05/12/2026.","voice":"<voice-id>"}' \
      --output out.ogg

## Repository layout
(see Appendix B of the build prompt, keep in sync with AGENTS.md)

## Development

    make setup && make build       # local build
    make dev                       # local deploy: Postgres, Valkey, stripe-mock, gateway, console
    make image && make up          # run from OCI images with Compose
    make kind-up && make kind-load && make helm-install   # deploy the Helm chart to a local cluster
    cargo test --workspace         # Rust tests
    bun run test                   # TypeScript tests
    .agent/skills/run-golden/run.sh   # normalisation golden corpus

## Requirements
Rust (see rust-toolchain.toml), Bun, Docker, Python 3.10+ for the Python SDK.

## Documentation
docs/PRD.md, docs/ARCHITECTURE.md, docs/DESIGN.md, docs/SPRINT_PLAN.md, docs/TEST_PLAN.md

## License
Proprietary. Copyright 2026 Serverless Ventures LLC. All rights reserved.
See LICENSE, EULA.md, and THIRD_PARTY_LICENSES.md. Contact: legal@serverlessvc.com
```

---

## Implementation Notes for the Executing Agent

1. Your first action is Step 1: generate all five spec documents. Nothing else comes before it.
2. After Step 1, the spec documents are the source of truth. Update them in the same PR as any behaviour change.
3. Write the failing test first. For normalisation that means adding golden rows before touching the normaliser.
4. Never publish, print, or commit a performance number that the benchmark harness did not produce. If a target in NFR-001 or NFR-002 is missed, record the miss and open a perf issue.
5. Never ship a model or voice whose licence you have not read and recorded. If in doubt, stop and raise a `status: needs-owner` issue.
6. Never copy text, design, voice names, or figures from any other TTS vendor.
7. Never store or log request text or audio. `SensitiveText` exists so this is hard to do by accident.
8. Billing code uses integers only. The ledger is append-only. Reconciliation must be clean before any sprint gate from Sprint 4 onward.
9. A request rejected for capacity or credit never receives an audio byte. A stream in progress is never cut by overload or deploy. These two behaviours have tests that must never be weakened.
10. Owner-only actions (domains, accounts, payments, live keys, publishing, production) are prepared and documented in `docs/OWNER_CHECKLIST.md`, then you stop.
11. Synthesis runs on the worker pool, never on the async runtime.
12. The character counter has one implementation. The console uses its WASM build. Do not reimplement counting in TypeScript.
13. Legal pages are drafts. The review banner stays on until the owner turns it off.
14. Keep the product name behind the three constants so it can be renamed.
15. Sprint gates are hard stops. If a gate item fails, fix it or get a written owner waiver recorded in `docs/RETROSPECTIVES.md`.
16. No em dashes anywhere. No hype words. Hindi and English are equals in examples.
17. Build and deployment are built from Sprint 0. The Makefile is the only documented entry point. From Sprint 3, no gate is green unless the image builds, the chart installs on kind, and the smoke suite passes.
18. When uncertain between two reasonable designs, write a short ADR with both options, pick the simpler one, and move on. When uncertain about money, licences, consent, or security, stop and ask.

---

# Appendices

## Appendix A - Integration Architecture Decision

**Chosen paths:** an MCP server for Goose, OpenCode, Claude Code, and any other MCP-native harness, plus a Pi extension for richer Pi integration. Both are thin clients of the public API through the TypeScript SDK. Neither has privileged access.

| Harness | Integration | Why |
|---|---|---|
| Pi | `@yuyin-tts/pi-extension` built on `pi-agent-core` with TypeBox tool schemas | Slash commands, streaming progress through `onUpdate`, context hook that tells the agent which voices exist |
| Goose | `integrations/goose/toolkit.yaml` pointing at the MCP server | Goose speaks MCP natively |
| OpenCode | Config snippet and README | OpenCode speaks MCP natively, no code needed |
| Claude Code | `.mcp.json` snippet, plus `CLAUDE.md` and `AGENTS.md` for the repo itself | Native |

**MCP tools:**

```
yuyin_speak            text, voice, language?, format?, pace?, output_path?
                        -> writes an audio file, returns path, duration, chars billed
yuyin_list_voices      language?, gender?, style? -> voices
yuyin_normalize        text, language? -> normalised segments (free, for checking how text will be read)
yuyin_status           -> API reachability, balance, grant remaining, default voice
yuyin_recommend_voice  use_case, language -> ranked voice ids with reasons from the registry metadata
yuyin_estimate_cost    text | chars, format -> chars and cost in micro-USD
```

The MCP server reads `YUYIN_API_KEY` from the environment, never from tool arguments, and never returns it. `yuyin_speak` refuses to write outside the working directory unless `YUYIN_MCP_ALLOW_PATHS` permits. Audio is written to a file, not returned inline, to keep model context small.

**Rejected:** embedding the engine inside the MCP server (bloats the package, duplicates the self-host edition), and a harness-specific plugin per tool (MCP already covers them).

---

## Appendix B - Repository Structure

```
yuyin-tts/
├── VERSION
├── CHANGELOG.md
├── LICENSE
├── EULA.md
├── THIRD_PARTY_LICENSES.md
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── SKILLS.md
├── SOUL.md
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
├── Makefile
├── .dockerignore
├── package.json
├── bun.lockb
├── tsconfig.base.json
├── .coverage-thresholds.toml
├── .gitignore
├── .github/
│   ├── workflows/{ci.yml,release.yml,deploy-staging.yml,weekly-fuzz.yml,licence-check.yml}
│   ├── ISSUE_TEMPLATE/{task.md,bug_report.md}
│   ├── pull_request_template.md
│   └── dependabot.yml
├── .agent/
│   └── skills/{run-tests,check-types,run-golden,run-bench}/{SKILL.md,run.sh}
├── api/
│   └── openapi.yaml
├── config/
│   ├── pricing.toml
│   ├── voices.toml
│   ├── capacity.toml
│   ├── limits.toml
│   └── policy-patterns.toml
├── crates/
│   ├── yuyin-text/
│   │   ├── src/{lib.rs,tag.rs,classify.rs,verbalise/,translit.rs,segment.rs,lexicon.rs}
│   │   ├── data/{acronyms.tsv,roman_hindi_lexicon.tsv,hindi_numbers.tsv}
│   │   ├── golden/*.tsv
│   │   └── tests/
│   ├── yuyin-engine/
│   │   └── src/{lib.rs,traits.rs,fake.rs,onnx.rs,registry.rs,pool.rs}
│   ├── yuyin-audio/
│   │   └── src/{lib.rs,opus.rs,ogg.rs,wav.rs,pcm.rs,stretch.rs}
│   ├── yuyin-meter/
│   │   └── src/{lib.rs,count.rs,price.rs,reserve.rs,batcher.rs,lua/}
│   ├── yuyin-licence/
│   │   └── src/{lib.rs,verify.rs,report.rs}
│   ├── yuyin-gateway/
│   │   ├── src/{main.rs,config.rs,auth.rs,admission.rs,drain.rs,rest.rs,ws.rs,voices.rs,usage.rs,metrics.rs,errors.rs}
│   │   └── tests/{integration/,regression/,smoke/}
│   └── yuyin-count-wasm/           # WASM build of count.rs for the console
├── migrations/                      # SQL, single source for gateway and console
├── apps/
│   ├── console/                     # Next.js: (marketing), (console), (operator), api routes
│   │   ├── src/{app/,components/,lib/,store/,messages/}
│   │   └── tests/{unit/,e2e/}
│   └── docs/                        # MDX docs site
├── packages/
│   ├── sdk-ts/
│   ├── sdk-python/
│   ├── cli/
│   └── mcp/
├── integrations/
│   ├── pi/
│   ├── goose/toolkit.yaml
│   └── opencode/README.md
├── bench/
│   ├── METHOD.md
│   ├── corpus/
│   ├── engine-bakeoff/
│   ├── loadgen/
│   └── results/
├── deploy/
│   ├── docker/{Dockerfile.gateway,Dockerfile.console,Dockerfile.mcp}
│   ├── compose/{docker-compose.dev.yml,docker-compose.local.yml,docker-compose.selfhost.yml,docker-compose.prod.yml}
│   ├── helm/yuyin/
│   ├── systemd/yuyin-gateway.service
│   └── terraform/{modules/,envs/stage/,envs/prod/}
├── scripts/
│   ├── dev.sh
│   ├── check-versions.sh
│   ├── bump-version.sh
│   ├── extract-changelog.sh
│   ├── validate-fixtures.sh
│   ├── golden-add.sh
│   ├── listening-sheet.sh
│   └── fetch-models.sh
└── docs/
    ├── PRD.md  ARCHITECTURE.md  DESIGN.md  SPRINT_PLAN.md  TEST_PLAN.md
    ├── RETROSPECTIVES.md  OWNER_CHECKLIST.md  THREAT_MODEL.md  DATA_INVENTORY.md
    ├── adr/
    ├── licences/
    └── runbooks/
```

Model weights are not committed to git. `scripts/fetch-models.sh` downloads them from the sources recorded in ADR-015 into `./models` and verifies checksums. CI caches them. Release images bake them in.

---

## Appendix C - Sprint 7: Self-Host Edition

**Milestone:** Sprint 7: Self-Host Edition | **Duration:** 1 week
**Goal:** The same gateway runs inside a customer network with no outbound connections, gated by a signed licence file. This is the "core extraction" sprint: hosted-only concerns move behind traits so the gateway builds in two modes from one codebase.

| ID | Title | Labels | Size |
|---|---|---|---|
| S7-T01 | Mode split: hosted and selfhost behind traits | refactor, gateway | L |
| S7-T02 | Licence file format, signing tool, verification | feature, selfhost | M |
| S7-T03 | Local key store and admin CLI | feature, selfhost | M |
| S7-T04 | Offline usage report | feature, selfhost | S |
| S7-T05 | No-egress test | test, security | S |
| S7-T06 | Self-host tarball and install doc | docs, selfhost | M |

**S7-T01.** Traits `KeyStore`, `CreditStore`, `UsageSink`. Hosted implementations use Redis and Postgres. Self-host implementations use an embedded SQLite file and treat credit as unlimited within licence limits. `YUYIN_MODE` selects at startup. No `cfg` forks in request handlers.
AC: the full gateway integration suite passes in both modes.

**S7-T02.** Licence is a JSON document (customer, issued, expires, max nodes, max concurrent streams, voices, edition) with a detached Ed25519 signature. The public key is compiled in. The private key lives only in the owner's Secrets Manager. `tools/licence-sign` is an owner-run tool. Expiry behaviour: 14 day grace with a warning log and a header, then refuse new streams, never cut active ones.
AC: tampered, expired, and wrong-key licences are rejected with distinct errors. Clock rollback is detected through a monotonic high-water mark stored locally.

**S7-T03.** `yuyin-gateway admin keys create|list|revoke` operating on the local store. Same key format with prefix `yy_self_`.
AC: e2e test creates a key and synthesises.

**S7-T04.** `yuyin-gateway admin usage-report --month YYYY-MM` writes a signed JSON summary (characters by day, peak concurrency) that the customer can send for true-up. It contains no text and no audio.
AC: report verifies with the public key. Schema documented.

**S7-T05.** Run the self-host binary in a network namespace with no default route. Synthesis, key management, and metrics all work. A second test uses a packet capture to assert zero outbound packets other than to configured peers.
AC: both tests pass in CI.

**S7-T06.** Tarball: static binary (amd64 and arm64), models, sample config, systemd unit, EULA, third-party licences, checksums. `docs/self-hosting.md`: sizing table generated from benchmark results, install, upgrade, backup, troubleshooting.
AC: a fresh VM follows the doc to first audio. Time recorded.

**Sprint 7 gate:**
- [ ] Both modes pass the integration suite
- [ ] Licence verification tests pass
- [ ] No-egress tests pass
- [ ] Tarball installs on a clean VM following the doc only

---

## Appendix D - Sprint 8: CLI

**Milestone:** Sprint 8: CLI | **Duration:** 1 week
**Goal:** `yuyin` as a single self-contained binary built with `bun build --compile`.

| ID | Title | Labels | Size |
|---|---|---|---|
| S8-T01 | CLI skeleton, config, auth | feature, cli | M |
| S8-T02 | `speak` | feature, cli | M |
| S8-T03 | `stream` | feature, cli | M |
| S8-T04 | `voices`, `normalize`, `balance`, `usage` | feature, cli | M |
| S8-T05 | Build matrix and install script | ci, cli | M |
| S8-T06 | CLI docs and shell completions | docs, cli | S |

```
yuyin login                       store API key in the OS keychain (fallback: 0600 config file)
yuyin speak "text" [-v voice] [-l lang] [-f opus|pcm|wav] [-p pace] [-o file | --play]
echo "text" | yuyin speak -o out.ogg
yuyin stream [-v voice] --play    read stdin line by line over WebSocket, speak as lines arrive
yuyin voices [--language hi] [--json]
yuyin normalize "text" [--json]
yuyin balance
yuyin usage [--from --to --group-by]
yuyin config get|set
yuyin --version
```

- `--play` uses the platform audio player (`afplay`, `aplay` or `paplay`, PowerShell) with a clear message if none is found. No bundled audio stack.
- `--json` on every read command. Exit codes: 0 ok, 2 usage error, 3 auth, 4 insufficient credits, 5 at capacity, 6 network.
- Never prints the API key. `yuyin config get api_key` prints the prefix only.
- No telemetry. No update check unless `yuyin update --check` is run.

AC per task: unit tests for argument parsing and error mapping, integration tests against the local gateway, smoke test on all three OS in the `cli-matrix` job. Binary size and startup time recorded.

**Sprint 8 gate:**
- [ ] All commands work against staging on macOS, Linux, and Windows
- [ ] `echo "नमस्ते" | yuyin speak --play` plays audio
- [ ] Checksums published with the binaries
- [ ] CLI coverage at least 80%

---

## Appendix E - Sprint 9: MCP Server

**Milestone:** Sprint 9: MCP Server | **Duration:** 1 week
**Goal:** `@yuyin-tts/mcp` exposing the tools in Appendix A over stdio and streamable HTTP.

| ID | Title | Labels | Size |
|---|---|---|---|
| S9-T01 | MCP server skeleton and transports | feature, mcp | M |
| S9-T02 | Tools: speak, list_voices, normalize | feature, mcp | M |
| S9-T03 | Tools: status, recommend_voice, estimate_cost | feature, mcp | M |
| S9-T04 | Path safety and limits | security, mcp | S |
| S9-T05 | MCP conformance and contract tests | test, mcp | M |
| S9-T06 | Docker image and docs | docs, mcp | S |

- Tool input schemas are strict and reject unknown fields. Tool descriptions state cost implications ("this call spends credits").
- `yuyin_speak` has a per-call limit of 2,000 code points and a per-session spend limit (`YUYIN_MCP_MAX_CHARS_PER_SESSION`, default 20,000) so a looping agent cannot drain a balance.
- Errors map to MCP tool errors with the API error code preserved.
- Tool results never contain the API key, request text beyond what the caller sent, or raw audio bytes.

AC: tested with the MCP inspector and at least two real clients. Contract tests assert tool schemas match a committed snapshot. Path traversal attempts are rejected.

**Sprint 9 gate:**
- [ ] All six tools work from an MCP client against staging
- [ ] Spend limit proven by test
- [ ] Schema snapshot committed
- [ ] Image signed and published to GHCR (staging tag)

---

## Appendix F - Sprint 10: Harness Integrations

**Milestone:** Sprint 10: Harness Integrations | **Duration:** 1 week
**Goal:** First-class use from Pi, Goose, OpenCode, and Claude Code.

| ID | Title | Labels | Size |
|---|---|---|---|
| S10-T01 | Pi extension | feature, mcp | L |
| S10-T02 | Goose toolkit | feature, mcp | S |
| S10-T03 | OpenCode config and README | docs, mcp | XS |
| S10-T04 | Claude Code config and README | docs, mcp | XS |
| S10-T05 | Harness smoke tests in CI | test, mcp | M |
| S10-T06 | Integration docs page | docs | S |

**S10-T01.** `@yuyin-tts/pi-extension` on `pi-agent-core`: TypeBox schemas mirroring the MCP tools, slash commands `/speak`, `/voices`, `/yuyin-status`, streaming progress through `onUpdate` (characters synthesised, time to first audio), and a context hook that injects the default voice and remaining balance summary at session start. Verify the current `pi-agent-core` and `pi-ai` APIs at implementation time and record versions.
AC: unit tests with a mocked SDK, a recorded session transcript in `integrations/pi/examples/`.

**S10-T02 to S10-T04.** Config files and short READMEs with a copy-paste setup and a first prompt to try.
AC: each README was followed from scratch once and the result recorded in the issue.

**S10-T05.** `harness-smoke-tests` job on staging and release: start the MCP server, call each tool through a scripted MCP client, assert an audio file is produced. Where a harness has a headless mode, run one prompt through it.
AC: job green on staging.

**Sprint 10 gate:**
- [ ] Each harness produced audio from a natural-language prompt, evidence in the issues
- [ ] Smoke job green
- [ ] Integration docs published on staging

---

## Appendix G - Sprint 11: Packaging and Deployment

The Build and Deployment section is the reference for commands, image rules, and chart layout. This sprint completes what Sprints 0, 3, 6, and 7 started.

**Milestone:** Sprint 11: Packaging | **Duration:** 1 week
**Goal:** All three deployment tiers are complete, documented, and tested.

### Tier 1: Local binary (highest priority)

- `yuyin-gateway` static binary for linux/amd64 and linux/arm64 in self-host mode (from Sprint 7)
- `yuyin` CLI binary for macOS, Linux, Windows (from Sprint 8)
- systemd unit, sample config, install doc

### Tier 2: Docker Compose

`deploy/compose/docker-compose.local.yml` (a team sharing one machine):

```yaml
services:
  model-fetch:            # one-shot: verifies or downloads models into the volume, then exits 0
    image: ghcr.io/serverless-ventures/yuyin-gateway:${YUYIN_VERSION}
    command: ["fetch-models", "--verify"]
    volumes: ["models:/models"]
  gateway:
    image: ghcr.io/serverless-ventures/yuyin-gateway:${YUYIN_VERSION}
    depends_on:
      model-fetch: { condition: service_completed_successfully }
    environment:
      YUYIN_MODE: selfhost
      YUYIN_MODEL_DIR: /models
      YUYIN_LICENCE_FILE: /run/secrets/licence
    ports: ["127.0.0.1:8080:8080"]
    volumes: ["models:/models:ro", "data:/var/lib/yuyin"]
    secrets: ["licence"]
    read_only: true
    healthcheck:
      test: ["CMD", "/yuyin-gateway", "healthcheck"]
      interval: 10s
      timeout: 3s
      retries: 6
      start_period: 30s
    stop_grace_period: 150s
volumes: { models: {}, data: {} }
secrets: { licence: { file: ./licence.json } }
```

`docker-compose.prod.yml`: images pinned by digest, CPU and memory limits, `cpuset` pinning guidance, an internal network with only a reverse proxy published, log rotation, no dev services. No GPU passthrough is needed because the serving path is CPU-only. State this in the doc so nobody adds it by habit.

### Tier 3: Kubernetes via Helm

`deploy/helm/yuyin/`:

- **Deployment** `gateway` (stateless): `maxUnavailable: 0`, `maxSurge: 25%`, `terminationGracePeriodSeconds: 150`, `preStop` sleep 5, readiness on `/readyz`, liveness on `/healthz`, startup probe allowing 60 s for model warmup.
- **HPA** on the custom metric `yuyin_active_streams / yuyin_capacity_streams`, target 0.6, scale-down stabilisation 300 s, through the Prometheus adapter or KEDA. Decide and record.
- **PodDisruptionBudget** `maxUnavailable: 1`.
- **Resources:** CPU request equals limit equals worker thread count for Guaranteed QoS. Document the static CPU manager policy as a recommendation for latency.
- **Models:** baked into the image by default. Optional init container that copies models from an OCI artifact or object store into an `emptyDir` or a read-only PVC for air-gapped clusters.
- **StatefulSet** only for optional in-cluster Valkey (for clusters without a managed cache). Postgres is external (Nile) in hosted mode and absent in self-host mode.
- **Ingress:** WebSocket upgrade enabled, proxy read and send timeouts 660 s, request buffering off for `/v1/speech`, body size limit 64k. Examples for AWS ALB and NGINX.
- **NetworkPolicy:** gateway accepts only from the ingress controller and Prometheus. Egress only to cache and database in hosted mode, none in self-host mode.
- **Security context:** non-root, read-only root filesystem, all capabilities dropped, seccomp `RuntimeDefault`.
- **Values profiles:** `values-hosted.yaml`, `values-selfhost.yaml`, `values-k3s-arm64.yaml` (for the existing two-node ARM64 k3s cluster with Cilium, CPU nodes only).

| ID | Title | Labels | Size |
|---|---|---|---|
| S11-T01 | Compose local and prod files | feature, infra | M |
| S11-T02 | Helm chart | feature, infra | L |
| S11-T03 | HPA on stream utilisation | feature, infra | M |
| S11-T04 | k3s ARM64 profile and test | test, infra | M |
| S11-T05 | Chart tests and kind-based CI | test, infra | M |
| S11-T06 | Deployment docs for all three tiers (`docs/DEPLOYMENT.md`) | docs | M |
| S11-T07 | OCI chart and model artifact publishing, chart signing | ci, infra | M |
| S11-T08 | Air-gap bundle | feature, selfhost | M |
| S11-T09 | Chart schema, helm-docs, negative tests | test, infra | S |

AC: `helm lint` and `helm template` with every values profile in CI. A kind cluster job installs the chart with `FakeEngine`, runs the smoke suite, performs a rolling upgrade under load, and asserts zero cut streams. The ARM64 profile is installed once on the real k3s cluster by the owner, and the result is recorded.

**Sprint 11 gate:**
- [ ] Every Makefile target in the Build and Deployment section works as documented
- [ ] Chart installs from `oci://` with an image digest, `helm test` passes, `helm rollback` works
- [ ] Signatures on images and chart verify with `cosign verify`
- [ ] Air-gap bundle installs into a cluster with no registry access to GHCR
- [ ] Compose local file brings up a working self-host stack from a clean machine
- [ ] Helm chart installs with each profile
- [ ] Rolling upgrade under load cuts zero streams in the kind job
- [ ] HPA scales up and down in a staged load test
- [ ] Deployment docs followed from scratch once per tier

---

## Appendix G2 - Sprint 12: Custom Voice Intake

**Milestone:** Sprint 12: Custom Voice Intake | **Duration:** 1 week
**Goal:** A customer can request a branded voice with verifiable consent from the speaker. Training itself is an operator-run offline process described in a runbook, not an automated pipeline.

| ID | Title | Labels | Size |
|---|---|---|---|
| S12-T01 | Consent model and policy | feature, voice-intake, legal | M |
| S12-T02 | Intake form and recording script | feature, voice-intake | M |
| S12-T03 | Secure upload and audio quality checks | feature, voice-intake | L |
| S12-T04 | Operator review queue and status tracking | feature, voice-intake | M |
| S12-T05 | Private voice registration | feature, engine | M |
| S12-T06 | Consent withdrawal | feature, voice-intake | S |
| S12-T07 | Training runbook | docs | M |

**S12-T01.** `consent_records` as in the data model. Consent has three parts: a signed written statement, a spoken consent clip in which the speaker reads a statement containing their name, the customer's name, and a one-time phrase shown on screen, and identity verification by the operator. The Voice Consent Policy explains use, storage, withdrawal, and the ban on imitating other people.
AC: a request cannot leave the `draft` state without all three parts.

**S12-T02.** Form: organization, speaker details, intended use, languages. Generates a recording script of original, phonetically varied sentences in the requested languages sized for about 30 minutes of speech, plus recording guidance (quiet room, 48 kHz, 24-bit, pop filter, consistent distance).
AC: script covers the phoneme inventory of each requested language, checked by a coverage test.

**S12-T03.** Direct-to-S3 multipart upload with presigned URLs into a KMS-encrypted, Object Lock bucket. Automated checks: format, sample rate, duration, clipping, noise floor, silence ratio, and a speaker consistency check between the consent clip and the recordings. Failures are reported per file with a plain explanation.
AC: fixtures for each failure class are detected. No audio is readable by other tenants (isolation test).

**S12-T04.** Operator queue with states `submitted`, `consent_verified`, `in_training`, `review`, `ready`, `rejected`, `withdrawn`. The customer sees status and messages in the console.
AC: every state change is audited and emails the requester.

**S12-T05.** A trained voice is registered as `visibility: private` with `owner_tenant_id`. Only that tenant's keys can use or list it. Self-host licences can include private voices.
AC: another tenant gets 422 `unknown_voice` for the id, identical to a nonexistent id.

**S12-T06.** The speaker or the customer can withdraw. The voice is disabled, requests return 422, the event is audited, and the retention schedule for recordings starts.
AC: withdrawal takes effect fleet-wide within 10 s through the same channel as key revocation.

**S12-T07.** `docs/runbooks/custom-voice-training.md`: data preparation, fine-tuning procedure for the engine chosen in ADR-015 on the owner's GPU cluster, export to the serving format, objective checks, the listening sheet, registration, and rollback. Written to be followed by a person. It does not claim a turnaround time until one has been measured.
AC: runbook reviewed by the owner.

**Sprint 12 gate:**
- [ ] End-to-end intake with fixtures: draft to ready to withdrawn
- [ ] Consent cannot be bypassed (tests)
- [ ] Private voice isolation proven
- [ ] Runbook reviewed

---

## Appendix H - Complete Sprint Overview

| Sprint | Name | Duration | Goal | Tag |
|---|---|---|---|---|
| 0 | Scaffold | 1 week | Monorepo, CI, agent files, spec docs | `sprint-0-complete` |
| 1 | Backend Foundations | 1 week | Text front-end, golden corpus, engine choice | `sprint-1-complete` |
| 2 | UI Shell | 1 week | Design system, all screens on mock data | `sprint-2-complete` |
| 3 | Core Feature | 2 weeks | Streaming synthesis over REST and WebSocket | `sprint-3-complete` |
| 4 | Secondary Feature | 1 week | Accounts, keys, metering, credits | `sprint-4-complete` |
| 5 | Tertiary Feature | 1 week | Playground, docs, SDKs, benchmarks page | `sprint-5-complete` |
| 6 | Release | 1 week | Infra, security, operator tools, v1.0.0 | `v1.0.0` |
| 7 | Self-Host Edition | 1 week | Licensed single-binary edition | `v1.1.0` |
| 8 | CLI | 1 week | `yuyin` binary | `v1.2.0` |
| 9 | MCP Server | 1 week | Six MCP tools | `v1.3.0` |
| 10 | Harness Integrations | 1 week | Pi, Goose, OpenCode, Claude Code | `v1.4.0` |
| 11 | Packaging | 1 week | Compose, Helm, k3s | `v1.5.0` |
| 12 | Custom Voice Intake | 1 week | Consent, upload, review queue | `v1.6.0` |

Total: 14 weeks. The hosted API is launchable after Sprint 6. Sprints 7 to 12 can be reordered by the owner. If a bank or insurer asks for on-premise first, run 7 and 11 before 8 to 10.

Dependency notes: Sprint 3 needs ADR-015 from Sprint 1. Sprint 4 needs the gateway from Sprint 3. Sprint 5 needs keys from Sprint 4. Sprints 8, 9, and 10 need the TypeScript SDK from Sprint 5. Sprint 11 needs Sprint 7. Sprint 12 needs the operator console from Sprint 6.

---

## Appendix I - Modularity Principles

1. **The text front-end is pure.** `yuyin-text` has no I/O, no async, no global state. It could be compiled to WASM and shipped to a browser unchanged.
2. **The engine is replaceable.** Nothing above `yuyin-engine` knows which model is running. A second engine must be addable without touching the gateway.
3. **One counter.** Character counting exists once. Everything else imports it.
4. **One contract.** `api/openapi.yaml` generates SDK types, docs, mock servers, and contract tests. Hand-written duplicates are a bug.
5. **Control plane and data plane share only the database schema and the cache protocol.** The console never calls the gateway's internals. The gateway never calls Clerk or Stripe.
6. **Mode by trait, not by fork.** Hosted and self-host differ only in the implementations bound at startup.
7. **Clients are thin.** CLI, MCP server, and Pi extension depend on the TypeScript SDK and contain no protocol logic of their own.
8. **Config over code for anything a customer or operator may tune:** prices, limits, capacity, voices, policy patterns.
9. **Dependency direction:** `gateway -> meter, engine, audio, text, licence`. Never the reverse. A CI check enforces it with `cargo deny` bans or `cargo-modules`.
10. **Every seam named in Out of Scope has an interface today:** `PaymentProvider`, `SynthesisEngine`, the output format enum, the language enum.

---

## Appendix J - Test Infrastructure and Agent Files

### Test types

| Type | When | Runner | Location |
|---|---|---|---|
| Unit | Pure logic, no I/O, no network | cargo test, vitest, pytest | `tests/unit/` or inline |
| Golden | Normalisation corpus | cargo test | `crates/yuyin-text/golden/` |
| Property | Invariants over random input | proptest, fast-check | alongside unit tests |
| Integration | Real Postgres, Valkey, stripe-mock | cargo test --ignored, vitest | `tests/integration/` |
| Contract | OpenAPI conformance, SDK drift, MCP schemas | custom, vitest | `tests/contract/` |
| Smoke | Minimal end-to-end sanity | shell scripts | `tests/smoke/` |
| E2E | Full user flow through the UI | Playwright | `apps/console/tests/e2e/` |
| Load and soak | Capacity and stability | `bench/loadgen` | `bench/` |
| Regression | Every fixed bug gets one | cargo test, vitest | `tests/regression/` |
| Listening | Human judgement of audio | score sheet | `out/listening/` |

### Naming convention

```
Unit:        test_{module}_{function}_{scenario}_{expected_outcome}
Golden:      golden_{lang}_{class}_{id}
Integration: it_{component}_{operation}_{scenario}
Contract:    contract_{surface}_{operation}
Smoke:       smoke_{feature}_{minimal_assertion}
E2E:         e2e_{user_story_id}_{scenario}
Regression:  regression_{gh_issue_number}_{what_was_broken}
```

### Regression test lifecycle

```
Bug reported -> GitHub issue created (type: bug label)
      |
Reproduction confirmed -> regression test written (FAILS)
      |
Fix implemented -> regression test passes
      |
PR opened: regression test + fix in same commit
      |
PR merged -> issue closed -> test runs in CI forever
```

Regression tests are never deleted. A wrong reading reported by a customer becomes a golden row and a regression test.

### Fixtures

- `scripts/validate-fixtures.sh` starts the mock API server generated from `api/openapi.yaml` and fails if any SDK or MCP test fixture does not match the response shapes.
- Audio fixtures are generated by `FakeEngine` and are deterministic. Real-engine audio is never compared byte for byte, only by duration, sample rate, and decodability.
- A tiny test voice model (or `FakeEngine`) is used in CI. The real models are used in the nightly job and on staging.

### Smoke checklist (staging, every sprint end from Sprint 3)

```
[ ] /healthz and /readyz return 200
[ ] REST: Hindi sentence -> playable Opus, first bytes arrive before the last
[ ] REST: Hinglish sentence with ₹ amount, date, OTP -> correct reading by ear
[ ] REST: en-US and en-IN sentences, pace 0.5 and 2.0
[ ] REST: PCM and WAV decode
[ ] WebSocket: word-by-word text -> continuous audio
[ ] Invalid key -> 401. Zero balance -> 402. Unknown voice -> 422
[ ] Capacity forced to 1 -> second request 503 with Retry-After, first completes
[ ] Console: sign in, create key, revoke key, key rejected within 10 s
[ ] Console: test-mode top-up reflects in balance
[ ] Usage view matches requests just made
[ ] Rolling restart during a 60 s stream -> stream completes
```

### `.gitignore` (required sections)

Rust (`target/`, `*.rs.bk`), TypeScript (`node_modules/`, `dist/`, `.next/`, `*.tsbuildinfo`), Bun (`.bun/`, with `bun.lockb` committed), Python (`__pycache__/`, `.venv/`, `*.egg-info/`), environment (`.env`, `.env.*` with `.env.*.example` committed), test and coverage (`coverage/`, `playwright-report/`, `tarpaulin-report.html`), models and audio (`models/`, `out/`, `*.onnx`, `*.ogg`, `*.wav` outside `tests/fixtures/`), database (`*.db`, `*.db-shm`, `*.db-wal`, with migrations committed), Terraform (`.terraform/`, `*.tfstate*`), agent sessions (`.pi/sessions/`, `.agent/sessions/`, `CLAUDE.local.md`), OS (`.DS_Store`, `Thumbs.db`), editors (`.vscode/settings.json`, `.idea/`), secrets (`licence.json`, `*.pem`, `*.key`). `Cargo.lock` and `bun.lockb` are tracked.

### `AGENTS.md` must contain

- Product name and one-line description
- Copy-pasteable commands: build, run the dev stack, test (all, Rust, TypeScript, Python, golden, e2e), lint, type-check, benchmarks
- Repository structure (ASCII tree, kept in sync with Appendix B)
- Code style rules for Rust, TypeScript, and Python
- Rules as imperatives:
  - ALWAYS add golden rows before changing the normaliser
  - ALWAYS update the spec doc in the same PR as a behaviour change
  - ALWAYS use `MicroUsd` and `Chars` newtypes in billing code
  - ALWAYS run synthesis on the worker pool
  - NEVER log or store request text or audio
  - NEVER hand-edit `config/capacity.toml` or any published benchmark number
  - NEVER add a model, voice, or dataset without a recorded licence
  - NEVER commit model weights, secrets, or licence files
  - NEVER weaken the capacity, drain, or isolation tests
  - NEVER perform owner-only actions
- Versioning: `VERSION` is the single source of truth, run `scripts/check-versions.sh`
- Boundaries: directories the agent must not modify without an explicit task (`migrations/` once applied, `docs/licences/`, `deploy/terraform/envs/prod/`)

### `CLAUDE.md` must contain

- `@import AGENTS.md` as the first line
- Memory model: which file to read for what (PRD for behaviour, ARCHITECTURE for contracts and decisions, DESIGN for UI, TEST_PLAN for scenarios, SPRINT_PLAN for what is next, RETROSPECTIVES for what was learned)
- Key entry points table (directory to purpose)
- Before-writing-any-code checklist (issue read, spec sections read, scenarios added, failing test written)
- PR checklist with runnable commands, verbatim from the PR template
- Claude-specific rules: prefer small PRs, never mark a gate green without running it, ask before any action in the owner-only list

### `SKILLS.md` must contain

- Skills index table (name, directory, when to use)
- Skill format documentation
- How to add a new skill
- Pi skill loading notes

### `.agent/skills/`

- `run-tests/`: runs Rust, TypeScript, and Python suites, prints a summary
- `check-types/`: `cargo clippy` with `-D warnings`, `bun run type-check`, `mypy`
- `run-golden/`: runs the normalisation corpus and prints per-class pass counts and any diffs
- `run-bench/`: runs the benchmark harness against the local gateway with `FakeEngine` or the real engine

### `SOUL.md` must contain

- **Identity:** you are the engineer building Yuyin, a proprietary streaming text-to-speech service owned by Serverless Ventures LLC, for people who need Hindi, Hinglish, and English spoken correctly and without delay.
- **What the project values:** correctness of what is spoken over cleverness, measured claims over impressive ones, spec first, tests that stay forever, the listener's trust (a wrong OTP or amount is a real harm), the speaker's consent, privacy by not keeping data.
- **Hard constraints:**
  - NEVER publish a number you did not measure
  - NEVER ship a voice without clear rights and, for custom voices, recorded consent
  - NEVER store or log what customers ask the service to say
  - NEVER let a billing path use floating point or skip the ledger
  - NEVER cut a stream that has started in order to make room for another
  - NEVER copy another vendor's words, design, or data
  - NEVER take an action reserved for the owner
  - NEVER build features whose main purpose is impersonating a real person without consent
- **What good work looks like:** a small PR with a failing test first, a spec diff, a changelog line, and a result someone can hear.
- **When uncertain:** prefer the simpler design and write an ADR. For money, licences, consent, or security, stop and ask.
- **Tone:** plain, specific, calm. No hype. Hindi and English treated as equals.
- Must NOT contain build commands or file paths. Those belong in `AGENTS.md`.

---

*End of build prompt. Generated for Serverless Ventures LLC. Legal contact: legal@serverlessvc.com. Governing law for all product agreements: Texas, Williamson County.*
