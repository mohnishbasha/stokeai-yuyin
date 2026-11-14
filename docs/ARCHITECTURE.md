# Yuyin Architecture

| | |
|---|---|
| Version | 0.1.0 |
| Status | Draft |
| Date | 2026-11-10 |

Once committed, this document supersedes `BUILD_PROMPT.md`. Where the two disagree, this document wins, and every disagreement needs an entry in the decision log (section 3). An engineer who has not read `BUILD_PROMPT.md` should be able to build Yuyin from this document and the other four specification documents (`PRD.md`, `DESIGN.md`, `SPRINT_PLAN.md`, `TEST_PLAN.md`).

Contents

1. System overview diagram
2. Component responsibilities
3. Decision log
4. Request lifecycle for REST and WebSocket
5. Text front-end pipeline
6. Engine abstraction
7. Streaming and segmentation strategy
8. Admission control and draining
9. Metering and ledger design
10. Data model
11. Full API contract
12. Error model
13. Security model
14. Observability
15. Capacity model
16. Build and Deployment
17. Failure modes table
18. Environment model
19. Dependency versions
20. Modularity principles

---

## 1. System overview diagram

Yuyin is a streaming text-to-speech API for Hindi, Hinglish, and English (India and US). It accepts text over REST or WebSocket and streams audio back while it is still being generated. Synthesis runs on ordinary CPU servers. There is no GPU in the serving path. It ships as a hosted pay-as-you-go service (prepaid credits) and as a licensed self-host edition.

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
  SDK / CLI / MCP           |  yuyin-gateway       | <--> |  Valkey / Redis |
                            |  (Rust, Axum)        |      |  key cache,     |
                            |  auth, metering,     |      |  reservations,  |
                            |  admission control   |      |  rate limits    |
                            |  +----------------+  |      +-----------------+
                            |  | yuyin-text     |  |
                            |  | yuyin-engine   |  |   models loaded from local disk
                            |  | yuyin-audio    |  |   (baked into image or mounted PVC)
                            |  +----------------+  |
                            +----------------------+
```

Two planes share only the database schema and the cache protocol:

- Data plane: `yuyin-gateway` (Rust). Authenticates API keys, meters, admits streams, synthesises, and streams audio. It never calls Clerk or Stripe.
- Control plane: `apps/console` (Next.js on Vercel). Accounts, API key management, billing, playground, operator admin, Stripe webhooks. It never calls gateway internals.

Subdomains: `api.` (data plane), `console.` (accounts and billing), `docs.` (documentation), `status.` (status page). Primary domain `getyuyin.com` (preferred), fallback `yuyintts.com`. Domain availability is not verified; the owner verifies it (see `docs/OWNER_CHECKLIST.md`). The product name appears in code only through the constants `PRODUCT_NAME`, `PRODUCT_SLUG`, and `KEY_PREFIX`, so a rename is one change set.

---

## 2. Component responsibilities

| Component | Language | Responsibility |
|---|---|---|
| `crates/yuyin-text` | Rust | Script detection, language tagging, normalisation, segmentation. Pure, no I/O |
| `crates/yuyin-engine` | Rust | `SynthesisEngine` trait, ONNX engine implementation, voice registry, warmup |
| `crates/yuyin-audio` | Rust | Resampling, time-stretch for pace, Opus and Ogg muxing, WAV header, PCM framing |
| `crates/yuyin-meter` | Rust | Character counting, price lookup, reservation and settlement, ledger batcher |
| `crates/yuyin-gateway` | Rust | HTTP and WebSocket server, auth, admission control, draining, metrics |
| `crates/yuyin-licence` | Rust | Self-host licence verification (Ed25519), offline usage report |
| `crates/yuyin-count-wasm` | Rust | WASM build of the character counter (`count.rs`) for the console |
| `apps/console` | TypeScript | Console, marketing site, playground, operator admin, Stripe webhooks |
| `apps/docs` | MDX | Documentation site built from MDX plus the OpenAPI file |
| `packages/sdk-ts` | TypeScript | Official TypeScript SDK |
| `packages/sdk-python` | Python | Official Python SDK |
| `packages/cli` | TypeScript | `yuyin` CLI, compiled with `bun build --compile` |
| `packages/mcp` | TypeScript | MCP server over stdio and streamable HTTP |
| `integrations/` | mixed | Pi extension, Goose toolkit, OpenCode config |
| `bench/` | Rust + scripts | Benchmark and load harness, published method |

Dependency direction: `gateway -> meter, engine, audio, text, licence`. Never the reverse (section 20).

External services:

| Service | Role | Used by |
|---|---|---|
| Clerk | Human authentication, organizations map to tenants | console only |
| Nile | Multi-tenant Postgres, source of truth for ledger and keys | console and gateway (through the shared schema) |
| Valkey or Redis (ElastiCache) | Key cache, balance reservation, concurrency counters, rate limits | gateway |
| Stripe Checkout | Prepaid top-ups, behind a `PaymentProvider` interface | console only |
| AWS `ap-south-1` | Primary data plane region (configuration, not code) | gateway |

Integrations are thin clients of the public API through the TypeScript SDK and have no privileged access:

| Harness | Integration |
|---|---|
| Pi | `@yuyin-tts/pi-extension` built on `pi-agent-core` with TypeBox tool schemas |
| Goose | `integrations/goose/toolkit.yaml` pointing at the MCP server |
| OpenCode | Config snippet and README |
| Claude Code | `.mcp.json` snippet |

MCP tools: `yuyin_speak` (text, voice, language?, format?, pace?, output_path?; writes an audio file and returns path, duration, chars billed), `yuyin_list_voices`, `yuyin_normalize` (free), `yuyin_status`, `yuyin_recommend_voice`, `yuyin_estimate_cost`. The MCP server reads `YUYIN_API_KEY` from the environment, never from tool arguments, and never returns it. `yuyin_speak` refuses to write outside the working directory unless `YUYIN_MCP_ALLOW_PATHS` permits. Audio goes to a file, not inline, to keep model context small. Rejected: embedding the engine in the MCP server (duplicates the self-host edition) and a plugin per harness (MCP already covers them).

---

## 3. Decision log

Format: context, decision, consequences, status. Entries ADR-001 to ADR-014 record decisions D1 to D14 and are not reopened without a new ADR. ADR-015 onward were added while writing this document.

### ADR-001 Product type (D1)

- Context: The product is an API consumed by many customers. Desktop-app defaults (Tauri, SQLite) do not fit.
- Decision: Multi-tenant SaaS API plus a self-host edition. Not a desktop app.
- Consequences: Tenant isolation, billing, and operations are first-class concerns. A self-host edition must run with no outbound connections.
- Status: Accepted.

### ADR-002 Data plane language (D2)

- Context: The hot path is latency-sensitive streaming with CPU-bound synthesis.
- Decision: Rust with Axum and Tokio.
- Consequences: Predictable memory, a single static binary for self-host. Fewer available hires than for Go; ONNX and Opus need FFI, so `forbid(unsafe_code)` has documented exceptions.
- Status: Accepted.

### ADR-003 Control plane (D3)

- Context: Accounts and billing are not latency-critical.
- Decision: Next.js (App Router) console on Vercel, in TypeScript.
- Consequences: Fast iteration on UI. The console is hosted by a third party in hosted mode; clusters that avoid Vercel use the `yuyin-console` image.
- Status: Accepted.

### ADR-004 Auth for humans (D4)

- Context: Console users need sessions and organizations.
- Decision: Clerk, with Clerk organizations as tenants.
- Consequences: No password handling in Yuyin. Clerk outage blocks console login but never synthesis.
- Status: Accepted.

### ADR-005 Auth for machines (D5)

- Context: API calls must authenticate in microseconds without a third-party round trip.
- Decision: Yuyin API keys, hashed at rest, verified in the gateway. Clerk is never in the synthesis hot path.
- Consequences: Key lifecycle (create, revoke, cache invalidation) is our code. Revocation propagates through the Valkey key cache.
- Status: Accepted.

### ADR-006 Database (D6)

- Context: Multi-tenant data with strong isolation.
- Decision: Nile (multi-tenant Postgres). Every tenant table carries `tenant_id`.
- Consequences: Isolation is built in. Migrations live in `migrations/` and are the single schema source for gateway and console.
- Status: Accepted.

### ADR-007 Hot-path state (D7)

- Context: Balance checks, key lookups, and concurrency counters must be sub-millisecond.
- Decision: Valkey or Redis (ElastiCache).
- Consequences: Redis is a rebuildable cache. Postgres is the source of truth. Redis outage has a defined policy (section 17).
- Status: Accepted.

### ADR-008 Payments (D8)

- Context: Prepaid top-ups with an existing integration.
- Decision: Stripe Checkout behind a `PaymentProvider` interface.
- Consequences: Razorpay and UPI become a v1.1 adapter with no gateway change. Webhooks must be idempotent on the Stripe event id.
- Status: Accepted.

### ADR-009 Speech model (D9)

- Context: Training a foundation model is out of scope for v1.
- Decision: Open-weights neural TTS run through ONNX Runtime on CPU, behind a `SynthesisEngine` trait, chosen by a measured bake-off in Sprint 1.
- Consequences: Model and voice licences must be reviewed by hand. The trait allows our own model later. The specific model is ADR-015.
- Status: Accepted.

### ADR-010 Primary region (D10)

- Context: Target listeners are in India.
- Decision: AWS `ap-south-1` (Mumbai) for the data plane.
- Consequences: Region is configuration. Latency to non-Indian clients is higher.
- Status: Accepted.

### ADR-011 Billing unit (D11)

- Context: Customers need to predict cost from the text they send.
- Decision: Unicode code points of the submitted text, before normalisation, after NFC. Matras and punctuation count.
- Consequences: One counter implementation (`yuyin-meter/count.rs`), also compiled to WASM for the console estimator. Normalisation expansion never changes the bill.
- Status: Accepted.

### ADR-012 Money representation (D12)

- Context: Ledger correctness.
- Decision: Integer micro-USD everywhere. No floats. `MicroUsd(i64)` and `Chars(u64)` newtypes.
- Consequences: A lint test greps `yuyin-meter` for `f32` and `f64`. Display formatting happens in one helper.
- Status: Accepted.

### ADR-013 Telemetry (D13)

- Context: Portfolio privacy stance.
- Decision: No third-party analytics in the console, site, CLI, or self-host edition. First-party operational metrics only.
- Consequences: Product analytics are limited to server-side counts. The self-host edition makes zero outbound connections, enforced by a test in a network namespace with no route out.
- Status: Accepted.

### ADR-014 Harnesses (D14)

- Context: Agent harnesses should be able to call the API.
- Decision: An MCP server (Goose, OpenCode, Claude Code) and a Pi extension.
- Consequences: Both are thin clients of the TypeScript SDK. No harness-specific plugin per tool.
- Status: Accepted.

### ADR-015 Speech engine selection

- Context: D9 fixes the approach (open-weights, ONNX, CPU) but not the model or the binding (`ort` directly, or `sherpa-onnx` bindings). Quality in Hindi and Hinglish, real-time factor, memory, and licence differ between candidates.
- Decision: Not yet taken. The choice is made by the Sprint 1 bake-off in `bench/engine-bakeoff/` using the published method in `bench/METHOD.md`: time to first audio, real-time factor per core, peak memory, listening-sheet scores, and licence review. The result, model sources, and checksums are recorded here and in `config/models.sha256`.
- Consequences: Dependency lines for `ort` and `sherpa-onnx` stay conditional until this is decided. `scripts/fetch-models.sh` reads its sources from this ADR. Until decided, `FakeEngine` is used for all development.
- Status: Proposed. Decided by the Sprint 1 bake-off.

### ADR-016 Repository location

- Context: The build prompt originally named `serverless-ventures/yuyin-tts` as a private repository. The repository actually provided by the owner is `github.com/mohnishbasha/stokeai-yuyin`, and on 2026-11-13 the owner confirmed it stays public.
- Decision: Build in the provided repository. Registry, chart, and image references keep the `serverless-ventures` names as configuration (the Makefile `REGISTRY` variable, defaulting to `ghcr.io/serverless-ventures`) until the owner moves the repository. The repository is public by owner decision. Any future org transfer is an owner action tracked in `docs/OWNER_CHECKLIST.md`.
- Consequences: Image labels (`org.opencontainers.image.source`) and cosign identity regexes must be parameterised, not hard-coded. Because the repository is public, no secrets, model weights, or customer data may be committed. Renaming later is a configuration change.
- Status: Accepted.

### ADR-017 Default branch

- Context: The repository used `master`. The branch strategy calls for `main`.
- Decision: Rename the default branch to `main` per the branch strategy.
- Consequences: Local clones and any tooling that references `master` must be updated. Branch protection is configured on `main` and `staging`.
- Status: Accepted.

### ADR-018 Container build strategy

- Context: Images are multi-arch (`linux/amd64`, `linux/arm64`). QEMU emulation of the Rust build is too slow.
- Decision: Native per-architecture GitHub runners (`ubuntu-24.04` and `ubuntu-24.04-arm`), then a manifest list is assembled from the two per-arch images. No QEMU for the Rust build.
- Consequences: CI needs both runner types. Local `make image-multiarch` is slower on a single-architecture developer machine and is a fallback only. Reproducibility is checked per architecture.
- Status: Accepted.

### ADR-019 Metrics exporter

- Context: The dependency list leaves the metrics library open ("pick one, record in ADR").
- Decision: The `metrics` facade crate with `metrics-exporter-prometheus`, served on the internal metrics port.
- Consequences: Metric names are defined in one module (`metrics.rs`). OpenTelemetry is used for traces only. Revisit if histograms with our latency buckets prove awkward.
- Status: Proposed.

### ADR-020 libopus and ONNX Runtime linking

- Context: The self-host tarball prefers static linking (musl target) where licences allow. libopus and ONNX Runtime each have licence and build-system constraints, and the chosen engine binding depends on ADR-015.
- Decision: Deferred. Opus linking is decided in Sprint 1 or 3 when `yuyin-audio` is built; ONNX Runtime linking is decided in Sprint 3 after ADR-015. The record must state static or dynamic for each, the target (glibc or musl) per artifact, and the licence basis.
- Consequences: The distroless base (`cc` versus `static`) in `Dockerfile.gateway` depends on this outcome. Until decided, the Dockerfile uses `distroless/cc`.
- Status: Proposed.

### ADR-021 Light theme token corrections

- Context: The build prompt seeds light theme `--text-2` #7A8290 and `--accent` #C77700. Measured against the light backgrounds they fall below WCAG AA (about 3.7:1 and 3.3:1), which conflicts with NFR-015 and the rule that every text and background pair meets AA.
- Decision: `docs/DESIGN.md` uses light `--text-2` #5F6775 and `--accent` #9A5A00, adds `--line-strong` for control borders, and forbids dark `--text-2` on `--bg-3`. The automated contrast test over the token table is the final authority.
- Consequences: DESIGN.md disagrees with the prompt's colour seed on these values. DESIGN.md wins.
- Status: Accepted.

### ADR-022 Lockfile formats

- Context: The build prompt names `bun.lockb`. Bun 1.2 and later write a text lockfile, `bun.lock`, by default, and the binary format is no longer the default. The Python SDK is managed with `uv`, which writes `uv.lock`.
- Decision: Commit `bun.lock` (text) at the repository root and `packages/sdk-python/uv.lock`. CI installs with `bun install --frozen-lockfile` and `uv sync --locked`.
- Consequences: Lockfile diffs are reviewable in PRs. The repository structure (section 16.8) lists `bun.lock` instead of `bun.lockb`. The `.gitignore` rule from the prompt that tracks `bun.lockb` applies to `bun.lock` instead.
- Status: Accepted.

---

## 4. Request lifecycle for REST and WebSocket

### 4.1 REST: `POST /v1/speech`

```
client
  | POST /v1/speech  (Authorization: Bearer yy_live_...)
  v
1. TLS terminates at the edge (WAF per-IP rate limit)
2. Gateway: body size check (max 64 KiB) -- no parsing yet
3. Authenticate: parse prefix, look up hash in Valkey key cache (miss: Postgres, then cache),
   constant-time compare, check revoked, org status, scopes, voice allowlist
4. Per-key and per-organization rate limit
5. Parse and validate JSON (length in code points, controls stripped, voice in registry,
   language and format enums, pace range). Reject, never truncate
6. Count chars (NFC code points), compute cost, run the Lua reserve script
   (402 if balance is insufficient; monthly_char_cap check)
7. Admission: non-blocking semaphore acquire (503 + Retry-After if full)
   -- everything above happens before the status line is sent
8. Send 200 with headers (X-Request-Id, X-Yuyin-Voice, X-Yuyin-Chars), chunked
9. Text front-end: normalise, segment. Segments go to the per-stream queue
10. Worker pool synthesises segment by segment. PCM flows over a bounded channel
11. yuyin-audio resamples, time-stretches, and encodes (Opus/Ogg, PCM, or WAV) and writes chunks
12. End of stream: write trailers X-Yuyin-Chars-Billed and X-Yuyin-Ttfa-Ms
13. Settle: release the unused reservation, enqueue a ledger event, release the semaphore
```

Any error before step 8 returns a JSON error with the proper status and no audio. An error after step 8 cannot change the status line: the stream is terminated, and settlement bills only delivered segments (section 9).

### 4.2 WebSocket: `wss://.../v1/speech/stream`

```
client                                     gateway
  | upgrade (Authorization header)  ------> authenticate, origin check (browser tokens)
  | or first frame {type:auth,api_key}      rate limit
  | {type:start, voice, ...}        ------> validate; reserve nothing yet
  |                                         admission (semaphore) -- error frame if full
  | <------ {type:started, request_id, sample_rate}
  | {type:text, text}  (repeat)     ------> buffer; on clause boundary, reserve cost for the
  |                                         new chars, normalise and segment, enqueue
  | <------ binary audio frames
  | <------ {type:segment, chars, ttfa_ms}  after each segment
  | {type:flush}                    ------> synthesise whatever is buffered now
  | {type:end}                      ------> flush, finish, settle
  | <------ {type:done, chars_billed}
```

Differences from REST: reservation is incremental per `text` message (each message is reserved before it is accepted, so credits cannot run out silently mid-stream); one admission slot is held for the whole connection; limits are 20,000 code points per connection, 10 minute maximum duration, and 30 s idle timeout; the server pings every 20 s and closes on protocol violation. Errors are `error` frames followed by close, because HTTP status is not available after upgrade. Failures before upgrade (auth, admission) return an HTTP status as in REST.

---

## 5. Text front-end pipeline

Crate: `yuyin-text`. Pure: no I/O, no async, no global state, compilable to WASM. Deterministic: the same input and options always produce the same output.

### 5.1 Stages and types

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

Rust signatures (names are normative, field details may be refined in implementation):

| Stage | Module | Input | Output |
|---|---|---|---|
| 1. Clean | `lib.rs` | `&str`, `&NormaliseOptions` | `Result<CleanText, TextError>` where `CleanText(String)` is NFC, control-free, length-validated (`TextError::TooLong`, `TextError::Empty`) |
| 2. Tokenise | `lib.rs` | `&CleanText` | `Vec<Span>` where `Span { range: Range<usize>, kind: SpanKind }` and `SpanKind` is word, number, punctuation, space (uses `unicode-segmentation`) |
| 3. Tag | `tag.rs` | `&[Span]`, `&CleanText`, `&Lexicons`, `LanguageHint` | `Vec<TaggedSpan>` where `TaggedSpan { span: Span, script: Script, lang: Lang }`, `Script` is `Deva \| Latn \| Digit \| Symbol`, `Lang` is `Hi \| En` |
| 4. Classify | `classify.rs` | `&[TaggedSpan]`, `&Lexicons`, `Locale` | `Vec<ClassifiedSpan>` where `ClassifiedSpan { tagged: TaggedSpan, semiotic: Option<Semiotic> }`; `Semiotic` has variants `Money, Date, Time, Phone, Otp, Cardinal, Ordinal, Percent, Unit, Acronym, Email, Url, Range`, each carrying its parsed value |
| 5. Verbalise | `verbalise/` | `&ClassifiedSpan`, `Lang` (context language), `Locale` | `Verbalised { text: String, lang: Lang, pace_hint: Option<f32> }` (one submodule per semiotic class; number words from `data/hindi_numbers.tsv`) |
| 6. Transliterate | `translit.rs` | `&[Verbalised]`, `EngineNeeds` | `Vec<Verbalised>` with Roman Hindi converted to Devanagari where `EngineNeeds::devanagari` is set |
| 7. Segment | `segment.rs` | `&[Verbalised]`, `SegmentOptions` | `Vec<Segment>` where `Segment { text: String, lang: Lang, pace_hint: f32, char_span: Range<usize> }` |

Top-level entry points: `pub fn normalise(text: &str, opts: &NormaliseOptions) -> Result<Vec<Segment>, TextError>`. Character counting is not done here: the single counter lives in `yuyin-meter/count.rs`. `NormaliseOptions` holds `language: LanguageHint` (`Auto, Hi, Hinglish, EnIn, EnUs`), `locale: Locale`, `tenant_lexicon: Option<&TenantLexicon>`, and `max_chars`. `char_span` always refers to code point offsets in the original NFC text, so the meter can sum delivered characters even when verbalisation changes the length. Every public function has a doctest with a Hindi and an English example. The pipeline when `normalize=false`: stages 1, 2, 3, and 7 run; stages 4 to 6 are skipped.

### 5.2 Normalisation rules

OTP detection:

- 4 to 8 digits near a trigger word (OTP, code, कोड, पिन, PIN, verification) are read digit by digit with a pace hint of 0.85.
- Without a trigger word, 4-digit numbers are read as cardinals, except years.

Phone numbers:

- Indian 10-digit mobile numbers and `+91` forms are read digit by digit in groups (5 and 5).
- US forms are read in groups (3, 3, 4).

Currency:

- Indian digit grouping (1,25,000) and Western grouping (125,000) both parse.
- Amounts verbalise in the sentence's language.
- Paise and cents are handled.

Dates:

- `DD/MM/YYYY` is the default for `hi`, `hinglish`, and `en-IN`.
- `MM/DD/YYYY` is the default for `en-US`.
- ISO dates always parse.
- An ambiguous date never silently swaps day and month across locales.

Acronyms:

- A lexicon (`data/acronyms.tsv`) decides letter-by-letter ("KYC", "EMI") versus word ("PAN" as a word in Indian usage).
- Tenants can override through a per-organization lexicon (`lexicon_entries`), capped at 500 entries.

Determinism:

- The normaliser is deterministic. Same input and same options give the same output. No clock, randomness, locale of the host, or network is consulted.

Quality gate: a golden corpus under `crates/yuyin-text/golden/*.tsv` holds input, options, and expected segments, extended with `scripts/golden-add.sh` and run by `make golden`.

---

## 6. Engine abstraction

Crate: `yuyin-engine`. Nothing above it knows which model is running. A second engine can be added without touching the gateway. Implementations: `FakeEngine` (`fake.rs`, deterministic tones, used in dev and CI) and the ONNX engine (`onnx.rs`, chosen by ADR-015).

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

Threading model:

- Synthesis is CPU-bound and never runs on Tokio runtime threads.
- `pool.rs` implements a fixed-size worker pool: one OS thread per allotted core (`YUYIN_WORKER_THREADS`), ONNX intra-op threads set to 1.
- Workers pull segments from a per-stream queue. Queues and channels are bounded; there are no unbounded queues.
- Audio flows to the async side over a bounded channel, so a slow client applies backpressure to its own stream only.
- A worker panic is caught per segment (`catch_unwind` at the pool boundary), marks the stream failed, and the worker is replaced (section 17).

Voice registry (`registry.rs`): loads `config/voices.toml` plus private voices from the `voices` table; `visibility` is `public` or `private`; private voices are visible only to `owner_tenant_id`. Sample rate is 24 kHz. Model files are verified by SHA-256 against a manifest signed at build time before load. The worker never opens network connections and never reads outside `YUYIN_MODEL_DIR` (seccomp profile and read-only root filesystem).

---

## 7. Streaming and segmentation strategy

Goal: time to first audio (TTFA) as low as possible, then keep audio flowing ahead of playback.

- Segmentation (`segment.rs`) splits at clause boundaries (sentence terminators, commas, semicolons, danda `।`, and line breaks). The first segment is deliberately short (target a small number of words, set in `config/limits.toml`) so the first synthesis call finishes quickly. Later segments are longer for prosody.
- A language switch inside a sentence starts a new segment, tagged with its own `lang`, so the engine receives single-language segments.
- Pace: `pace_hint` from the normaliser (for example 0.85 for OTP digits) multiplies the request `pace`. The engine receives the combined value; where the model cannot change speed natively, `yuyin-audio/stretch.rs` time-stretches PCM.
- Pipeline: segment N+1 is queued while segment N is being encoded and written. The per-stream bounded channel holds a small number of PCM chunks; when full, the worker blocks on that stream only.
- Opus: 24 kHz mono encoded in fixed frames (frame size is set in `yuyin-audio`; Ogg pages are flushed per frame group so the client can decode incrementally). PCM is signed 16-bit little-endian at 24 kHz. WAV carries a streaming header with an unknown length (maximum-size data field) because the length is not known up front.
- WebSocket: `text` messages accumulate in a buffer; synthesis starts at a clause boundary, on `flush`, or on `end`. A partial clause stays buffered until one of these.
- Cancellation: client disconnect cancels the `CancellationToken`; engines stop at the next chunk and the stream is settled with delivered characters only.
- Chunk and frame sizes are tuning parameters recorded with the benchmark results, not constants in this document.

---

## 8. Admission control and draining

Admission:

- Each node has `capacity_streams`, written by the benchmark harness for that instance type (`config/capacity.toml`, overridable with `YUYIN_CAPACITY_STREAMS`).
- A semaphore guards admission. Acquisition is non-blocking. Failure returns 503 `at_capacity` with `Retry-After` computed from the median remaining duration of active streams, clamped to 1 to 10 seconds.
- Admission happens after auth and credit reservation checks but before the response status line is sent, so a rejected request never receives audio. A rejected request releases its reservation.
- Streams in progress are never cut by admission decisions.

Draining:

- On SIGTERM the node flips readiness (`/readyz`) to false, stops admitting, and waits up to 120 s (`YUYIN_DRAIN_TIMEOUT_SECS`) for active streams.
- Kubernetes `terminationGracePeriodSeconds` is 150. `preStop` sleeps 5 s so the endpoint is removed from load balancers before admission stops. Compose uses `stop_grace_period: 150s`.
- If streams remain at the drain deadline, they are terminated, settled for delivered segments only, and counted in `yuyin_drain_cut_streams_total` (target zero).
- Rolling updates use `maxUnavailable: 0`, `maxSurge: 25%`.

Autoscaling: fleet utilisation `yuyin_active_streams / yuyin_capacity_streams` drives the HPA with a target of 0.6 (`autoscaling.targetStreamUtilization`), min 2 and max 20 replicas by default, with a 300 s scale-down stabilisation window.

---

## 9. Metering and ledger design

Crate: `yuyin-meter`. Modules: `count.rs` (the one counter), `price.rs`, `reserve.rs`, `batcher.rs`, `lua/`.

Billing:

- Characters billed = number of Unicode scalar values in the submitted `text` field after NFC, before normalisation. Whitespace and punctuation count.
- Cost in micro-USD = `ceil(chars * price_per_1k_micro_usd / 1000)`, using integer arithmetic only (`MicroUsd(i64)`, `Chars(u64)`).
- Prices are per format from the `pricing` table, seeded from `config/pricing.toml`. Placeholders until the owner sets them: Opus and PCM 2,000 micro-USD per 1,000 characters; WAV 2,400; minimum top-up $5.00; launch grant 1,000,000 characters for the first 1,000 verified signups.

Flow:

1. Hot path: a Lua script in Redis atomically checks and reserves `cost` against the organization's cached balance. Key: `bal:{org_id}`. If insufficient, the request fails with 402 and nothing is reserved. Grant characters are consumed before balance where a grant remains.
2. Settlement: on stream end the gateway computes delivered characters (the sum of `char_span` for segments whose audio was fully written to the socket), releases the difference, and enqueues a ledger event `{request_id, org_id, key_id, chars, cost, format, voice, started_at, ttfa_ms, status}`.
3. Batcher: writes ledger events to Postgres every 500 ms or 200 events, whichever comes first, idempotent on `request_id` (`ledger.request_id` is unique). The in-memory queue is bounded; on overflow the gateway applies backpressure to admission rather than dropping events.
4. A failure before any audio is delivered bills zero. A client disconnect bills only delivered segments.
5. Reconciliation: a job runs daily. It recomputes each balance from the append-only ledger and alerts on any difference. Postgres is the source of truth. Redis is a cache that can be rebuilt.
6. Top-ups: the Stripe webhook (in the console) writes a `credit` ledger row and bumps the Redis balance through the same script. Webhooks are idempotent on the Stripe event id (`ledger.stripe_event_id` is unique).
7. Per-key `monthly_char_cap` is enforced at reservation time (403 `key_restricted`).

The ledger is append-only: corrections are `adjustment` or `refund` rows, never updates or deletes.

---

## 10. Data model

All tenant tables carry `tenant_id` (Nile tenant context). Migrations live in `migrations/` as plain SQL and are the single source for gateway and console. Types below are Postgres types. All `created_at` columns are `timestamptz` in UTC with default `now()`. Primary keys are `uuid` (v7) unless stated.

| Table | Columns | Keys and indexes | Retention |
|---|---|---|---|
| `organizations` | `id` uuid; `clerk_org_id` text not null; `name` text; `status` text check in (`active`,`suspended`); `created_at` | PK `id`; unique `clerk_org_id`. This is the tenant table; `id` serves as the Nile tenant id | Life of account; deleted on verified erasure request |
| `api_keys` | `id`; `tenant_id`; `name` text; `prefix` text; `hash` bytea (SHA-256); `scopes` jsonb; `voice_allowlist` text[]; `monthly_char_cap` bigint null; `last_used_at` timestamptz null; `revoked_at` timestamptz null; `created_by` text; `created_at` | PK (`tenant_id`,`id`); unique `prefix`; index on (`tenant_id`, `revoked_at`) | Life of account; revoked rows kept 13 months for audit |
| `ledger` | `id`; `tenant_id`; `kind` text check in (`credit`,`debit`,`grant`,`refund`,`adjustment`); `amount_micro_usd` bigint; `chars` bigint null; `request_id` text null; `stripe_event_id` text null; `actor` text; `note` text; `created_at` | PK (`tenant_id`,`id`); unique `request_id`; unique `stripe_event_id`; index (`tenant_id`, `created_at`) | Append-only; kept for financial record retention (set by the owner, default 7 years) |
| `usage_daily` | `tenant_id`; `day` date; `key_id`; `voice_id` text; `format` text; `requests` bigint; `chars` bigint; `cost_micro_usd` bigint | PK (`tenant_id`,`day`,`key_id`,`voice_id`,`format`) | 25 months |
| `request_log` | `id`; `tenant_id`; `key_id`; `request_id` text; `voice_id` text; `format` text; `chars` bigint; `ttfa_ms` int; `duration_ms` int; `status` text; `error_code` text null; `created_at` | PK (`tenant_id`,`id`); index (`tenant_id`, `created_at`); index (`request_id`). Metadata only: never text or audio | 30 days, purged by a scheduled job |
| `voices` | `id` text; `engine_id` text; `display_name` text; `languages` text[]; `gender` text; `style` text; `sample_url` text; `visibility` text check in (`public`,`private`); `owner_tenant_id` uuid null; `licence_ref` text; `status` text | PK `id`; index `owner_tenant_id` where not null. Public voices are global rows (no tenant) | Life of voice; disabled, not deleted, on consent withdrawal |
| `lexicon_entries` | `id`; `tenant_id`; `term` text; `spoken_form` text; `lang` text; `created_at` | PK (`tenant_id`,`id`); unique (`tenant_id`,`term`,`lang`); a check in the repository layer caps rows at 500 per tenant | Life of account |
| `pricing` | `id`; `format` text; `price_per_1k_micro_usd` bigint; `effective_from` timestamptz | PK `id`; index (`format`, `effective_from` desc). Global (no tenant) | Kept indefinitely (price history) |
| `grants` | `id`; `tenant_id`; `chars_granted` bigint; `reason` text; `created_at` | PK (`tenant_id`,`id`) | Life of account |
| `custom_voice_requests` | `id`; `tenant_id`; `status` text; `speaker_name` text; `consent_record_id` uuid; `created_at` | PK (`tenant_id`,`id`); FK `consent_record_id` | Life of voice plus 13 months |
| `consent_records` | `id`; `tenant_id`; `speaker_legal_name` text; `statement_text` text; `audio_object_key` text; `signed_at` timestamptz; `verified_by` text; `withdrawn_at` timestamptz null | PK (`tenant_id`,`id`). Audio lives in S3 with KMS encryption and Object Lock | Kept while the voice exists and for the legal retention period; withdrawal is recorded, not deleted |
| `audit_log` | `id`; `tenant_id` null; `actor` text; `action` text; `target` text; `metadata` jsonb; `created_at` | PK `id`; index (`tenant_id`, `created_at`); append-only | 13 months minimum |

Redis keys (cache, rebuildable from Postgres): `bal:{org_id}` (balance in micro-USD plus grant characters), `key:{prefix}` (cached key record), `conc:{key_id}` and rate-limit counters, and the reservation entries per `request_id` with a TTL.

---

## 11. Full API contract

`api/openapi.yaml` (OpenAPI 3.1) is the machine-readable source of truth. This section mirrors it. If they differ, the OpenAPI file is a bug to be fixed in the same change set; SDK types, docs, mock servers, and contract tests are all generated from it.

Base URL: `https://api.getyuyin.com` (stage: `https://api.stage.getyuyin.com`; local: `http://127.0.0.1:8080`).

Authentication: `Authorization: Bearer yy_live_<prefix>_<secret>`; `yy_test_` keys for test mode. Keys carry 32 random bytes of secret, are shown once, and are stored as SHA-256 hashes. Unauthenticated endpoints: `/healthz`, `/readyz`. `/metrics` is available only on the internal metrics port.

Request body limit: 64 KiB for all JSON endpoints. Content types: requests are `application/json`.

### 11.1 `POST /v1/speech`

Request (`application/json`):

| Field | Type | Required | Range and default |
|---|---|---|---|
| `text` | string | yes | 1 to 5000 Unicode code points (after NFC). Control characters are stripped. Longer input is rejected, never truncated |
| `voice` | string | yes | A voice id from `/v1/voices` |
| `language` | enum | no | `"auto"`, `"hi"`, `"hinglish"`, `"en-IN"`, `"en-US"`. Default `"auto"` |
| `format` | enum | no | `"opus"`, `"pcm"`, `"wav"`. Default `"opus"` |
| `pace` | number | no | 0.5 to 2.0. Default 1.0 |
| `normalize` | boolean | no | Default `true` |
| `request_id` | string | no | Idempotency and tracing. If omitted, the server generates one. A repeated id within the idempotency window does not bill twice |

Response 200:

| Item | Value |
|---|---|
| `Content-Type` | `audio/ogg; codecs=opus` for `opus`; `audio/pcm;rate=24000` for `pcm`; `audio/wav` for `wav` |
| `Transfer-Encoding` | `chunked` |
| Headers | `X-Request-Id`, `X-Yuyin-Voice`, `X-Yuyin-Chars` (characters submitted and reserved) |
| Trailers | `X-Yuyin-Chars-Billed` (characters actually delivered and billed), `X-Yuyin-Ttfa-Ms` (time to first audio in milliseconds) |

Audio format: 24 kHz mono. PCM is signed 16-bit little-endian. Clients that cannot read trailers can call `GET /v1/usage` for billed characters.

Errors: 400 `invalid_request`, 401 `invalid_api_key`, 402 `insufficient_credits`, 403 `key_restricted` or `org_suspended`, 413 `text_too_long`, 422 `unknown_voice` or `unsupported_language`, 429 `rate_limited`, 503 `at_capacity` or `engine_unavailable`.

### 11.2 `GET /v1/voices`

Query parameters, all optional: `language` (same enum as above, except `auto`), `gender` (string), `style` (string). Response 200: `{ "voices": [ Voice ] }`. `Voice` fields: `id`, `display_name`, `languages` (array), `gender`, `style`, `sample_url`, `visibility`. Private voices appear only for their owner organization. Errors: 401, 429.

### 11.3 `GET /v1/voices/{id}`

Path parameter `id`. Response 200: a `Voice`. Errors: 401, 422, 429. An unknown or inaccessible id returns 422 `unknown_voice`, consistent with `/v1/speech` (no 404 is used).

### 11.4 `POST /v1/normalize`

Request: `{ "text": string (1..5000 code points), "language": enum (default "auto") }`. Response 200: `{ "segments": [ { "text": string, "lang": "hi" | "en" } ], "chars": integer }` where `chars` is the billable count of the input. Free of charge; rate limited. Errors: 400, 401, 413, 422 `unsupported_language`, 429.

### 11.5 `GET /v1/balance`

Response 200: `{ "balance_micro_usd": integer, "grant_chars_remaining": integer }`. Errors: 401, 429.

### 11.6 `GET /v1/usage`

Query parameters: `from` (ISO 8601 date, inclusive), `to` (ISO 8601 date, inclusive), `group_by` (`day`, `key`, `voice`, or `format`; default `day`). Response 200: `{ "from": date, "to": date, "group_by": string, "rows": [ { "group": string, "requests": integer, "chars": integer, "cost_micro_usd": integer } ] }`. Maximum range 366 days. Errors: 400, 401, 429.

### 11.7 Operational endpoints

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /healthz` | Liveness | 200 while the process runs. No auth |
| `GET /readyz` | Readiness | 200 only when the model is warmed and the node is not draining; otherwise 503. No auth |
| `GET /metrics` | Prometheus exposition | Internal network only (`YUYIN_METRICS_BIND`) |

### 11.8 WebSocket `wss://api.getyuyin.com/v1/speech/stream`

Authentication: the `Authorization` header, or for browsers a first message `{ "type": "auth", "api_key": "..." }` (browser tokens are subject to an origin allowlist; playground tokens are short-lived).

Client to server (JSON text frames):

| Message | Fields |
|---|---|
| `start` | `{ "type": "start", "voice": string (required), "language": enum (default "auto"), "format": enum (default "opus"), "pace": number 0.5..2.0 (default 1.0) }`. Must be the first message after auth |
| `text` | `{ "type": "text", "text": string }`. May be sent many times; partial sentences allowed |
| `flush` | `{ "type": "flush" }`. Synthesise whatever is buffered now |
| `end` | `{ "type": "end" }`. Flush, finish, and close after `done` |

Server to client:

| Message | Fields |
|---|---|
| `started` | `{ "type": "started", "request_id": string, "sample_rate": 24000 }` |
| binary frame | Audio in the requested format |
| `segment` | `{ "type": "segment", "chars": integer, "ttfa_ms": integer }` |
| `done` | `{ "type": "done", "chars_billed": integer }` |
| `error` | `{ "type": "error", "code": string, "message": string, "retry_after": integer }` (`retry_after` in seconds, present for `rate_limited` and `at_capacity`) |

Limits: 20,000 code points per connection, 10 minute maximum duration, 30 s idle timeout, ping every 20 s. Exceeding the code point limit yields an `error` frame with `text_too_long` and close. Idle or over-duration closes use normal WebSocket close codes with a final `error` frame where possible.

### 11.9 Limits summary

| Limit | Value | Config |
|---|---|---|
| Request body | 64 KiB | `config/limits.toml` |
| Text per REST request | 5,000 code points | `YUYIN_MAX_TEXT_CHARS` |
| Text per WebSocket connection | 20,000 code points | `config/limits.toml` |
| WebSocket duration | 10 minutes | `config/limits.toml` |
| WebSocket idle timeout | 30 s | `config/limits.toml` |
| Pace | 0.5 to 2.0 | fixed by contract |
| Tenant lexicon entries | 500 | `config/limits.toml` |
| `Retry-After` on 503 | 1 to 10 s | computed |

Rate limit values per key and per organization are set in `config/limits.toml`; WAF applies a per-IP limit at the edge.

---

## 12. Error model

All endpoints return this body for errors (WebSocket uses the `error` frame with the same `code` and `message`):

```json
{ "error": { "code": "insufficient_credits", "message": "...", "request_id": "..." } }
```

| Code | HTTP status | Meaning | Retryable |
|---|---|---|---|
| `invalid_request` | 400 | Malformed JSON, missing field, value out of range, bad enum | No |
| `invalid_api_key` | 401 | Missing, malformed, unknown, or revoked key | No |
| `insufficient_credits` | 402 | Balance and grant cannot cover the reservation | No, after top-up |
| `key_restricted` | 403 | Key scope, voice allowlist, or monthly character cap forbids the call | No |
| `org_suspended` | 403 | Organization status is `suspended` | No |
| `text_too_long` | 413 | Text exceeds the limit (REST 5,000 code points, WebSocket 20,000, body 64 KiB) | No |
| `unknown_voice` | 422 | Voice id not in the registry or not visible to the caller | No |
| `unsupported_language` | 422 | Language value not supported for the voice or request | No |
| `rate_limited` | 429 | Per-key, per-organization, or WAF limit exceeded | Yes, after `Retry-After` |
| `at_capacity` | 503 | Admission semaphore is full or the node is draining; sent before any audio | Yes, after `Retry-After` |
| `engine_unavailable` | 503 | Engine not warmed, model failed verification, or workers unavailable | Yes |

Rules: error responses never echo request text. Every error carries `request_id`. 429 and 503 include a `Retry-After` header (seconds). An error that occurs after audio has started cannot change the HTTP status; the connection is terminated and the stream is billed only for delivered segments. Messages are written for developers, are English only, and are stable enough to display but clients should switch on `code`.

---

## 13. Security model

### API and gateway

- TLS 1.2+ only at the edge. HSTS on every hostname.
- API keys: 32 random bytes from the OS CSPRNG, stored as SHA-256 hash, compared in constant time (`subtle`), shown once, prefixed (`yy_live_`, `yy_test_`) so secret scanners can detect them. The pattern is registered with GitHub secret scanning when the owner is ready.
- Authentication runs before any body parsing beyond a size check. Maximum request body 64 KiB.
- Input validation: length in code points, allowed Unicode categories, control characters stripped, voice id against the registry. Reject, never truncate silently.
- WebSocket: origin allowlist for browser tokens, per-connection limits, ping every 20 s, close on protocol violation.
- Rate limits at three levels: WAF per IP, gateway per key, gateway per organization.
- `/metrics` and admin ports bind to the internal network only.
- The synthesis worker never opens network connections and never reads files outside `YUYIN_MODEL_DIR`. Enforced with a seccomp profile and a read-only root filesystem.
- Model files are verified by SHA-256 against a manifest signed at build time.
- Request text is a `SensitiveText` newtype whose `Debug` and `Display` print only the length. `YUYIN_DEBUG_LOG_TEXT` is refused in prod.

### Console

- Clerk for sessions. CSRF protection on all mutations. Strict CSP with nonces, no inline scripts, `frame-ancestors 'none'`.
- Role checks on the server for every action. The client never decides authorisation.
- Stripe webhooks verified by signature. Secrets in Vercel encrypted env.
- Operator routes require an allowlisted user (`OPERATOR_USER_IDS`) and a fresh session (re-auth within 15 minutes for credit and suspension actions).
- Playground tokens are short-lived (5 minutes), scoped to one organization, and limited to the playground rate.
- Zod validation on every route handler input and every webhook payload. Data access goes through a typed repository layer that always sets the Nile tenant context.

### Data and privacy

- Text and audio are processed in memory and not stored. `request_log` keeps metadata only.
- No third-party analytics, session replay, or advertising pixels anywhere. Server-side first-party page counts only.
- The self-host edition makes zero outbound connections, verified by a test in a network namespace with no route out. Licence verification is offline (Ed25519).
- Personal data inventory in `docs/DATA_INVENTORY.md`.
- Consent recordings for custom voices are stored in S3 with KMS encryption and Object Lock, access logged, retrievable only by operators.

### Voice safety

- No voice cloning from arbitrary audio. Custom voices are created only through the consent workflow with identity verification of the speaker.
- No voices that imitate a real public figure; the intake form states this and the operator checks it.
- Consent can be withdrawn. Withdrawal disables the voice within one business day and is recorded.
- The acceptable use policy prohibits impersonation, fraud, harassment, and deceptive robocalls; enforcement hooks (S6-T04) exist to act on it.

### Supply chain

- `cargo audit`, `cargo deny`, npm audit, and `pip-audit` in CI. High and critical findings block merge.
- Lock files committed. Dependabot weekly.
- GitHub Actions pinned by commit SHA.
- Images signed with cosign keyless, SBOM (SPDX) attached, base images pinned by digest.
- Licence allowlist enforced for code. Model and voice licences are reviewed by hand and recorded in `docs/licences/`.
- The repository is public (ADR-016), so no secrets, model weights, or customer data are committed.

### Network defaults

- Local development binds to `127.0.0.1` only.
- The self-host edition binds to `127.0.0.1` by default and requires an explicit `--bind` to listen elsewhere.

Threats and mitigations are developed in `docs/THREAT_MODEL.md`.

---

## 14. Observability

Logging: `tracing` with structured JSON in stage and prod. No `println!` outside dev tool entry points. Request text and audio are never logged. Every log line in a request carries `request_id`, `tenant_id` (organization id), and `key_id` (never the key).

Metrics (Prometheus, `metrics` plus `metrics-exporter-prometheus` per ADR-019, on `YUYIN_METRICS_BIND`). Names below are the starting set; labels never include text or key material.

| Metric | Type | Purpose |
|---|---|---|
| `yuyin_active_streams` | gauge | Streams in progress on this node |
| `yuyin_capacity_streams` | gauge | Configured capacity of this node |
| `yuyin_requests_total{endpoint,status,error_code}` | counter | Request outcomes |
| `yuyin_ttfa_seconds{format}` | histogram | Time to first audio |
| `yuyin_rtf` | histogram | Real-time factor per segment |
| `yuyin_admission_rejected_total` | counter | 503 `at_capacity` count |
| `yuyin_drain_cut_streams_total` | counter | Streams cut at the drain deadline (target 0) |
| `yuyin_chars_billed_total{format}` | counter | Characters billed |
| `yuyin_ledger_queue_depth` | gauge | Pending ledger events |
| `yuyin_ledger_flush_seconds` | histogram | Batch write latency |
| `yuyin_redis_errors_total`, `yuyin_postgres_errors_total` | counter | Dependency failures |
| `yuyin_worker_panics_total` | counter | Caught worker panics |
| `yuyin_ws_connections` | gauge | Open WebSocket connections |
| `yuyin_clock_skew_seconds` | gauge | Observed skew against dependencies |

Tracing: OpenTelemetry spans exported over OTLP to `YUYIN_OTLP_ENDPOINT` when set (unset in dev; never set in self-host unless the operator chooses). Span per stage: auth, reserve, admit, normalise, synthesise (per segment), encode, settle.

Dashboards and alerts (defined in `deploy/` and runbooks in `docs/runbooks/`): TTFA p95 and error ratio SLO burn, utilisation above 0.8 for 10 minutes, ledger queue depth growing, any reconciliation mismatch (page), Redis or Postgres error rate, drain-cut streams above zero, certificate and licence expiry. Status page at `status.`. Synthetic probe runs a short `/v1/speech` request on a schedule and records TTFA.

Console and docs: first-party server-side counts only (ADR-013).

---

## 15. Capacity model

Capacity is measured, never assumed. The benchmark harness (`bench/loadgen`, method in `bench/METHOD.md`) runs the selected engine on each supported instance type and writes `capacity_streams` to `config/capacity.toml`. No performance figure is published unless the harness measured it.

Definitions:

- Stream: one active synthesis (REST request or WebSocket connection) consuming engine work.
- Real-time factor (RTF) per core: seconds of CPU time spent per second of audio produced. A stream played in real time needs sustained RTF below 1 on one core.
- `capacity_streams` = the highest concurrent stream count at which TTFA p95 and underrun rate stay within the targets in `PRD.md`, on that instance type, with headroom for the async runtime, encoding, and the OS.

Sizing method:

1. Measure single-core RTF and TTFA for the engine (Sprint 1 bake-off).
2. Streams per core are about `1 / RTF` at steady state, reduced for encode, resample, and runtime overhead. The harness measures the real value under load.
3. `capacity_streams` per node = measured value for `workerThreads` cores. CPU requests and limits are equal (`resources.requests.cpu = workerThreads`) so the scheduler does not oversubscribe.
4. Fleet size = `ceil(peak_concurrent_streams / (capacity_streams * 0.6))`. The 0.6 target leaves headroom for scale-up latency and bursts.
5. Memory: model resident size per process plus per-stream buffers (bounded channels). Default request 2 GiB at 4 vCPU until measured.

| Instance type | vCPU | Worker threads | `capacity_streams` | Measured by |
|---|---|---|---|---|
| to be measured in Sprint 1 | | | | `bench/loadgen` |

Scale-up latency (pod start plus model warm, up to the 60 s startup probe) is why the target utilisation is 0.6 and why `minReplicas` is 2. Scale-down is slow (300 s stabilisation) so streams are not stranded. Beyond capacity the system sheds new streams with 503 and `Retry-After`, never degrading streams in progress.

Datastore load: ledger writes are batched (at most 2 flushes per second per gateway). Redis operations per request are a small fixed number (key lookup, rate-limit check, reserve, settle). Capacity numbers for these are recorded with the load test results.

---

## 16. Build and Deployment

This section is the single reference for how Yuyin is built and shipped; `docs/DEPLOYMENT.md` is the operator guide generated from it. Four paths build on each other. Each has one entry-point command, a verification step, and an owning sprint.

| Path | What it gives you | Entry point | First available | Complete by |
|---|---|---|---|---|
| 1. Local build | Binaries and bundles on a developer machine | `make build` | Sprint 0 | Sprint 8 |
| 2. Local deploy | A running stack on one machine, native or Compose | `make dev`, `make up` | Sprint 0 | Sprint 7 |
| 3. OCI containerization | Signed multi-arch images and OCI artifacts in GHCR | `make image`, `make image-push` | Sprint 0 (skeleton) | Sprint 6 |
| 4. Helm on Kubernetes | The chart, installed on a local or remote cluster | `make kind-up`, `make helm-install` | Sprint 3 (minimal chart) | Sprint 11 |

Rule: the paths are built incrementally from Sprint 0, not bolted on at the end. From Sprint 3 onward, every sprint gate includes "image builds, chart installs on kind, smoke suite passes against it".

### 16.1 Single entry point: the Makefile

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

Additional targets referenced elsewhere: `make build-cli-all` (all CLI platforms) and `make dist-selfhost` (self-host tarball).

Variables: `VERSION` (defaults to the `VERSION` file), `REGISTRY` (defaults to `ghcr.io/serverless-ventures`, see ADR-016), `PLATFORMS` (defaults to `linux/amd64,linux/arm64`), `ENGINE` (`fake` or `onnx`), `NAMESPACE` (defaults to `yuyin`), `VALUES` (defaults to `values-kind.yaml`).

### 16.2 Path 1: Local build

Prerequisites (checked by `make setup`, which prints what is missing and never installs system packages without being asked):

```
Rust        version from rust-toolchain.toml, plus cargo-chef, cargo-deny, cargo-tarpaulin
Bun         current stable
Python      3.10+ (SDK only)
C toolchain cc, cmake, pkg-config (for libopus and ONNX Runtime bindings)
Docker      with buildx (paths 2 to 4)
kubectl, helm, kind  (path 4)
cosign, syft, oras   (image-push and models-artifact only)
```

Build outputs:

| Component | Command | Output |
|---|---|---|
| Gateway | `make build-gateway` | `target/release/yuyin-gateway` |
| Console | `make build-console` | `apps/console/.next` (standalone output enabled) |
| Docs | `make build-docs` | `apps/docs/dist` |
| TypeScript SDK | `make build-sdk` | `packages/sdk-ts/dist` |
| Python SDK | `make build-sdk` | `packages/sdk-python/dist/*.whl` |
| CLI | `make build-cli` | `dist/cli/yuyin` (host); `make build-cli-all` for all targets |
| MCP server | `make build-mcp` | `packages/mcp/dist` |
| Self-host tarball | `make dist-selfhost` | `dist/yuyin-selfhost-{version}-linux-{arch}.tar.gz` with checksums |

Requirements:

- A clean clone builds with `make setup && make build` and nothing else. CI proves this in a fresh container on every PR to `staging`.
- Release builds are reproducible within one toolchain: `--locked`, `SOURCE_DATE_EPOCH` set from the commit, no timestamps embedded. A CI job builds the gateway twice and compares hashes.
- The gateway links statically where licences allow (musl target for the self-host tarball). How libopus and ONNX Runtime are linked is recorded in ADR-020.
- `yuyin-gateway --version` prints `VERSION` and the git SHA.

### 16.3 Path 2: Local deploy

Three ways to run locally, from fastest feedback to closest to production.

2a. Native development (`make dev`). Backing services run in Compose (`deploy/compose/docker-compose.dev.yml`: Postgres, Valkey, stripe-mock). The gateway runs on the host with `cargo watch`, the console with `bun dev`. `ENGINE=fake` by default so no models are needed. `ENGINE=onnx make dev` uses real models from `./models`.

```bash
make setup
cp .env.development.example .env.development
make dev
# gateway  http://127.0.0.1:8080   console  http://127.0.0.1:3000
curl -N http://127.0.0.1:8080/v1/speech \
  -H "Authorization: Bearer $YUYIN_DEV_API_KEY" -H "Content-Type: application/json" \
  -d '{"text":"नमस्ते, your OTP is 4512.","voice":"dev"}' --output out.ogg
```

2b. Native self-host binary (`make run-selfhost`). Builds the release gateway, generates a dev licence signed with a throwaway key, creates a local key, and starts the binary bound to `127.0.0.1`. This is what a customer runs on a single machine. A systemd unit (`deploy/systemd/yuyin-gateway.service`) and an install script are included in the tarball:

```bash
tar xzf yuyin-selfhost-<version>-linux-amd64.tar.gz && cd yuyin-selfhost-<version>
sudo ./install.sh --licence ./licence.json     # installs binary, models, unit; does not open any port beyond 127.0.0.1
sudo systemctl enable --now yuyin-gateway
yuyin-gateway admin keys create --name first
yuyin-gateway healthcheck
```

2c. Compose (`make up`). Runs the stack entirely from the OCI images built in path 3, so it tests the images, not the working tree.

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Backing services only, for `make dev` |
| `docker-compose.local.yml` | Full hosted-mode stack from local images: gateway, console, Postgres, Valkey, stripe-mock, with health checks and a one-shot model verifier |
| `docker-compose.selfhost.yml` | Self-host mode: gateway only, licence as a secret, read-only root filesystem |
| `docker-compose.prod.yml` | Single-node production: images pinned by digest, resource limits, internal network, reverse proxy, log rotation |

Every service has a health check, `depends_on` uses `condition: service_healthy`, and the gateway has `stop_grace_period: 150s` so drain behaviour matches Kubernetes.

Verification for every local path: `make smoke` runs `tests/smoke/` against the running stack and exits non-zero on any failure. It is the same suite used after a Helm install.

### 16.4 Path 3: OCI containerization

Images (OCI image format, multi-arch `linux/amd64` and `linux/arm64`):

| Image | Dockerfile | Base | Contents |
|---|---|---|---|
| `yuyin-gateway` | `deploy/docker/Dockerfile.gateway` | distroless `cc` or `static`, pinned by digest | Gateway binary, default models, licences |
| `yuyin-gateway-slim` | same file, `--target slim` | same | Gateway binary only; models come from a volume or OCI artifact |
| `yuyin-console` | `deploy/docker/Dockerfile.console` | distroless Node, pinned by digest | Next.js standalone output (for clusters that do not use Vercel) |
| `yuyin-mcp` | `deploy/docker/Dockerfile.mcp` | distroless, pinned by digest | MCP server |

Other OCI artifacts in GHCR:

| Artifact | Reference | How |
|---|---|---|
| Helm chart | `oci://ghcr.io/serverless-ventures/charts/yuyin` | `helm push` |
| Model bundle | `ghcr.io/serverless-ventures/yuyin-models:<models-version>` | `oras push` with a manifest of file checksums |
| SBOM and provenance | attached to each image digest | `cosign attest`, buildx attestations |

The `serverless-ventures` namespace is configuration (`REGISTRY`) until the repository moves (ADR-016).

Gateway Dockerfile (shape to follow; verify base image tags and tool versions at implementation time):

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

The `source` label must be taken from a build argument so it follows the repository location (ADR-016). Per ADR-018, the Rust build runs natively on each architecture's runner instead of cross-compiling or emulating; the `--platform=$BUILDPLATFORM` stages above apply to local single-architecture builds and are adapted in CI so each runner builds its own architecture, after which the per-architecture images are combined into one manifest list.

Image requirements (each is a CI check):

- Runs as non-root with a read-only root filesystem and no shell.
- Health check without a shell: `yuyin-gateway healthcheck` subcommand.
- All OCI annotation labels above are present and match `VERSION` and the commit.
- Base images pinned by digest and updated by Dependabot.
- No secrets, `.env` files, or licence files in any layer (`.dockerignore` plus a layer scan).
- Models layer is separate from the binary layer so a code change does not re-push models.
- Image size budget recorded in this document; CI warns on 10% growth.
- `make image-scan` clean of high and critical findings.

#### Image size budget

CI compares each image against these values and warns when an image grows by more than 10%.

| Image | Compressed size per architecture (amd64 / arm64) | Uncompressed size |
|---|---|---|
| `yuyin-gateway` (full) | to be measured in Sprint 3 | to be measured in Sprint 3 |
| `yuyin-gateway-slim` | to be measured in Sprint 3 | to be measured in Sprint 3 |
| `yuyin-console` | to be measured in Sprint 3 | to be measured in Sprint 3 |
| `yuyin-mcp` | to be measured in Sprint 3 | to be measured in Sprint 3 |
| Model bundle artifact | to be measured in Sprint 3 | to be measured in Sprint 3 |

Tagging:

```
:<version>            immutable, e.g. 1.0.0        (release.yml on signed tag)
:<major>.<minor>      moving, e.g. 1.0
:sha-<short-sha>      every merge to develop and staging
:staging              moving, latest staging build
Deployments reference images by digest, never by a moving tag.
```

Build, sign, push (what `make image-push` and `release.yml` run):

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
cosign sign --yes "$REGISTRY/charts/yuyin@<chart digest>"
```

Pushing to GHCR from a developer machine is allowed only for `:sha-` tags in a personal namespace. Version tags are pushed only by `release.yml`.

Verification a consumer can run:

```bash
cosign verify ghcr.io/serverless-ventures/yuyin-gateway:1.0.0 \
  --certificate-identity-regexp 'https://github.com/serverless-ventures/yuyin-tts/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

The identity regexp must match the repository that runs `release.yml` (ADR-016); today that is `mohnishbasha/stokeai-yuyin`.

### 16.5 Path 4: Helm chart on Kubernetes

Chart layout:

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

Key values (seed for `values.yaml`):

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
- Ingress proxy timeout of 660 s covers the 10 minute WebSocket limit.

Local Kubernetes deploy (the loop every developer and CI job uses):

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

Remote cluster install from the OCI chart:

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

Chart verification (CI, every PR that touches `deploy/` or the gateway):

1. `helm lint` and `helm template` with every values profile, output validated with `kubeconform`.
2. `values.schema.json` negative tests (missing digest, bad mode).
3. kind job: install with `values-kind.yaml`, `helm test`, smoke suite.
4. kind job: start 20 long streams, `helm upgrade` to a new image, assert zero cut streams.
5. kind job: `helm rollback`, smoke suite again.
6. `helm-docs` output is up to date.

### 16.6 CI and CD pipeline map

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | every PR | `make check`, image build for both architectures on native runners (no push), `make helm-lint` |
| `kind.yml` | PRs touching `deploy/` or `crates/`, and all PRs to `staging` | chart verification steps 3 to 5 |
| `deploy-staging.yml` | merge to `staging` | push `:sha-` and `:staging` images, sign, `helm upgrade` staging by digest, smoke suite |
| `release.yml` | signed `v*` tag | multi-arch images, SBOM, provenance, cosign, model artifact, OCI chart, CLI binaries, self-host tarball, GitHub Release |
| production deploy | owner, manually | `helm upgrade` by digest with canary, as in the Release Checklist |

Other workflows in the repository: `weekly-fuzz.yml` and `licence-check.yml`. Production promotion and live Stripe keys are owner actions.

### 16.7 Sprint ownership

| Sprint | Build and deployment work |
|---|---|
| 0 | Makefile, `make setup/build/check/dev`, Dockerfile skeletons, CI builds images |
| 3 | Real gateway image, `healthcheck` subcommand, minimal Helm chart, kind install in CI |
| 4 | Migration hook Job, Compose local stack with Postgres and Valkey |
| 6 | Signed multi-arch images, SBOM, staging deploy by digest, Terraform |
| 7 | Self-host binary, tarball, systemd unit, `docker-compose.selfhost.yml` |
| 8 | CLI binaries for all platforms |
| 11 | Chart completed: HPA, NetworkPolicy, all values profiles, OCI chart push, air-gap bundle, deployment docs |

### 16.8 Repository structure

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

Model weights are not committed to git. `scripts/fetch-models.sh` downloads them from the sources recorded in ADR-015 into `./models` and verifies checksums. CI caches them. Release images bake them in.

---

## 17. Failure modes table

Policy seed: if Redis is down, the gateway fails closed for organizations without a recent cached balance and serves others for up to 60 seconds from the local cache, then fails closed.

| Failure | Detection | Behaviour | Customer impact | Recovery |
|---|---|---|---|---|
| Redis unavailable | Command errors or timeouts; `yuyin_redis_errors_total`; readiness of dependency probe | Organizations with a recent cached balance and key record are served from the gateway's local cache for up to 60 s with local reservation accounting; organizations without one fail closed with 503 and a `Retry-After` header (error code `engine_unavailable`, the closest published code; the log reason is `dependency_unavailable`). After 60 s everyone fails closed | Brief window of normal service for active customers, then new requests rejected with 503; streams in progress finish | Redis restored or failed over; gateway rebuilds `bal:{org_id}` from Postgres and reconciles local reservations; alert clears when error rate returns to zero |
| Postgres unavailable | Batcher write errors; `yuyin_postgres_errors_total`; ledger queue depth rising | Synthesis continues using Redis state. Ledger events accumulate in the bounded queue and are retried with backoff; on queue overflow, admission applies backpressure (503) so no event is dropped. Key cache misses for unknown keys fail with 503 | Cached keys keep working; new keys and top-ups may not take effect; console is degraded | Postgres restored; batcher drains the queue (idempotent on `request_id`); daily reconciliation confirms balances |
| Stripe webhook delayed | Gap between Stripe event time and ledger credit; webhook error rate in console | Nothing in the gateway changes. Credits appear when the webhook lands (idempotent on event id) | Customer sees balance update late; requests may return 402 until it lands | Stripe retries automatically; operator can replay the event from the Stripe dashboard; the console offers a manual reconcile that fetches the event and applies it once |
| Model file corrupt | SHA-256 mismatch against the signed manifest at load, and on the model-verifier init step | Node refuses to load the model: `/readyz` stays false, no streams admitted. Engine errors return 503 `engine_unavailable` | None if other nodes are healthy; reduced capacity otherwise | Redeploy a known-good image or re-fetch the artifact; the Deployment never marks a bad pod ready, so the rolling update stalls and `--atomic` rolls back |
| Worker thread panic | `catch_unwind` at the pool boundary; `yuyin_worker_panics_total` | The affected stream is terminated, settled for delivered segments only, and logged without text. The worker thread is respawned. Repeated panics (threshold in config) flip readiness to false | One stream cut (WebSocket receives an `error` frame, REST connection is closed); billed only for delivered audio | Respawn is automatic; investigate with the request id; repeated panics trigger rollback |
| Client stalls reading | Bounded channel full for longer than the stall timeout; write timeout | Backpressure applies to that stream only. After the stall timeout (config) the stream is closed and settled for delivered segments | Only the stalled client is affected | Client reconnects; no operator action |
| Node OOM | Container OOM kill; restart count; memory gauge | All streams on the node are lost. Kubernetes restarts the pod; the model must warm up (readiness gates traffic). Reservations for lost streams expire by TTL and are released, and no delivered-character ledger event is written for them beyond what was already settled | Streams on that node end abruptly; clients retry on another node; characters delivered before the kill may be unbilled | Reservation TTL returns unused credit; raise memory request if recurring; capacity benchmark re-run if per-stream memory grew |
| Clock skew | `yuyin_clock_skew_seconds`; NTP offset alert; Redis and Postgres time compared at start and periodically | All time-sensitive logic uses server-side monotonic time or database time (ledger `created_at` from Postgres, TTLs in Redis). Licence checks tolerate a documented skew margin. Skew beyond the threshold flips a warning, and beyond a second threshold readiness is false | Possibly rejected licence (self-host), mis-ordered log lines; billing unaffected | Fix NTP or chrony on the node; restart if readiness was lost |
| Licence expired (self-host) | Offline Ed25519 verification at start and on a timer; `licence_expires_in_days` metric and log warnings before expiry | Warnings starting 30 days before expiry. After expiry plus the grace period stated in the EULA, the node stops admitting new streams (503) while letting streams in progress finish, and `/readyz` reports false. No outbound call is made | Self-host customer cannot start new streams after the grace period | Install a renewed `licence.json` (secret or file); the node reloads it on signal or restart. Usage report is exported offline for the vendor |

Notes on rows: Redis outage behaviour deliberately uses 503 with `Retry-After` for rejected requests so clients retry rather than treat it as a billing failure.

---

## 18. Environment model

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

Environment variables:

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

## 19. Dependency versions

To be pinned at implementation; starting constraints. Verify the latest stable release of every dependency at implementation time and pin it. The constraints below are starting points, not instructions to use an old version. Record the chosen versions in this section when pinned.

### Rust

Toolchain: Rust 1.100.0, pinned in `rust-toolchain.toml` (stable on 2026-11-13). Workspace `rust-version = "1.100"`. Shared lints live in `[workspace.lints]` in the root `Cargo.toml`; `yuyin-engine` and `yuyin-audio` repeat them with `unsafe_code = "deny"`. Pedantic allowlist: `module_name_repetitions` (crate-prefixed type names read better at call sites).

| Crate | Starting constraint | Notes |
|---|---|---|
| `tokio` | `1`, features `rt-multi-thread`, `macros`, `signal`, `sync`, `time` | |
| `axum` | `0.8`, features `ws`, `http2` | or current stable |
| `tower` | `0.5` | |
| `tower-http` | `0.6`, features `trace`, `limit`, `timeout`, `cors` | |
| `hyper` | `1` | |
| `serde` | `1`, feature `derive` | |
| `serde_json` | `1` | |
| `thiserror` | `2` | library error enums |
| `anyhow` | `1` | binaries, top level only |
| `tracing` | `0.1` | |
| `tracing-subscriber` | `0.3` | |
| `opentelemetry` | current stable | pin with its OTLP and tracing crates as one set |
| `metrics`, `metrics-exporter-prometheus` | current stable | ADR-019 (Proposed) |
| `sqlx` | `0.8`, features `postgres`, `runtime-tokio`, `tls-rustls`, `macros`, `migrate`, `uuid`, `time` | |
| `redis` | current stable, features `tokio-comp`, `script`, `connection-manager` | |
| `ort` | `2` | only if ADR-015 selects direct `ort` |
| `sherpa-onnx` bindings | current stable | only if ADR-015 selects it |
| `audiopus` or `opus` | current stable | libopus bindings; check licence and static linking (ADR-020) |
| `ogg` | current stable | |
| `rubato` | current stable | resampling, if needed |
| `unicode-normalization` | `0.1` | |
| `unicode-segmentation` | `1` | |
| `sha2` | `0.10` | |
| `subtle` | `2` | constant-time compare |
| `ed25519-dalek` | `2` | self-host licence verification |
| `uuid` | `1`, feature `v7` | |
| `time` | `0.3` | |
| `clap` | `4`, features `derive`, `env` | |
| `proptest` | `1` | dev |
| `criterion` | current stable | dev |
| `wiremock` | current stable | dev |

### TypeScript

| Package | Starting constraint |
|---|---|
| `next`, `react`, `tailwindcss` | current stable |
| `typescript` | `^5` |
| `@clerk/nextjs`, `stripe`, `zod` | current stable |
| `zustand` | `^5` |
| `@niledatabase/server` | current stable |
| `@modelcontextprotocol/sdk` | current stable |
| `vitest`, `@playwright/test`, `openapi-typescript` | current stable |
| `eslint` | `^9` |

### Python (SDK only)

| Package | Starting constraint |
|---|---|
| `httpx` | `>= 0.27` |
| `websockets` | `>= 13` |
| `pytest`, `pytest-asyncio`, `ruff`, `mypy` | current stable |

Rule: before adding any dependency not listed here, check its licence against the allowlist, check its maintenance status, and add a line to the decision log.

Coding standards that constrain these choices: Rust crates use `#![forbid(unsafe_code)]` except FFI with `// SAFETY:` comments; no `unwrap()`, `expect()`, or `panic!` outside tests and `main` startup; `clippy::pedantic` with `-D warnings`; no unbounded channels; timeouts on every network call. TypeScript runs `strict` with no `any`. Python is `ruff` and `mypy --strict` clean.

---

## 20. Modularity principles

1. The text front-end is pure. `yuyin-text` has no I/O, no async, no global state. It could be compiled to WASM and shipped to a browser unchanged.
2. The engine is replaceable. Nothing above `yuyin-engine` knows which model is running. A second engine must be addable without touching the gateway.
3. One counter. Character counting exists once. Everything else imports it.
4. One contract. `api/openapi.yaml` generates SDK types, docs, mock servers, and contract tests. Hand-written duplicates are a bug.
5. Control plane and data plane share only the database schema and the cache protocol. The console never calls the gateway's internals. The gateway never calls Clerk or Stripe.
6. Mode by trait, not by fork. Hosted and self-host differ only in the implementations bound at startup.
7. Clients are thin. CLI, MCP server, and Pi extension depend on the TypeScript SDK and contain no protocol logic of their own.
8. Config over code for anything a customer or operator may tune: prices, limits, capacity, voices, policy patterns.
9. Dependency direction: `gateway -> meter, engine, audio, text, licence`. Never the reverse. A CI check enforces it with `cargo deny` bans or `cargo-modules`.
10. Every seam named in Out of Scope has an interface today: `PaymentProvider`, `SynthesisEngine`, the output format enum, the language enum.
