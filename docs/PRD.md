# Yuyin Product Requirements Document

| Field | Value |
|---|---|
| Title | Yuyin: Streaming text-to-speech API for Hindi, Hinglish, and English |
| Version | 0.1.0 |
| Status | Draft |
| Date | 2026-11-10 |
| Owner | Serverless Ventures LLC |

Note: once this file is committed it supersedes `BUILD_PROMPT.md`. Where the two disagree, this document wins, and the disagreement must be recorded in the ARCHITECTURE decision log.

Conventions used in this document:

- "Character" means one Unicode scalar value (code point) of the submitted text after NFC normalisation and before text normalisation (see Pricing and billing rules).
- All money is integer micro-USD (1 USD = 1,000,000 micro-USD). No floating point anywhere in billing.
- Error bodies on every endpoint have the shape `{ "error": { "code": "...", "message": "...", "request_id": "..." } }`.
- Base URL is `https://api.getyuyin.com`. Authentication is `Authorization: Bearer yy_live_<prefix>_<secret>` (`yy_test_` for test mode, `yy_self_` for the self-host edition).
- Domain, npm scope, PyPI name, and trademark for the name "Yuyin" are unverified (see Open questions). The name appears in code only through the constants `PRODUCT_NAME`, `PRODUCT_SLUG`, and `KEY_PREFIX`.

---

## 1. Problem

Teams that build voice experiences for Indian users (voice bots, IVR flows, notification calls, assistants, accessibility features) need speech that sounds natural in Hindi, English, and the mixture of the two that people actually speak. Existing options have recurring gaps:

- Text that contains rupee amounts, dates, phone numbers, OTPs, and acronyms such as EMI, KYC, and UPI is often read wrongly. "₹12,450" becomes a string of symbols, an OTP is read as one large number, and "05/12/2026" is read in the wrong order.
- Switching language inside one sentence ("आपकी EMI due date कल है") often breaks the voice, changes the speaker, or produces a long pause.
- Audio is returned only after the whole text is synthesised, so a conversational application waits for the full response before it can start playing.
- Capacity is expensive or opaque. Many engines need GPUs, which makes cost unpredictable and makes it hard to run inside a customer's own data centre.
- Overload behaviour is not honest. Streams get cut mid-sentence, or requests hang with no clear status.

Yuyin is a streaming text-to-speech service that:

1. Accepts text over REST or WebSocket and streams audio back while synthesis is still running.
2. Reads Indian-context text correctly through a tested normalisation library with a published golden corpus.
3. Handles Hindi, Hinglish, en-IN, and en-US with mid-sentence switching in Devanagari or Roman script.
4. Serves from ordinary CPU servers, in a hosted AWS region (`ap-south-1`, Mumbai) or inside the customer's own network through a licensed self-host edition.
5. Bills prepaid credits per 1,000 characters, returns HTTP 402 when credits run out, returns HTTP 503 with a retry time before any audio when full, and never cuts a stream that is already running.

## 2. Users

| Persona | Description | What they need |
|---|---|---|
| Integrating developer | Builds a voice bot, IVR flow, or app feature | A key, a curl command, and audio in under five minutes. Clear errors. SDKs. Copy-paste docs |
| Voice platform engineer | Works at a bank, insurer, lender, or contact-centre vendor | Latency under load, correct reading of amounts and OTPs, data residency, predictable cost, key restrictions, reproducible benchmarks |
| Operator | Serverless Ventures staff who run the fleet | Fleet capacity view, abuse handling, suspension, refunds and credits with an audit trail |
| Self-host administrator | Deploys the gateway inside a private network with no outbound internet | One binary or one Helm chart, an offline licence, a local key store, an offline usage report |
| Speaker (secondary) | A person whose voice is used for a custom voice | A clear consent process and the ability to withdraw consent |

## 3. Goals and non-goals

### 3.1 Goals (v1.0.0)

- G1: Streaming synthesis over REST and WebSocket with honest admission control (503 before audio, never cut streams).
- G2: Correct reading of Indian-context text (numbers, currency, dates, phone numbers, OTPs, acronyms) backed by a golden corpus of at least 1,500 cases.
- G3: Four language modes (`hi`, `hinglish`, `en-IN`, `en-US`) plus `auto`, with mid-sentence switching.
- G4: Serve from CPU only. No GPU in the serving path.
- G5: Prepaid billing with a ledger that reconciles to zero against the gateway meter daily.
- G6: A self-host edition that makes zero outbound connections.
- G7: Consented custom voices only. No cloning from arbitrary audio.
- G8: Every published performance number comes from our own benchmark harness.

### 3.2 Non-goals (v1.0.0)

Each item below becomes one GitHub issue labelled `enhancement`.

| Item | Why deferred |
|---|---|
| Speech-to-text | Separate product line, needs its own models, data, and evaluation |
| Voice agent (speech-to-text plus LLM plus text-to-speech loop, telephony) | Depends on speech-to-text, large surface |
| Tamil, Telugu, Marathi, Bengali, Kannada, other Indic languages | Each needs a normaliser, a golden corpus, and a licence-clean voice |
| 8 kHz mu-law and A-law telephony output | Small, likely the first v1.1 item once a telephony customer asks |
| SSML and inline prosody tags | Needs a stable normaliser first |
| Word and viseme timestamps | Engine dependent |
| Training our own acoustic model | Research effort. The `SynthesisEngine` trait is the seam |
| Automated custom voice training pipeline | v1 has intake and consent. Training is an operator runbook |
| Razorpay, UPI, INR pricing with GST invoices | Needs an Indian entity or partner. The `PaymentProvider` interface is the seam |
| Postpaid invoicing and volume contracts | Sales motion, not product, for now |
| Multi-region active-active | Region is configuration. Add a second region when customer latency data says so |
| SOC 2, ISO 27001 | Evidence collection starts after launch |
| Hindi console localisation | Strings are already externalised |
| Batch and long-form synthesis (audiobooks) | Different latency and pricing profile |
| Go, Java, and other SDKs | After the OpenAPI file has been stable for a quarter |
| Audio watermarking of output | Evaluate provenance options after v1 |

Also not in v1: any GPU serving path, any third-party analytics, any voice cloning from audio that did not go through the consent workflow, and any claim about performance that our own benchmark did not measure.

---

## 4. User stories

Format: "As a (role), I (action) so that (outcome)". US-001 to US-030 are the seed set. US-031 onward are additions.

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
US-031  As a developer, I write Hinglish in Roman script ("aapka EMI kal due hai") and hear natural Hindi with the English words in English.
US-032  As a developer, I add a per-organization pronunciation override (for example "Yuyin" spoken as "yoo-yin") that applies only to my organization.
US-033  As a platform engineer, I am told with a distinct message when a key hit its monthly character cap, so I can tell it apart from an empty balance.
US-034  As a platform engineer, a key restricted to certain voices gets a 403 key_restricted when it asks for another voice.
US-035  As a developer, I try the playground in the console with a live waveform and a time-to-first-audio readout, without putting a long-lived key in my browser.
US-036  As a visitor, I try a limited live demo on the public site without signing up.
US-037  As an operator, I review a public abuse report and act on it (warn, restrict, suspend).
US-038  As a new organization, I am blocked with 403 policy_review_required if my text looks like an instruction to a listener to disclose an OTP, card number, or PIN, until I complete business verification.
US-039  As a billing contact, I see every credit, debit, grant, refund, and adjustment in a ledger with receipts, and I can download receipts.
US-040  As a platform engineer, I see how the status page and an incident banner reflect an outage without logging in.
US-041  As a self-host administrator, I generate a signed offline usage report and send it for true-up without sharing any text or audio.
US-042  As a developer on a browser client, I authenticate a WebSocket with a first message instead of a header, from an allowed origin.
US-043  As a developer, I send an idempotent request with `request_id` and a retry does not double-bill me.
US-044  As a security reviewer, I confirm that a key prefix is detectable by secret scanners and that secrets never appear in logs.
US-045  As a platform engineer, I read a published data inventory that states what personal data Yuyin stores, where, why, and for how long.
```

Mapping to personas: developer stories (US-001 to US-014, US-028 to US-032, US-035, US-036, US-039, US-042, US-043), platform engineer stories (US-015 to US-019, US-033, US-034, US-040, US-044, US-045), organization admin (US-020), self-host administrator (US-021, US-041), brand owner and speaker (US-022, US-023), operator (US-024 to US-026, US-037), new organization (US-038).

---

## 5. Functional requirements

Every FR has a description with inputs, outputs, and limits. FR-001 to FR-032 are the seed list. FR-033 onward are additions.

### FR-001 REST synthesis endpoint with streamed response body

`POST /v1/speech` accepts JSON and streams audio back using chunked transfer encoding.

- Input: `text` (string, required, 1 to 5,000 code points), `voice` (string, required, an id from `/v1/voices`), `language` (`auto` | `hi` | `hinglish` | `en-IN` | `en-US`, default `auto`), `format` (`opus` | `pcm` | `wav`, default `opus`), `pace` (number 0.5 to 2.0, default 1.0), `normalize` (boolean, default `true`), `request_id` (string, optional, idempotency and tracing).
- Output: HTTP 200 with `Content-Type` `audio/ogg; codecs=opus`, `audio/pcm;rate=24000`, or `audio/wav`. Headers `X-Request-Id`, `X-Yuyin-Voice`, `X-Yuyin-Chars`. Trailers `X-Yuyin-Chars-Billed`, `X-Yuyin-Ttfa-Ms`.
- Behaviour: the status line and headers are sent only after admission succeeds and either the first audio chunk is ready or 300 ms have passed, whichever is first, so pre-audio failures can still return a proper error status.
- Errors: 400, 401, 402, 403, 413, 422, 429, 503.

### FR-002 WebSocket synthesis endpoint with incremental text input

`wss://api.getyuyin.com/v1/speech/stream` accepts text in pieces and streams audio as binary frames.

- Auth: `Authorization` header, or first message `{ "type": "auth", "api_key": "..." }` for browsers.
- Client to server (JSON text frames): `start` (voice, language, format, pace), `text` (any number of times, partial sentences allowed), `flush`, `end`.
- Server to client: `started` (request_id, sample_rate 24000), binary audio frames in the requested format, `segment` (chars, ttfa_ms), `done` (chars_billed), `error` (code, message, retry_after).
- Behaviour: incoming text is buffered until a segment boundary or `flush`. Partial words are held until whitespace or punctuation arrives, which supports LLM token streaming. If the client stops reading, synthesis pauses (backpressure) rather than buffering without limit.
- Limits: 20,000 code points per connection, 10 minute maximum duration, 30 s idle timeout, server ping every 20 s.

### FR-003 Voice catalogue endpoint

`GET /v1/voices?language=&gender=&style=` and `GET /v1/voices/{id}`.

- Output: voice objects with `id` (stable slug), `display_name`, `languages`, `gender`, `style`, `sample_url`.
- Filters are optional and combine with AND. Private voices (custom voices) appear only for the owning organization. An id that is private to another organization returns 422 `unknown_voice`, identical to a nonexistent id.
- Limits: counts toward the per-key rate limit. Never billed.

### FR-004 Language handling: hi, hinglish, en-IN, en-US, auto

The `language` parameter selects the pronunciation rules and the text front end.

- `hi`: Hindi. `hinglish`: Hindi with English words, either script. `en-IN`: Indian English. `en-US`: American English. `auto` (default): detect per segment.
- Mid-sentence switching must keep the same voice and avoid a pause longer than the punctuation implies.
- An unsupported value returns 422 `unsupported_language`. A voice that does not support the chosen language returns 422 `unsupported_language`.

### FR-005 Script handling: Devanagari, Roman Hindi, English, mixed

The text front end accepts Devanagari ("नमस्ते"), Roman Hindi ("namaste"), English, and any mixture in one request.

- Input is NFC normalised before counting.
- Disallowed control characters are stripped. Text that is empty after stripping returns 400 `invalid_request`. Text is never truncated silently.
- Each segment is tagged with a language (`segments: [{ text, lang }]` in the normalise response).

### FR-006 Normalisation: cardinal and ordinal numbers, Indian numbering (lakh, crore)

Numbers are converted to spoken form in the selected language.

- Examples: "1,50,000" read as "ek lakh pachaas hazaar" (Hindi) or "one lakh fifty thousand" (en-IN). "3rd" read as "third" or "तीसरा". "12,45,00,000" read with crore.
- Both Indian grouping (1,50,000) and international grouping (150,000) parse to the same value.
- Limits: numbers up to 18 digits are read as numbers. Longer digit strings are read digit by digit.

### FR-007 Normalisation: currency (INR, USD), including paise and cents

Currency symbols and codes (₹, Rs, Rs., INR, $, USD) before or after an amount are read as currency.

- Examples: "₹12,450" read as "बारह हज़ार चार सौ पचास रुपये" or "twelve thousand four hundred fifty rupees". "₹99.50" read with paise. "$4.25" read with cents.
- Negative amounts and amounts with a trailing "/-" are handled. Unrecognised currency symbols are left to the engine and logged as a normaliser miss metric (not as text).

### FR-008 Normalisation: dates and times in common Indian and US formats

Dates (DD/MM/YYYY, DD-MM-YYYY, "5 Dec 2026", MM/DD/YYYY when `language` is `en-US`) and times (12 hour and 24 hour, with am or pm) are read in spoken form.

- Example: "05/12/2026" with language `hi`, `hinglish`, or `en-IN` is read as 5 December 2026. With `en-US` it is read as May 12, 2026.
- Ambiguity rule: day first for Indian languages, month first for `en-US`. When `language` is `auto`, day first unless the text is detected as `en-US`.
- Invalid dates (for example 31/02/2026) are read as digits, not as a date.

### FR-009 Normalisation: phone numbers, OTPs, PINs, account and card tails read digit by digit

Digit sequences identified as phone numbers, OTPs, PINs, account number tails, and card number tails are read one digit at a time with short pauses between groups.

- OTP: a 4 to 8 digit sequence preceded or followed by words such as OTP, code, PIN, या ओटीपी is read digit by digit at a slower local pace (about 0.85 of the request pace, never below 0.5).
- Phone: 10 digit Indian mobile numbers (with optional +91 or 0) are read in groups of 5 and 5, with "plus nine one" for +91.
- Card and account tails: "ending 4321" and "xxxx4321" read "four three two one".

### FR-010 Normalisation: acronym lexicon with per-tenant overrides

A built-in lexicon maps acronyms to spoken forms. Initial entries: EMI, KYC, UPI, PAN, IFSC, NEFT, RTGS, IMPS, GST, ATM, OTP, SMS, PIN, FD, RD, SIP, AMC, NRI, and others added over time.

- Tenant overrides are stored in `lexicon_entries(term, spoken_form, lang)` and apply only to the owning organization. A tenant override wins over the built-in entry.
- Limits: 500 entries per organization, term up to 64 code points, spoken form up to 256 code points.
- Overrides are managed in the console and loaded by the gateway with the key cache entry.

### FR-011 Normalisation: units, percentages, ranges, email addresses, URLs

- Units: "5 km", "2.5 kg", "₹ per month". Percentages: "8.5%" read as "eight point five percent". Ranges: "10-15" read as "ten to fifteen" in context.
- Email addresses and URLs are read in a spelled form ("support at example dot com"), with a documented rule for what is spelled and what is read as a word.
- Anything the normaliser cannot classify is passed through unchanged.

### FR-012 Normalisation preview endpoint (no audio, no charge, rate limited)

`POST /v1/normalize` with `{ text, language }` returns `{ segments: [{ text, lang }], chars }`.

- `text` is limited to the same 5,000 code points as synthesis. `chars` is the billing character count that synthesis would use.
- Never billed. Rate limited to 60 requests per minute per key. Applies the caller's tenant lexicon.
- Errors: 400, 401, 403, 413, 422, 429.

### FR-013 Pace control 0.5 to 2.0

`pace` is a number in `[0.5, 2.0]`, default 1.0, applied by the engine's native duration control or, where unavailable, by a pitch-preserving time stretch.

- Values outside the range return 400 `invalid_request` (not clamped silently at the API; clamping is internal only for local OTP slowdown).
- Measured output duration is within 5% of `baseline / pace` across the range.

### FR-014 Output formats: Opus in Ogg (default), raw PCM s16le, WAV, all at 24 kHz mono

- Opus: 24 kHz mono, 20 ms frames, default 32 kbps, Ogg pages flushed at least every 100 ms so players can start early.
- PCM: raw signed 16-bit little-endian samples, no header.
- WAV: streamed with a header whose data length is set to the maximum value. This is documented, since a streamed length is unknown up front.
- Over WebSocket, Ogg pages are sent as binary frames.
- Price differs for WAV (see Pricing).

### FR-015 API key lifecycle: create, list, rename, restrict, revoke, last-used

Managed in the console by users whose role permits it.

- Create: `name`, optional voice allowlist, optional `monthly_char_cap`. Key format `yy_live_{8 char prefix}_{base62 secret from 32 random bytes}`. The secret is shown exactly once.
- List: name, prefix, restrictions, created by, created at, last used at, revoked at. The secret and hash are never returned.
- Rename and restrict edit the key. Revoke is permanent.
- Storage: only the SHA-256 hash and the non-secret prefix are stored. Hashes are compared in constant time.
- Revocation takes effect fleet-wide within 10 seconds.

### FR-016 Prepaid balance, top-up through Stripe Checkout, ledger, receipts

- Top-up: preset amounts and a custom amount at or above the minimum ($5.00), paid through Stripe Checkout in payment mode behind a `PaymentProvider` interface.
- Webhooks handled: `checkout.session.completed` (credit), `charge.refunded` (reduce balance), `charge.dispute.created` (flag and hold). Signatures verified. Idempotent on the Stripe event id.
- Ledger is append-only with kinds `credit`, `debit`, `grant`, `refund`, `adjustment`. Receipts are available for each top-up.
- Balance updates within 5 seconds of a successful payment.

### FR-017 Launch grant on email verification, limited to the first N organizations

- On first email verification of an organization's owner, if fewer than `grant_limit` (placeholder 1,000) organizations hold a grant, a `grant` of 1,000,000 characters is written.
- One grant per organization and one per normalised owner email (case folded, plus-tags and dots handled for known providers).
- Grant characters are consumed before paid balance. Race-safe at the boundary.

### FR-018 Character metering by Unicode code point with reservation and settlement

- Count: Unicode scalar values of `text` after NFC, before normalisation. Whitespace and punctuation count.
- Reservation: before admission, the gateway atomically reserves the cost of the full text (`ceil(chars * price_per_1k / 1000)`) against the organization's cached balance (grant first).
- Settlement: at stream end the gateway computes delivered characters (the sum of character spans of segments whose audio was fully written to the socket), releases the difference, and enqueues a ledger event.
- Ledger events are written to Postgres in batches (every 500 ms or 200 events), idempotent on `request_id`.
- A failure before any audio is delivered bills zero. A client disconnect bills delivered segments only. Reservations carry a TTL so a crashed gateway cannot strand credit.

### FR-019 402 on insufficient credits, 503 with Retry-After at capacity, 429 on rate limit

- 402 `insufficient_credits`: balance (grant plus paid) cannot cover the reservation. Returned before any audio.
- 503 `at_capacity`: the node's admission semaphore is full. `Retry-After` in whole seconds, computed from the median remaining duration of active streams, clamped to 1 to 10. Returned before any audio.
- 429 `rate_limited`: per-key or per-organization limits exceeded. Defaults are 20 requests per second and 10 concurrent streams per key, configurable per organization. Includes `Retry-After`.
- 503 `engine_unavailable`: the engine cannot serve (for example during startup or after a failed model check).

### FR-020 Usage API and console usage views (by day, key, voice, format)

- `GET /v1/usage?from=&to=&group_by=day|key|voice|format` returns requests, characters, and cost in micro-USD per group. `from` and `to` are ISO 8601 dates (UTC). Maximum range 366 days.
- `GET /v1/balance` returns `{ balance_micro_usd, grant_chars_remaining }`.
- Console Usage and Billing screens show the same data. Totals equal ledger totals for the same period.

### FR-021 Organization management and roles (owner, admin, developer, billing)

Organizations map to Clerk organizations and are the tenant boundary.

| Role | Create and revoke keys | Pay and view billing | Invite users | Manage lexicon | Delete organization |
|---|---|---|---|---|---|
| owner | yes | yes | yes | yes | yes |
| admin | yes | yes | yes | yes | no |
| developer | yes | no | no | yes | no |
| billing | no | yes | no | no | no |

- Role checks run on the server for every action.

### FR-022 Playground in the console with live waveform and time-to-first-audio readout

- Text box with live character count and estimated cost (using the shared character counting code compiled to WASM so the count matches the bill), voice picker with samples, language, format, pace, a "show normalised text" toggle (calls `/v1/normalize`), and a copy-as-curl/TypeScript/Python panel.
- Plays over WebSocket with a live waveform. The time-to-first-audio readout is labelled as measured in this browser, including network.
- Uses a playground token valid 5 minutes, scoped to one organization, limited to the playground rate. A long-lived key is never placed in the browser.

### FR-023 Public marketing site with live demo, pricing, benchmarks page, FAQ, legal pages

- Live demo: fixed set of voices, 200 code point limit, per-IP and global rate limits. Served through a console route that holds a restricted key server side. Sample texts are original.
- Pricing page reads from the pricing table. Benchmarks page renders the latest `bench/results/*.json` and states that no result exists when none does for the production instance class.
- Legal pages: terms, privacy policy, acceptable use policy, data processing terms.
- No third-party analytics, session replay, or advertising pixels.

### FR-024 Documentation site with quickstart, API reference from OpenAPI, guides, changelog

- Quickstart (key to audio in three steps), streaming over REST, streaming over WebSocket with an LLM, normalisation guide with a table of what is read how, languages and code-switching, voices, pace and formats, billing and character counting, errors and retries, rate limits and capacity behaviour, security and data handling, SDK references, self-hosting, FAQ.
- API reference is generated from `api/openapi.yaml` (OpenAPI 3.1).
- Every code sample is executed in CI against the local stack. Changelog is built from `CHANGELOG.md`.

### FR-025 TypeScript SDK and Python SDK

- `@yuyin-tts/sdk` (Node 20+, Bun, Deno, browsers): `speak()` returns a `ReadableStream`, `speakToFile()` in Node, `stream()` WebSocket session with `write(text)`, `flush()`, `end()`, async iteration over audio chunks, typed errors per error code.
- `yuyin` on PyPI: sync and async clients, same surface, type hints, `py.typed`.
- Retries: backoff honouring `Retry-After` on 503 and 429. Never retry 402. Types are generated from OpenAPI.
- Publishing to npm and PyPI is an owner action.

### FR-026 Operator admin: organizations, suspension, credits, refunds, audit log

- Organizations list and detail, suspend and unsuspend, manual credit and debit with a required reason, refund trigger, key list (prefix only), abuse queue, custom voice queue, fleet capacity view, incident banner, audit log.
- Access requires an allowlisted user and a fresh session (re-authentication within 15 minutes for credit and suspension actions).
- Every operator action writes to `audit_log` (actor, action, target, metadata).
- A suspended organization receives 403 `org_suspended` on every key, effective fleet-wide within 10 seconds.

### FR-027 Self-host edition with offline licence validation and local usage report

- `YUYIN_MODE=selfhost`. Same gateway, local key store (embedded SQLite) with key prefix `yy_self_`, credit treated as unlimited within licence limits.
- Licence is a JSON document (customer, issued, expires, max nodes, max concurrent streams, voices, edition) with a detached Ed25519 signature. The public key is compiled in. Tampered, expired, and wrong-key licences produce distinct errors. Clock rollback is detected with a locally stored monotonic high-water mark.
- `yuyin-gateway admin keys create|list|revoke` and `admin usage-report --month YYYY-MM` (signed JSON: characters by day, peak concurrency, no text, no audio).
- Zero outbound connections. Binds to `127.0.0.1` unless `--bind` is given.

### FR-028 CLI

`yuyin` command: `login` (OS keychain, fallback to a 0600 config file), `speak "text" [-v voice] [-l lang] [-f opus|pcm|wav] [-p pace] [-o file | --play]` (also reads stdin), `stream` (reads stdin incrementally and speaks as lines arrive), `voices`, `normalize`, `balance`, `usage`.

- Exit codes are non-zero on every API error, and the error code is printed to stderr.
- Shell completions are provided. Binaries for linux, macOS, and Windows on amd64 and arm64 where supported.

### FR-029 MCP server

Tools: `yuyin_speak`, `yuyin_list_voices`, `yuyin_normalize`, `yuyin_status`, `yuyin_recommend_voice`, `yuyin_estimate_cost`.

- Strict input schemas that reject unknown fields. Tool descriptions state cost implications ("this call spends credits").
- `yuyin_speak` is limited to 2,000 code points per call and a per-session spend limit (`YUYIN_MCP_MAX_CHARS_PER_SESSION`, default 20,000).
- File output is restricted to an allowed directory (path safety). API error codes are preserved in MCP tool errors.

### FR-030 Custom voice intake: consent capture, upload, quality checks, status tracking

- A request cannot leave `draft` until it has three consent parts: a signed written statement, a spoken consent clip (speaker reads a statement with their name, the customer's name, and a one-time phrase), and identity verification of the speaker.
- Upload: direct-to-S3 multipart with presigned URLs into a KMS-encrypted, Object Lock bucket. About 30 minutes of speech expected.
- Automated checks: format, sample rate, duration, clipping, noise floor, silence ratio, speaker consistency between the consent clip and the recordings.
- States: `draft`, `submitted`, `consent_verified`, `in_training`, `review`, `ready`, `rejected`, `withdrawn`. Every state change is audited and emails the requester. Training is an operator runbook.
- A ready voice is `visibility: private` and usable only by the owning organization's keys.
- Withdrawal (by the speaker or the customer) disables the voice fleet-wide within 10 seconds, requests then return 422 `unknown_voice`, and the event is audited.

### FR-031 Acceptable use enforcement hooks and abuse report intake

- Sign-up requires accepting the acceptable use policy.
- Public abuse report form. Operator queue. Per-organization velocity alerts (sudden volume spikes from new accounts).
- New accounts that submit text matching a small configurable set of high-risk fraud patterns (instructions to a listener to disclose an OTP, card number, or PIN) are blocked with HTTP 403 `policy_review_required` and a link, until business verification is completed in the console. The pattern set lives in config and has tests.
- Operator can suspend an organization (see FR-026).

### FR-032 Status page feed and incident banner

- A first-party status page fed by a health prober that calls the public API from outside the fleet, showing per-component state and 90 day history.
- Operator can set a manual incident banner from the operator console. The banner appears on the console and site.
- A machine-readable feed (JSON) is available.

### FR-033 Input validation and request size limit (added)

- Maximum request body 64 KiB on every endpoint, checked before body parsing. Larger bodies return 413 `text_too_long`.
- `text` length is counted in code points after NFC. More than 5,000 returns 413 `text_too_long`. Empty text returns 400 `invalid_request`.
- Allowed Unicode categories only. Control characters stripped. Invalid UTF-8 returns 400 `invalid_request`.
- Authentication runs before any body parsing beyond the size check. Validation rejects, it never truncates silently.

### FR-034 WebSocket connection controls and browser auth (added)

- Browser clients authenticate with `{ "type": "auth", "api_key": "..." }` as the first message, or with a short-lived playground token. An origin allowlist applies to browser tokens.
- Per-connection limits: 20,000 code points, 10 minute maximum duration, 30 s idle timeout, server ping every 20 s. Protocol violations close the connection with an `error` message.
- Each WebSocket connection counts as one concurrent stream against the per-key limit while a segment is being synthesised.

### FR-035 API key secret scanning support (added)

- Keys have a fixed, documented prefix pattern (`yy_live_`, `yy_test_`, `yy_self_`) so secret scanners can detect them. The pattern is registered with GitHub secret scanning when the owner is ready.
- Keys never appear in logs, error messages, URLs, or any database column except as a hash.

### FR-036 Idempotent requests (added)

- If `request_id` is supplied, the ledger entry is idempotent on that id. A retry of a request with the same `request_id` that was already settled does not bill twice.
- The `request_id` is returned in `X-Request-Id` and in every error body.

---

## 6. Non-functional requirements

NFR-001 to NFR-017 are the seed list. NFR-018 onward are additions.

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
NFR-018  API key format and scanning: keys are 32 bytes from the OS CSPRNG, base62 encoded, with a
         fixed prefix (yy_live_, yy_test_, yy_self_) detectable by secret scanners. Constant time compare.
NFR-019  Request body limit 64 KiB. Authentication happens before body parsing beyond the size check.
NFR-020  WebSocket limits: 20,000 code points per connection, 10 minute maximum duration,
         30 s idle timeout, ping every 20 s, origin allowlist for browser tokens.
NFR-021  Data inventory: docs/DATA_INVENTORY.md lists every personal data item, where it is stored,
         why, and its retention. request_log retention is 30 days. Reviewed before every release.
NFR-022  Self-host edition makes zero outbound connections. A CI test runs it in a network
         namespace with no default route and asserts normal operation, plus a packet capture test.
NFR-023  The synthesis worker opens no network connections and reads no files outside
         YUYIN_MODEL_DIR. Enforced by a seccomp profile and a read-only root filesystem.
         Model files are verified by SHA-256 against a manifest signed at build time.
NFR-024  Supply chain: cargo audit, cargo deny, npm audit, and pip-audit in CI with high and critical
         findings blocking merge. Lock files committed. GitHub Actions pinned by commit SHA.
         Images signed with cosign keyless with an SPDX SBOM. Base images pinned by digest.
NFR-025  Telemetry: no third-party analytics, session replay, or advertising pixels in the console,
         site, CLI, or self-host edition. First-party operational metrics only.
NFR-026  Transport security: TLS 1.2 or later at the edge. HSTS on every hostname. /metrics and
         admin ports bind to the internal network only. Local development binds to 127.0.0.1.
NFR-027  Hot-path state degradation: if Redis is down, the gateway fails closed for organizations
         without a recent cached balance and serves others for up to 60 seconds from the local
         cache, then fails closed.
NFR-028  Performance claims: only numbers measured by our own benchmark harness are published, with
         hardware, corpus, method, and date.
```

---

## 7. Acceptance criteria

Format: `FR-0xx AC-n  Given ..., when ..., then ...`. Status codes and error codes follow the API contract.

### FR-001 REST synthesis

```
FR-001 AC-1  Given a valid key with credit, when it calls POST /v1/speech with
             {"text":"आपका स्वागत है","voice":"<valid id>"},
             then the response is HTTP 200 with Content-Type "audio/ogg; codecs=opus"
             and Transfer-Encoding chunked, and headers X-Request-Id, X-Yuyin-Voice, X-Yuyin-Chars are present.
FR-001 AC-2  Given a text of 1,000 characters, when the client reads with curl --no-buffer,
             then the first audio bytes arrive before synthesis of the full text finishes.
FR-001 AC-3  Given a completed stream, when the response ends,
             then trailers X-Yuyin-Chars-Billed and X-Yuyin-Ttfa-Ms are present.
FR-001 AC-4  Given a request with an unknown voice id, when it calls POST /v1/speech,
             then the response is HTTP 422 with error.code = "unknown_voice" and no audio bytes are sent.
```

### FR-002 WebSocket synthesis

```
FR-002 AC-1  Given an authenticated connection that sent {"type":"start",...},
             when the client sends {"type":"text","text":"Hello, "} then {"type":"text","text":"world."} then {"type":"end"},
             then the server sends "started", binary audio frames, one or more "segment" messages,
             and a final {"type":"done","chars_billed":14}.
FR-002 AC-2  Given a client sending one word every 50 ms, when synthesis proceeds on the test engine,
             then no gap in audio exceeds 400 ms beyond what the text timing implies.
FR-002 AC-3  Given a client that has sent {"type":"flush"} with buffered partial text,
             when the server receives it, then the buffered text is synthesised immediately.
FR-002 AC-4  Given a client that stops reading audio frames, when the send buffer is full,
             then synthesis pauses and memory use per connection stays bounded.
```

### FR-003 Voice catalogue

```
FR-003 AC-1  Given an authenticated key, when it calls GET /v1/voices?language=hi,
             then the response is HTTP 200 and every voice listed supports "hi".
FR-003 AC-2  Given a voice id that is private to another organization, when GET /v1/voices/{id} is called,
             then the response is HTTP 422 with error.code = "unknown_voice", identical to a nonexistent id.
FR-003 AC-3  Given a call to GET /v1/voices, when it completes, then no ledger entry is written.
```

### FR-004 Language handling

```
FR-004 AC-1  Given language "hinglish" and text "aapka EMI kal due hai",
             when synthesised, then the Hindi words are spoken in Hindi, "EMI" is spoken as letters, and "due" in English, in one voice.
FR-004 AC-2  Given language "fr", when POST /v1/speech is called,
             then the response is HTTP 422 with error.code = "unsupported_language".
FR-004 AC-3  Given language "auto" and the text "Your balance is ₹500. आपका बैलेंस पाँच सौ रुपये है.",
             when POST /v1/normalize is called,
             then segments contain one segment tagged "en-IN" or "en-US" and one tagged "hi".
```

### FR-005 Script handling

```
FR-005 AC-1  Given the text "नमस्ते" (6 code points), when POST /v1/normalize is called,
             then chars = 6.
FR-005 AC-2  Given the text "namaste" and "नमस्ते", when both are synthesised with the same voice and language "hi",
             then both produce audio and neither returns an error.
FR-005 AC-3  Given text containing a NUL or other control character, when POST /v1/speech is called,
             then control characters are stripped, the stripped text is synthesised, and chars counts the stripped text.
FR-005 AC-4  Given text that is empty after stripping, when POST /v1/speech is called,
             then the response is HTTP 400 with error.code = "invalid_request".
```

### FR-006 Numbers

```
FR-006 AC-1  Given language "en-IN" and text "1,50,000", when normalised,
             then the spoken form is "one lakh fifty thousand".
FR-006 AC-2  Given language "hi" and text "12,45,00,000", when normalised,
             then the spoken form uses crore ("बारह करोड़ पैंतालीस लाख").
FR-006 AC-3  Given the text "3rd" and language "en-IN", when normalised, then the spoken form is "third".
FR-006 AC-4  Given a digit string longer than 18 digits not matching another class, when normalised,
             then it is read digit by digit.
```

### FR-007 Currency

```
FR-007 AC-1  Given language "hi" and text "₹12,450", when normalised,
             then the spoken form is "बारह हज़ार चार सौ पचास रुपये".
FR-007 AC-2  Given language "en-IN" and text "Rs. 99.50", when normalised,
             then the spoken form is "ninety nine rupees fifty paise".
FR-007 AC-3  Given language "en-US" and text "$4.25", when normalised,
             then the spoken form is "four dollars twenty five cents".
FR-007 AC-4  Given the text "₹0.50", when normalised, then the spoken form is "fifty paise" with no rupees part.
```

### FR-008 Dates and times

```
FR-008 AC-1  Given language "hi" and text "05/12/2026", when normalised,
             then the spoken date is 5 December 2026.
FR-008 AC-2  Given language "en-US" and text "05/12/2026", when normalised,
             then the spoken date is May 12, 2026.
FR-008 AC-3  Given the text "31/02/2026", when normalised, then it is read as digits and not as a date.
FR-008 AC-4  Given the text "3:30 pm", when normalised, then the spoken form is "three thirty p m" in English
             or "शाम के साढ़े तीन बजे" in Hindi.
```

### FR-009 Digit-by-digit reading

```
FR-009 AC-1  Given the text "Your OTP is 482916", when normalised,
             then the spoken form is "four eight two nine one six" with pauses between digits,
             and the local pace is slower than the request pace.
FR-009 AC-2  Given the text "आपका ओटीपी 1357 है", when normalised, then digits are read one at a time in Hindi.
FR-009 AC-3  Given the text "+91 98765 43210", when normalised,
             then it is read as "plus nine one, nine eight seven six five, four three two one zero".
FR-009 AC-4  Given the text "card ending 4321", when normalised, then the tail is read "four three two one".
```

### FR-010 Acronym lexicon

```
FR-010 AC-1  Given the text "KYC pending", when normalised, then "KYC" is spoken as "K Y C".
FR-010 AC-2  Given organization A has an override term "EMI" spoken as "ee em aai" and organization B has none,
             when each calls POST /v1/normalize with "EMI",
             then A receives the override and B receives the built-in form.
FR-010 AC-3  Given an organization with 500 entries, when it adds a 501st,
             then the console rejects it with a clear message and nothing is stored.
```

### FR-011 Units, percentages, ranges, emails, URLs

```
FR-011 AC-1  Given the text "8.5%", when normalised, then the spoken form is "eight point five percent".
FR-011 AC-2  Given the text "5 km", when normalised, then the spoken form is "five kilometres".
FR-011 AC-3  Given the text "support@example.com", when normalised,
             then the spoken form is "support at example dot com".
FR-011 AC-4  Given a token that matches no class, when normalised, then it is passed through unchanged.
```

### FR-012 Normalisation preview

```
FR-012 AC-1  Given a valid key, when it calls POST /v1/normalize with {"text":"₹12,450","language":"hi"},
             then the response is HTTP 200 with segments and chars = 7, and no ledger entry is written.
FR-012 AC-2  Given a key that made 60 calls to /v1/normalize in the last minute,
             when it makes a 61st call, then the response is HTTP 429 with error.code = "rate_limited" and a Retry-After header.
FR-012 AC-3  Given text of 5,001 code points, when POST /v1/normalize is called,
             then the response is HTTP 413 with error.code = "text_too_long".
```

### FR-013 Pace

```
FR-013 AC-1  Given pace 2.0, when the same text is synthesised at pace 1.0 and 2.0,
             then the duration at 2.0 is within 5% of half the duration at 1.0.
FR-013 AC-2  Given pace 0.5, when synthesised, then duration is within 5% of twice the baseline.
FR-013 AC-3  Given pace 2.5 or 0.4, when POST /v1/speech is called,
             then the response is HTTP 400 with error.code = "invalid_request".
FR-013 AC-4  Given the time-stretch path is used, when a test tone is processed, then pitch shift is under 1%.
```

### FR-014 Output formats

```
FR-014 AC-1  Given format "opus", when the stream is decoded with a reference decoder,
             then the decoded duration is within 2% of the expected duration, sample rate 24000, mono.
FR-014 AC-2  Given format "pcm", when the body is read as s16le at 24000 Hz mono, then it decodes in ffmpeg without a header.
FR-014 AC-3  Given format "wav", when the response is received,
             then Content-Type is "audio/wav", the header declares the maximum data length, and common players decode it.
FR-014 AC-4  Given format "mp3", when POST /v1/speech is called,
             then the response is HTTP 400 with error.code = "invalid_request".
```

### FR-015 API key lifecycle

```
FR-015 AC-1  Given a developer creating a key named "prod", when creation succeeds,
             then the console shows the full secret once, and a later list shows only the prefix.
FR-015 AC-2  Given the database and all logs after key creation, when searched for the secret,
             then it is not found; only the SHA-256 hash and prefix are stored.
FR-015 AC-3  Given a key revoked at time T, when any gateway instance receives a request with it after T + 10 s,
             then the response is HTTP 401 with error.code = "invalid_api_key".
FR-015 AC-4  Given a key used at time T, when the list is viewed, then last_used_at is within 60 s of T.
FR-015 AC-5  Given a key with voice allowlist ["voice-a"], when it requests "voice-b",
             then the response is HTTP 403 with error.code = "key_restricted".
```

### FR-016 Billing and top-up

```
FR-016 AC-1  Given Stripe test mode, when a user pays $10.00 through Checkout,
             then the balance increases by 10,000,000 micro-USD within 5 s and a "credit" ledger row exists.
FR-016 AC-2  Given the same webhook event id delivered twice, when processed,
             then the balance increases once.
FR-016 AC-3  Given a custom amount of $4.99, when the user submits, then it is rejected as below the $5.00 minimum.
FR-016 AC-4  Given a charge.refunded event, when processed, then the balance is reduced and a "refund" ledger row is written.
FR-016 AC-5  Given a webhook with an invalid signature, when received, then it returns HTTP 400 and changes nothing.
```

### FR-017 Launch grant

```
FR-017 AC-1  Given fewer than 1,000 organizations hold a grant, when a new owner verifies their email,
             then a "grant" ledger row of 1,000,000 characters is written.
FR-017 AC-2  Given 1,000 organizations already hold a grant, when the 1,001st verifies,
             then no grant is written.
FR-017 AC-3  Given 50 concurrent verifications at the boundary, when all complete,
             then the grant count never exceeds the limit.
FR-017 AC-4  Given an owner email that normalises to the same address as an existing grant holder,
             when verified, then no second grant is written.
```

### FR-018 Metering

```
FR-018 AC-1  Given the text "आपकी EMI ₹12,450 है" (19 code points) at 2,000 micro-USD per 1,000 characters,
             when synthesised in full, then X-Yuyin-Chars = 19 and the debit is 38 micro-USD.
FR-018 AC-2  Given a client that disconnects after 3 of 5 segments were fully written,
             when settlement runs, then only the characters of those 3 segments are billed.
FR-018 AC-3  Given a failure before any audio byte, when the request ends, then the bill is zero and no debit row is written.
FR-018 AC-4  Given 500 parallel requests against a balance that covers exactly 100,
             when all run, then exactly 100 are admitted.
FR-018 AC-5  Given a duplicate request_id, when its ledger event is written twice, then the ledger holds one row.
FR-018 AC-6  Given a 1 micro-USD discrepancy injected between the ledger and the meter,
             when the daily reconciliation runs, then it is detected and an alert is raised.
```

### FR-019 402, 503, 429

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
FR-019 AC-3  Given a key that already has 20 requests in the current second (default limit),
             when it sends another, then the response is HTTP 429 with error.code = "rate_limited" and a Retry-After header.
FR-019 AC-4  Given an organization that tops up after a 402,
             when it retries within 10 s of the payment confirmation, then the request succeeds.
FR-019 AC-5  Given the engine is not loaded, when a request arrives, then the response is HTTP 503 with error.code = "engine_unavailable".
```

### FR-020 Usage

```
FR-020 AC-1  Given three requests on one day with 10, 20, and 30 characters, when GET /v1/usage?group_by=day is called,
             then the day row shows requests = 3 and chars = 60.
FR-020 AC-2  Given a period, when usage totals and ledger totals are compared, then they are equal.
FR-020 AC-3  Given GET /v1/balance, when called, then the response has balance_micro_usd and grant_chars_remaining as integers.
FR-020 AC-4  Given group_by=colour, when called, then the response is HTTP 400 with error.code = "invalid_request".
```

### FR-021 Organizations and roles

```
FR-021 AC-1  Given a user with role "billing", when they try to create an API key,
             then the server refuses the action and no key is created.
FR-021 AC-2  Given a user with role "developer", when they open the top-up page, then access is denied by the server.
FR-021 AC-3  Given two organizations, when a user of A forges B's tenant id in a request body, then B's rows are never returned.
FR-021 AC-4  Given an owner invites a user as "admin", when the invitation is accepted, then the user can create keys and pay.
```

### FR-022 Playground

```
FR-022 AC-1  Given the text "नमस्ते" in the playground, when typed, then the counter shows 6 and matches the bill for that text.
FR-022 AC-2  Given the user presses play, when audio starts, then a waveform animates and a time-to-first-audio value is shown labelled as measured in this browser.
FR-022 AC-3  Given a playground token older than 5 minutes, when used, then the gateway rejects it with HTTP 401 and error.code = "invalid_api_key".
FR-022 AC-4  Given the browser network log, when inspected, then no long-lived API key appears.
```

### FR-023 Public site

```
FR-023 AC-1  Given an anonymous visitor on the demo, when they submit 201 code points, then the demo rejects the input with a message.
FR-023 AC-2  Given no benchmark result exists for the production instance class, when the Benchmarks page loads,
             then it states that no result is available and shows no numbers.
FR-023 AC-3  Given any page of the site, when its network requests are inspected, then none go to a third-party analytics or advertising host.
FR-023 AC-4  Given the pricing page, when loaded, then displayed prices equal the current rows of the pricing table.
```

### FR-024 Documentation

```
FR-024 AC-1  Given the docs build, when run in CI, then every code sample is executed against the local stack and passes.
FR-024 AC-2  Given api/openapi.yaml, when the API reference is generated, then every endpoint and error code in this PRD appears.
FR-024 AC-3  Given a new developer following the quickstart, when they follow it, then they reach first audio in three steps.
```

### FR-025 SDKs

```
FR-025 AC-1  Given the TypeScript SDK, when speak() is called, then it returns a ReadableStream whose first chunk arrives before the stream ends.
FR-025 AC-2  Given a 503 response with Retry-After: 3, when the SDK retries, then it waits at least 3 s before retrying.
FR-025 AC-3  Given a 402 response, when the SDK receives it, then it throws a typed InsufficientCreditsError and does not retry.
FR-025 AC-4  Given the Python SDK, when the async client is used for a WebSocket session, then write, flush, and end behave as in the TypeScript SDK.
```

### FR-026 Operator admin

```
FR-026 AC-1  Given an operator who last authenticated 20 minutes ago, when they try to suspend an organization,
             then the console requires re-authentication before the action is applied.
FR-026 AC-2  Given an operator suspends organization A, when any of A's keys is used 10 s later,
             then the response is HTTP 403 with error.code = "org_suspended".
FR-026 AC-3  Given an operator adds a credit of 5,000,000 micro-USD with reason "goodwill",
             when saved, then an "adjustment" ledger row and an audit_log row with actor and reason exist.
FR-026 AC-4  Given a user who is not on the operator allowlist, when they open an operator route, then they receive HTTP 403.
```

### FR-027 Self-host

```
FR-027 AC-1  Given a valid licence, when the self-host gateway starts, then it serves /readyz = 200 and synthesises with a yy_self_ key.
FR-027 AC-2  Given a licence that is tampered, expired, or signed by the wrong key,
             when the gateway starts, then it refuses to start and reports a distinct error for each case.
FR-027 AC-3  Given a network namespace with no default route, when the gateway runs, then synthesis, key management, and metrics work and no outbound packet is sent.
FR-027 AC-4  Given a system clock set back below the stored high-water mark, when the gateway starts, then it reports clock rollback.
FR-027 AC-5  Given admin usage-report --month 2026-12, when run, then the output is signed, verifies with the public key, and contains no text or audio.
```

### FR-028 CLI

```
FR-028 AC-1  Given `echo "नमस्ते" | yuyin speak -o out.ogg`, when run with a valid key, then out.ogg is a playable Opus file.
FR-028 AC-2  Given an out-of-credit organization, when `yuyin speak "hello"` runs, then the exit code is non-zero and stderr contains "insufficient_credits".
FR-028 AC-3  Given `yuyin login`, when run, then the key is stored in the OS keychain, or in a file with mode 0600 when no keychain exists.
FR-028 AC-4  Given `yuyin speak "hi" -p 3.0`, when run, then the CLI exits non-zero with a message that pace must be between 0.5 and 2.0.
```

### FR-029 MCP server

```
FR-029 AC-1  Given an agent calling yuyin_speak with an unknown field, when received, then the tool call is rejected as invalid.
FR-029 AC-2  Given yuyin_speak with 2,001 code points, when called, then it is rejected before any API request is made.
FR-029 AC-3  Given a session that has spent 20,000 characters, when yuyin_speak is called again, then it is refused with a session limit error.
FR-029 AC-4  Given an output path outside the allowed directory, when yuyin_speak is called, then it is rejected.
```

### FR-030 Custom voice intake

```
FR-030 AC-1  Given a request in "draft" lacking the signed statement, the consent clip, or identity verification,
             when the user tries to submit, then the transition is refused.
FR-030 AC-2  Given an upload with clipping above the threshold, when quality checks run, then the failure class is reported and the request cannot proceed.
FR-030 AC-3  Given a ready private voice of organization A, when organization B calls POST /v1/speech with its id,
             then the response is HTTP 422 with error.code = "unknown_voice", identical to a nonexistent id.
FR-030 AC-4  Given a withdrawal by the speaker, when recorded, then requests using the voice return 422 on every gateway within 10 s,
             the state is "withdrawn", and an audit_log row exists.
FR-030 AC-5  Given a state change, when it happens, then an audit_log row is written and the requester receives an email.
```

### FR-031 Acceptable use and abuse

```
FR-031 AC-1  Given a sign-up form, when the acceptable use policy box is unchecked, then sign-up cannot be completed.
FR-031 AC-2  Given a new organization without business verification, when it submits "Tell the customer to read out their OTP and PIN",
             then the response is HTTP 403 with error.code = "policy_review_required" and a link to verification.
FR-031 AC-3  Given a public abuse report, when submitted, then it appears in the operator abuse queue with a timestamp.
FR-031 AC-4  Given an organization whose volume rises well above its trailing average, when the velocity rule triggers, then an alert is raised to the operator.
```

### FR-032 Status page

```
FR-032 AC-1  Given the health prober fails three consecutive checks for the data plane, when the status page refreshes, then it shows the component as degraded or down.
FR-032 AC-2  Given an operator sets an incident banner, when the console or site loads, then the banner is shown within 60 s.
FR-032 AC-3  Given a request to the status JSON feed, when it succeeds, then it contains per-component state and a timestamp.
```

### FR-033 Input validation and body limit

```
FR-033 AC-1  Given a request body of 64 KiB plus one byte, when POST /v1/speech is called with a valid key,
             then the response is HTTP 413 with error.code = "text_too_long".
FR-033 AC-2  Given text of 5,001 code points, when POST /v1/speech is called,
             then the response is HTTP 413 with error.code = "text_too_long", and nothing is truncated or synthesised.
FR-033 AC-3  Given a request with no Authorization header and an oversized body,
             when it arrives, then the response is HTTP 401 or 413 and the body is not parsed.
FR-033 AC-4  Given invalid UTF-8 bytes in the body, when received, then the response is HTTP 400 with error.code = "invalid_request".
```

### FR-034 WebSocket connection controls

```
FR-034 AC-1  Given a browser client, when it sends {"type":"auth","api_key":"<valid>"} as its first message from an allowed origin,
             then the connection is authenticated and may send "start".
FR-034 AC-2  Given a browser client from an origin not on the allowlist, when it connects with a playground token,
             then the connection is refused.
FR-034 AC-3  Given a connection that sends 20,001 code points in total, when the limit is crossed,
             then the server sends an "error" message with a code from the error list (text_too_long) and closes the connection.
FR-034 AC-4  Given a connection idle for 30 s, when the timeout passes, then the server closes it.
FR-034 AC-5  Given a connection open for 10 minutes, when the limit passes, then the server finishes the current segment and closes the connection.
FR-034 AC-6  Given a message that is not valid JSON or has an unknown "type", when received, then the server sends an "error" message with code "invalid_request" and closes.
```

### FR-035 Key prefix and secret scanning

```
FR-035 AC-1  Given any newly created key, when inspected, then it matches the pattern ^yy_(live|test)_[A-Za-z0-9]{8}_[A-Za-z0-9]{43}$ (secret from 32 random bytes in base62).
FR-035 AC-2  Given the gateway at log level debug, when a request with a key is processed, then the secret does not appear in any log line.
FR-035 AC-3  Given an invalid key with a valid prefix, when used, then the response is HTTP 401 with error.code = "invalid_api_key" and the error message does not reveal whether the prefix exists.
```

### FR-036 Idempotent requests

```
FR-036 AC-1  Given a request with request_id "r-123" that was settled for 38 micro-USD, when the same request_id is sent again,
             then the ledger holds one debit row for "r-123".
FR-036 AC-2  Given a request without request_id, when it completes, then the gateway generates one and returns it in X-Request-Id.
FR-036 AC-3  Given an error response, when received, then error.request_id equals the X-Request-Id header.
```

---

## 8. Pricing and billing rules

All prices below are placeholders until the owner confirms them (see Open questions). They live in the `pricing` table, seeded from `config/pricing.toml`.

### 8.1 Units and money

- Money is stored as integer micro-USD. 1,000,000 micro-USD = $1.00. No floating point.
- Billing unit: the number of Unicode scalar values (code points) in the submitted `text` after NFC and before normalisation. Whitespace and punctuation count. Matras and virama count. Example: "नमस्ते" is 6 characters. "आपकी EMI ₹12,450 है" is 19 characters.
- The same counting function (Rust, also compiled to WASM) is used by the gateway, the playground counter, `POST /v1/normalize` (`chars`), and the MCP `yuyin_estimate_cost` tool. A shared fixture of 200 strings must give identical counts in Rust and in the browser.
- Cost: `cost_micro_usd = ceil(chars * price_per_1k_micro_usd / 1000)`, using integer arithmetic.

### 8.2 Placeholder prices

| Item | Placeholder |
|---|---|
| Price per 1,000 characters, Opus and PCM | 2,000 micro-USD ($0.002) |
| Price per 1,000 characters, WAV | 2,400 micro-USD ($0.0024) |
| Minimum top-up | $5.00 (5,000,000 micro-USD) |
| Launch grant | 1,000,000 characters for the first 1,000 verified signups |

Worked examples:

| Text | Characters | Format | Cost |
|---|---|---|---|
| "आपकी EMI ₹12,450 है" | 19 | Opus | ceil(19 * 2000 / 1000) = 38 micro-USD |
| "Your OTP is 482916" | 18 | Opus | ceil(18 * 2000 / 1000) = 36 micro-USD |
| One 137-character message | 137 | Opus | 274 micro-USD |
| One 137-character message | 137 | WAV | ceil(137 * 2400 / 1000) = ceil(328.8) = 329 micro-USD |
| One character | 1 | WAV | ceil(2.4) = 3 micro-USD |

The `normalize` option does not change the bill: the count is taken before normalisation, so "₹12,450" counts as 7 characters even though it is spoken as several words.

### 8.3 Launch grant

- 1,000,000 characters for the first 1,000 organizations whose owner verifies an email address. Placeholder values are configurable.
- Recorded as a `grant` ledger row with `chars`. Grant characters are consumed before paid balance, regardless of format.
- A request that spans grant and paid balance consumes the remaining grant characters first and bills the remaining characters at the price for the format.
- One grant per organization and one per normalised owner email. The 1,001st organization receives none.
- `grant_chars_remaining` is returned by `GET /v1/balance`.

### 8.4 Reservation, 402 semantics, and monthly caps

- Before admission the gateway reserves the cost of the full text. If the reservation fails, the response is HTTP 402 `insufficient_credits`, sent before any audio byte, with no ledger entry.
- 402 is never retried by the SDKs. After a top-up, requests succeed again (the balance in the hot-path cache is updated by the same script as the webhook credit).
- A key `monthly_char_cap` is checked at reservation. When exceeded, the response is HTTP 402 with a message that names the cap (distinct from an empty balance). The error code for this case is an open question.
- Reservations carry a TTL so a crashed gateway cannot strand credit.

### 8.5 Partial delivery billing

- Failure before any audio byte is delivered: billed zero.
- Client disconnect, mid-stream error, or drain: billed only the characters of segments whose audio was fully written to the socket. The unused reservation is released.
- Completed stream: billed the full character count. `X-Yuyin-Chars-Billed` (REST trailer) and `done.chars_billed` (WebSocket) report the billed characters.
- Ledger events are idempotent on `request_id`, so retries never double-bill.

### 8.6 Refunds and adjustments

- Stripe refunds (`charge.refunded`) write a `refund` ledger row and reduce the balance. Disputes (`charge.dispute.created`) flag the organization for operator review.
- Operators can issue a goodwill credit or a manual debit with a required reason. These write `adjustment` ledger rows and an `audit_log` row with actor, reason, and amount.
- The ledger is append-only. No UPDATE or DELETE is permitted. Corrections are new rows.
- Postgres is the source of truth. Redis is a cache that can be rebuilt from the ledger. A daily reconciliation compares the recomputed balance, the Redis balance, and `usage_daily`, and alerts on any difference of 1 micro-USD or more.
- Test mode keys (`yy_test_`): billing treatment is an open question.

---

## 9. Abuse and consent policy summary

### 9.1 Acceptable use

- Sign-up requires accepting the acceptable use policy.
- Prohibited: impersonation, fraud, harassment, and deceptive robocalls, and any use that misleads a listener into thinking they are speaking to a person when the law or the platform requires disclosure.
- Enforcement: public abuse report form, operator queue, per-organization velocity alerts, suspension (all keys stop within 10 seconds, `org_suspended`), and a default block on new accounts for fraud-pattern text until business verification (`policy_review_required`).
- Every operator action is audited.

### 9.2 Voices and consent

- No voice cloning from arbitrary audio. Custom voices are created only through the consent workflow with identity verification of the speaker.
- No voices that imitate a real public figure. The intake form states this and the operator checks it.
- Consent has three parts: a signed written statement, a spoken consent clip with the speaker's name, the customer's name, and a one-time phrase, and identity verification.
- Consent recordings are stored in S3 with KMS encryption and Object Lock, access logged, and retrievable only by operators.
- Consent can be withdrawn by the speaker or the customer. Withdrawal disables the voice fleet-wide within 10 seconds, is recorded, and starts the recordings retention schedule. The business-day target for the operator to confirm is one business day.
- Private voices are visible only to the owning organization. Other organizations see 422 `unknown_voice`.

### 9.3 Data handling

- Text and audio are processed in memory and not stored. `request_log` keeps metadata only (no text, no audio) for 30 days.
- No third-party analytics anywhere. Server-side first-party page counts only.
- A personal data inventory is kept in `docs/DATA_INVENTORY.md`.

---

## 10. Open questions

### 10.1 Owner inputs (agent uses placeholders until told otherwise)

| # | Question | Placeholder in this document |
|---|---|---|
| OQ-01 | Price per 1,000 characters for Opus and PCM | 2,000 micro-USD |
| OQ-02 | Price per 1,000 characters for WAV | 2,400 micro-USD |
| OQ-03 | Minimum top-up | $5.00 |
| OQ-04 | Launch grant size and count | 1,000,000 characters, first 1,000 verified signups |
| OQ-05 | Voice names (original Indian and English first names generated in `config/voices.toml`, owner approves) | Generated list |
| OQ-06 | Is `getyuyin.com` available and registered by the owner? Fallback `yuyintts.com` | Unverified. Agent does not register anything |
| OQ-07 | Are the npm scope `@yuyin-tts` and PyPI name `yuyin` available? | Unverified |
| OQ-08 | Trademark search for "Yuyin". The word is generic in Chinese (语音) and may be hard to protect or to rank for | Unverified. Name is a single change set via `PRODUCT_NAME`, `PRODUCT_SLUG`, `KEY_PREFIX` |

### 10.2 Product and engineering questions

| # | Question |
|---|---|
| OQ-09 | The contract lists no error code for the monthly cap and for `policy_review_required`. Add `monthly_cap_exceeded` (402) and `policy_review_required` (403) to the contract and OpenAPI file, or reuse existing codes? This PRD uses `policy_review_required` and leaves the cap code open. |
| OQ-10 | Do `yy_test_` keys synthesise real audio, and are they billed? Proposed: real audio from a fixed test voice set, no charge, low rate limit. |
| OQ-11 | Can a refund drive a balance below zero (for example when credits were already spent)? Proposed: allow a negative balance, block new requests with 402, and flag for the operator. |
| OQ-12 | Does the launch grant expire? Proposed: no expiry in v1. |
| OQ-13 | Which speech engine and voices pass the Sprint 1 bake-off, and what are their licences (ADR-015)? NFR-017 depends on this. |
| OQ-14 | Do NFR-001 and NFR-002 hold on the chosen engine? Results come only from our benchmark harness. If they fail, a `type: perf` issue is opened and the numbers are not adjusted. |
| OQ-15 | EKS or ECS, and x86 or Graviton for the node group? Decided by benchmark and recorded as an ADR. |
| OQ-16 | Business verification process for lifting `policy_review_required`: who reviews and what documents are accepted? |
| OQ-17 | Identity verification provider for custom voice speakers (manual operator check in v1, or a vendor)? |
| OQ-18 | Retention period for consent recordings after withdrawal (legal review). |
| OQ-19 | Should billing characters be taken from the NFC text with control characters stripped (as in FR-005 AC-3) or from the raw text? Proposed: after NFC and after stripping control characters, so what the customer sees is what is billed. |
| OQ-20 | Private-repository and self-host licence pricing (edition tiers, per-node limits). Sales motion, outside v1 pricing. |
| OQ-21 | Hosted data residency promise: is `ap-south-1` the only region at launch? Proposed: yes, with the region as configuration. |
| OQ-22 | Legal entity and jurisdiction text for the terms, privacy policy, and data processing terms (owner and counsel). |
