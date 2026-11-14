# Yuyin Test Plan

| Field | Value |
|---|---|
| Version | 0.1.0 |
| Status | Draft |
| Date | 2026-11-10 |
| Owner documents | PRD.md, ARCHITECTURE.md, DESIGN.md, SPRINT_PLAN.md |

Every scenario below is currently ⚠️ Deferred because no code exists yet. The status changes to ✅ Automated when the test lands in the same PR as the feature, or to ❌ Skipped with a written reason and a manual step.

Status markers: ⚠️ Deferred, ✅ Automated, ❌ Skipped.

## 1. Strategy

1. Tests are written before the feature (TDD). A failing test is confirmed to fail for the right reason, then the feature is implemented.
2. Scenarios for a feature are added to this file before code is written, using the naming convention in section 4.
3. Everything above the engine layer runs against `FakeEngine`, which produces a deterministic sine sweep whose length is proportional to text length, with a configurable delay. Real models run in the nightly job and on staging only.
4. Real-engine audio is never compared byte for byte. It is checked by duration, sample rate, and decodability. Audio produced by `FakeEngine` is deterministic and may be compared exactly.
5. Normalisation is deterministic, so it is tested with a golden corpus. Pass rate must be 100% in CI (NFR-011). The corpus has at least 400 rows at the end of Sprint 1 and at least 1,500 rows by v1.0.0.
6. Two behaviours are never weakened to make a test pass or a build green:
   - A rejected request never receives an audio byte (admission and credit checks happen before the status line is sent).
   - An in-progress stream is never cut by a deploy, scale-in, overload, or licence expiry.
   Scenarios for both are marked "NEVER-WEAKEN" in the tables below. Changing or deleting them requires an ARCHITECTURE decision log entry.
7. Every fixed bug gets a regression test (`regression_{gh_issue_number}_{what_was_broken}`) in `tests/regression/`. Regression tests are never deleted. A wrong reading reported by a customer becomes a golden row and a regression test.
8. Automated tests cannot judge how speech sounds. Each release includes the manual listening protocol in section 11.
9. Performance numbers are targets to measure against, not claims. Capacity is the value written by the benchmark harness and is never hand-edited above the measured value (NFR-003).
10. Integration tests use real Postgres, Valkey (Redis protocol), and stripe-mock. No mocks of the database or the cache in integration tests.
11. CI target platforms: linux/amd64 and linux/arm64 for the gateway (NFR-014); macOS, Linux, and Windows for the CLI.

## 2. Test pyramid

| Layer | Share of tests (target) | Type | Runner | Location | Runs when |
|---|---|---|---|---|---|
| Base | Largest | Unit | cargo test, vitest, pytest | `tests/unit/` or inline | Every PR |
| Base | Large | Golden | cargo test | `crates/yuyin-text/golden/` | Every PR |
| Base | Medium | Property and fuzz | proptest, fast-check, cargo fuzz | alongside unit tests | Every PR (property), weekly (fuzz, 10 minute budget) |
| Middle | Medium | Integration | cargo test --ignored, vitest | `tests/integration/` | Every PR |
| Middle | Medium | Contract | custom, vitest | `tests/contract/` | Every PR |
| Middle | Small | Regression | cargo test, vitest | `tests/regression/` | Every PR |
| Top | Small | Smoke | shell scripts | `tests/smoke/` | Staging at every sprint end from Sprint 3 |
| Top | Small | E2E | Playwright | `apps/console/tests/e2e/` | Every PR (mock data), staging (real) |
| Top | Few | Load and soak | `bench/loadgen` | `bench/` | Nightly (short), release and Sprint 6 (full) |
| Top | Per release | Listening | score sheet | `out/listening/` | Every release |

## 3. Coverage targets

These values are copied from `.coverage-thresholds.toml`. CI fails when a measured value drops below its threshold. Targets are percentages of lines covered.

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

Measurement: `cargo tarpaulin --workspace`, `vitest --coverage`, `pytest --cov`. Coverage is checked at every PR and again at every sprint end.

## 4. Naming convention

Per-type forms from Appendix J:

```
Unit:        test_{module}_{function}_{scenario}_{expected_outcome}
Golden:      golden_{lang}_{class}_{id}
Integration: it_{component}_{operation}_{scenario}
Contract:    contract_{surface}_{operation}
Smoke:       smoke_{feature}_{minimal_assertion}
E2E:         e2e_{user_story_id}_{scenario}
Regression:  regression_{gh_issue_number}_{what_was_broken}
```

Protocol form used for scenario names in this document:

```
{type}_{module}_{operation}_{scenario}_{outcome}
```

where `type` is one of `unit`, `golden`, `prop`, `it`, `contract`, `smoke`, `e2e`, `perf`, `reg`. Names in the tables use the protocol form. Where the per-type form above applies (golden, contract, smoke, e2e, regression), the table name is the protocol form and the test function in code carries the matching per-type prefix. The test file must contain a test for every ✅ scenario when the feature PR merges.

Scenario ID prefixes: SC (scaffold), NM (normalisation), LT (language tagging), SG (segmentation), EN (engine), AU (audio encoders), RS (REST), WS (WebSocket), AK (auth), ML (metering and ledger), AD (admission), DR (draining), CN (console), SW (Stripe webhooks), OP (operator admin), SK (SDKs), CL (CLI), MC (MCP), SH (self-host licence), CV (custom voice intake).

## 5. Fixtures and golden files

| Fixture | Location | Purpose | Rules |
|---|---|---|---|
| Golden corpus | `crates/yuyin-text/golden/*.tsv` | Normalisation readings | Columns `id`, `lang`, `class`, `input`, `expected`, `notes`. Added with `scripts/golden-add.sh`. At least 400 rows after Sprint 1, at least 1,500 by v1.0.0. Row ids follow `golden_{lang}_{class}_{id}`. 100% must pass. |
| Roman Hindi lexicon | `crates/yuyin-text/data/` | Language tagging | At least 20,000 word forms, licence recorded |
| Acronym lexicon | `crates/yuyin-text/data/` | ACRONYM class | At least 300 entries |
| FakeEngine | `crates/yuyin-engine/` | Deterministic audio for all tests above the engine layer | Sine sweep, length proportional to text, configurable delay |
| Tiny test voice | CI only | Exercise the real ONNX path cheaply | Real models only in nightly job and on staging |
| Mock API server | generated from `api/openapi.yaml` | SDK, CLI, MCP fixtures | `scripts/validate-fixtures.sh` fails if any fixture does not match response shapes |
| stripe-mock | docker compose | Webhook and checkout tests | Signed payloads generated in tests |
| Postgres and Valkey | docker compose (`make up`) | Integration tests | Two-tenant seed for isolation tests |
| Benchmark corpus | `bench/corpus/*.txt` | Load and TTFA measurement | Original sentences in four languages |
| Devanagari render fixture | console test page | 50 strings with conjuncts and matras, snapshot-tested | NFR-015 |
| Listening sheet | `out/listening/{voice}/` | Human scoring | Generated by `scripts/listening-sheet.sh`, 40 rows per voice |
| Licence fixtures | `crates/yuyin-licence/tests/` | Valid, expired, in-grace, tampered, wrong-key licences | Test keypair only, never the production key |
| Consent and recording fixtures | `tests/fixtures/custom-voice/` | Intake quality checks | Synthetic audio only, no real speaker data |

Golden-file rules: a golden row is never edited to make a failing test pass unless the expected reading was wrong, in which case the change is reviewed and noted in `notes`. Fixtures contain no real phone numbers, card numbers, or bank-like messages.

## 6. Scenario tables

Columns: ID, test name, type, Given / When / Then summary, spec reference, sprint, status. Types: Unit, Golden, Property, Integration, Contract, Smoke, E2E, Perf, Regression.

### 6.1 Scaffold (Sprint 0)

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| SC-01 | smoke_scaffold_rust_workspace_clean_clone_builds | Smoke | Given a clean clone, when `cargo build --workspace` runs, then it exits 0 | ARCHITECTURE repo layout | S0 | ✅ Automated |
| SC-02 | smoke_scaffold_bun_workspace_clean_clone_builds | Smoke | Given a clean clone, when `bun install && bun run build` runs, then it exits 0 | ARCHITECTURE repo layout | S0 | ✅ Automated |
| SC-03 | smoke_scaffold_lint_rust_fmt_clippy_pass | Smoke | Given the scaffold, when `cargo fmt --check` and `cargo clippy --workspace -- -D warnings` run, then both exit 0 | NFR-014 | S0 | ✅ Automated |
| SC-04 | smoke_scaffold_lint_ts_lint_typecheck_pass | Smoke | Given the scaffold, when `bun run lint` and `bun run type-check` run, then both exit 0 with 0 warnings | ARCHITECTURE repo layout | S0 | ✅ Automated |
| SC-05 | it_ci_lint_gate_deliberate_error_fails | Integration | Given a PR with a deliberate lint error, when CI runs, then the lint job fails | SPRINT_PLAN S0-T04 | S0 | ⚠️ Deferred |
| SC-06 | it_ci_coverage_gate_below_threshold_fails | Integration | Given a PR that drops a crate below its threshold in `.coverage-thresholds.toml`, when CI runs, then the coverage job fails | SPRINT_PLAN S0-T04 | S0 | ⚠️ Deferred |
| SC-07 | smoke_scripts_check_versions_aligned_exits_0 | Smoke | Given `VERSION` is 0.1.0 and all package manifests match, when `scripts/check-versions.sh` runs, then it exits 0 | SPRINT_PLAN S0-T05 | S0 | ✅ Automated |
| SC-08 | smoke_scripts_check_versions_one_mismatch_exits_1_names_file | Smoke | Given one package version is changed, when `scripts/check-versions.sh` runs, then it exits 1 and the output names the mismatching file | SPRINT_PLAN S0-T05 | S0 | ✅ Automated |
| SC-09 | smoke_scripts_extract_changelog_unreleased_section_prints | Smoke | Given `CHANGELOG.md` with an `[Unreleased]` section, when `scripts/extract-changelog.sh` runs, then it prints that section | SPRINT_PLAN S0-T05 | S0 | ✅ Automated |
| SC-10 | smoke_scaffold_licence_check_all_deps_allowed_passes | Smoke | Given the dependency tree, when the licence check runs, then it exits 0 and a disallowed licence would fail it | NFR-017 | S0 | ⚠️ Deferred |
| SC-11 | it_ci_gitleaks_fake_live_key_rejected | Integration | Given a commit containing a fake `yy_live_` secret, when gitleaks runs, then it fails and names the finding | NFR-016 | S0 | ⚠️ Deferred |
| SC-12 | smoke_gateway_placeholder_healthz_returns_200 | Smoke | Given the placeholder gateway, when `GET /healthz` is called, then the status is 200 | SPRINT_PLAN S0-T13 | S0 | ⚠️ Deferred |
| SC-13 | smoke_image_gateway_oci_labels_present | Smoke | Given the built image, when its labels are inspected, then version and commit labels match `VERSION` and git | SPRINT_PLAN S0-T13 | S0 | ⚠️ Deferred |
| SC-14 | smoke_image_gateway_runs_as_non_root | Smoke | Given the built image, when the configured user is inspected, then it is not root | NFR-016 | S0 | ⚠️ Deferred |
| SC-15 | smoke_image_gateway_no_env_file_in_layers | Smoke | Given the built image, when its filesystem layers are scanned, then no `.env` file exists | NFR-016 | S0 | ⚠️ Deferred |
| SC-16 | smoke_image_multiarch_amd64_arm64_build | Smoke | Given a PR, when CI builds both architectures without pushing, then both succeed | NFR-014 | S0 | ⚠️ Deferred |
| SC-17 | smoke_agent_skills_run_sh_exit_0 | Smoke | Given `.agent/skills/{run-tests,check-types,run-golden,run-bench}/run.sh` are executable, when each runs on the scaffold, then each exits 0 | SPRINT_PLAN S0-T06 | S0 | ✅ Automated |
| SC-18 | contract_openapi_skeleton_lint_passes | Contract | Given `api/openapi.yaml`, when the OpenAPI linter runs, then it reports no errors | SPRINT_PLAN S0-T09 | S0 | ⚠️ Deferred |
| SC-19 | smoke_make_help_targets_not_yet_built_exit_0 | Smoke | Given a target for a later sprint, when `make <target>` runs, then it prints "available from Sprint N" and exits 0 | SPRINT_PLAN S0-T12 | S0 | ✅ Automated |
| SC-20 | smoke_workspace_lints_unsafecode_forbidden_rejectsunsafe | Smoke | Given an `unsafe` block added to each crate, when `cargo check` runs, then it fails via `forbid(unsafe_code)` in every crate except `yuyin-engine` and `yuyin-audio`, where it fails via `deny(unsafe_code)` and passes with a documented `#[allow(unsafe_code)]` | SPRINT_PLAN S0-T02 | S0 | ✅ Automated |
| SC-21 | smoke_workspace_toolchain_pinned_matchesfile | Smoke | Given `rust-toolchain.toml`, when its channel is read, then it is an exact version and matches the active `rustc` | SPRINT_PLAN S0-T02 | S0 | ✅ Automated |
| SC-22 | smoke_tsconfig_base_strictflags_enabled | Smoke | Given `tsconfig.base.json`, when a probe that only `strict`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes` rejects is type-checked, then each probe fails | SPRINT_PLAN S0-T03 | S0 | ✅ Automated |
| SC-23 | smoke_workspace_scripts_allfour_exitzero | Smoke | Given the Bun workspace, when `bun run lint`, `type-check`, `test`, and `build` run, then all four exit 0 | SPRINT_PLAN S0-T03 | S0 | ✅ Automated |
| SC-24 | smoke_agent_files_required_present_allexist | Smoke | Given the repository, when the agent files are checked, then every file from S0-T06 exists and carries the content Appendix J requires | SPRINT_PLAN S0-T06 | S0 | ✅ Automated |
| SC-25 | e2e_devstack_startup_allservices_healthzreturns200 | E2E | Given Docker is running and the default ports may be taken, when `scripts/dev.sh --detach` runs with the port override variables, then Postgres, Valkey, and stripe-mock are running and the gateway `/healthz` returns 200 | SPRINT_PLAN S0-T08 | S0 | ✅ Automated |
| SC-26 | unit_env_example_nosecrets_passesscan | Unit | Given `.env.development.example` is tracked, when gitleaks scans it, then it finds nothing, and the same file with a live-looking key added is flagged | SPRINT_PLAN S0-T08; NFR-016 | S0 | ✅ Automated |
| SC-33 | unit_make_help_alltargets_listed | Unit | Given the Makefile, when `make help` runs, then it lists every target named in ARCHITECTURE 16.1 and every Makefile target has a description | SPRINT_PLAN S0-T12 | S0 | ✅ Automated |
| SC-34 | e2e_make_setupbuildcheck_freshcontainer_exitszero | E2E | Given a clean clone in a fresh `rust` container with Bun and uv installed, when `make setup && make build && make check` runs, then it exits 0 | SPRINT_PLAN S0-T12; ARCHITECTURE 16.2 | S0 | ✅ Automated |

### 6.2 Normalisation

Normalisation is deterministic: the same input and options give the same output (determinism scenarios in 6.2.14). Language columns in the Given clause use hi, hinglish, en-IN, en-US. Expected readings below are summaries; the exact strings live in the golden corpus.

#### 6.2.1 MONEY

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-MON-01 | golden_hi_money_indian_grouping_lakh_reads_in_hindi | Golden | Given hi text "₹1,25,000", when normalised, then "एक लाख पच्चीस हज़ार रुपये" | FR-007, ARCH pipeline | S1 | ⚠️ Deferred |
| NM-MON-02 | golden_hi_money_western_grouping_parses_same_value | Golden | Given hi text "₹125,000", when normalised, then the reading equals NM-MON-01 | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-03 | golden_hi_money_paise_reads_rupees_and_paise | Golden | Given hi text "₹250.50", when normalised, then rupees and पैसे are both read | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-04 | golden_hi_money_lakh_crore_suffix_expands | Golden | Given "₹1.5 lakh" and "₹2 Cr", when normalised, then they read as डेढ़ लाख and दो करोड़ रुपये | FR-006, FR-007 | S1 | ⚠️ Deferred |
| NM-MON-05 | golden_hi_money_rs_trailing_slash_dash_form | Golden | Given "Rs 12,450/-", when normalised, then the trailing "/-" is dropped and the amount read in rupees | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-06 | golden_hi_money_prefix_variants_all_read_rupees | Golden | Given "Rs.", "INR", "रु" prefixes with the same amount, when normalised, then all read identically | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-07 | golden_hinglish_money_amount_in_roman_sentence_reads_hindi_digits | Golden | Given hinglish "Aapka EMI ₹4,500 hai", when normalised, then the amount is read in Hindi in the sentence language | FR-007, FR-004 | S1 | ⚠️ Deferred |
| NM-MON-08 | golden_en_in_money_indian_grouping_reads_lakh_in_english | Golden | Given en-IN "₹1,25,000", when normalised, then "one lakh twenty-five thousand rupees" | FR-007, FR-006 | S1 | ⚠️ Deferred |
| NM-MON-09 | golden_en_us_money_usd_with_cents | Golden | Given en-US "$1,234.56", when normalised, then "one thousand two hundred thirty-four dollars and fifty-six cents" | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-10 | golden_en_us_money_singular_one_dollar_one_cent | Golden | Given "$1.01", when normalised, then singular "dollar" and "cent" are used | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-11 | golden_en_us_money_usd_code_suffix | Golden | Given "250 USD", when normalised, then it reads as two hundred fifty US dollars | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-12 | golden_hi_money_usd_in_hindi_sentence_reads_dollar_in_hindi | Golden | Given hi sentence containing "$20", when normalised, then the amount is read in Hindi with डॉलर | FR-007 | S1 | ⚠️ Deferred |
| NM-MON-13 | golden_en_in_money_negative_amount_reads_minus | Golden | Given "-₹500", when normalised, then a spoken "minus" precedes the amount | FR-007 | S1 | ⚠️ Deferred |

#### 6.2.2 DATE

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-DAT-01 | golden_hi_date_dd_mm_yyyy_default | Golden | Given hi "05/03/2026", when normalised, then it reads as 5 March (day first) | FR-008, ARCH date rule | S1 | ⚠️ Deferred |
| NM-DAT-02 | golden_hinglish_date_dd_mm_yyyy_default | Golden | Given hinglish "05/03/2026", when normalised, then it reads as 5 March | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-03 | golden_en_in_date_dd_mm_yyyy_default | Golden | Given en-IN "05/03/2026", when normalised, then it reads as "the fifth of March" | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-04 | golden_en_us_date_mm_dd_yyyy_default | Golden | Given en-US "05/03/2026", when normalised, then it reads as "May third" | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-05 | golden_en_us_date_iso_always_parses | Golden | Given "2026-03-05" in every language, when normalised, then it reads as 5 March 2026 in all | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-06 | unit_text_date_ambiguous_never_swaps_across_locales | Unit | Given "05/03/2026" tagged en-IN and en-US, when normalised, then each follows only its own locale rule and neither silently swaps | FR-008, ARCH date rule | S1 | ⚠️ Deferred |
| NM-DAT-07 | golden_hi_date_unambiguous_day_over_12_parses | Golden | Given "25/03/2026" in en-US, when normalised, then the invalid month is not silently swapped and a defined fallback applies | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-08 | golden_hi_date_month_names_hindi | Golden | Given "5 मार्च 2026", when normalised, then the day number and year are read in Hindi | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-09 | golden_en_in_date_month_names_english | Golden | Given "5 March 2026", when normalised, then ordinal day, month, and year are read | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-10 | golden_hinglish_date_relative_words_untouched | Golden | Given "kal" or "tomorrow", when normalised, then relative words pass through unchanged | FR-008 | S1 | ⚠️ Deferred |
| NM-DAT-11 | golden_en_us_date_year_only_four_digit_reads_as_year | Golden | Given "in 2026", when normalised, then it reads "twenty twenty-six", not as a cardinal | FR-008, ARCH OTP rule | S1 | ⚠️ Deferred |

#### 6.2.3 TIME

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-TIM-01 | golden_en_in_time_12_hour_pm | Golden | Given "5:30 PM", when normalised, then "five thirty P M" | FR-008 | S1 | ⚠️ Deferred |
| NM-TIM-02 | golden_en_in_time_24_hour_hrs_suffix | Golden | Given "17:30 hrs", when normalised, then it reads as seventeen thirty hours | FR-008 | S1 | ⚠️ Deferred |
| NM-TIM-03 | golden_hi_time_12_hour_reads_in_hindi | Golden | Given hi "5:30 PM", when normalised, then it reads as साढ़े पाँच / पाँच बजकर तीस मिनट in the golden form | FR-008 | S1 | ⚠️ Deferred |
| NM-TIM-04 | golden_hi_time_on_the_hour | Golden | Given hi "9:00 AM", when normalised, then it reads as सुबह नौ बजे | FR-008 | S1 | ⚠️ Deferred |
| NM-TIM-05 | golden_en_us_time_noon_midnight_edge | Golden | Given "12:00 AM" and "12:00 PM", when normalised, then midnight and noon are read correctly | FR-008 | S1 | ⚠️ Deferred |
| NM-TIM-06 | golden_en_us_time_duration_reads_hours_minutes | Golden | Given "2h 15m", when normalised, then "two hours fifteen minutes" | FR-008 | S1 | ⚠️ Deferred |

#### 6.2.4 PHONE

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-PHN-01 | golden_hi_phone_indian_mobile_groups_5_5 | Golden | Given a 10-digit Indian mobile, when normalised, then digits are read one by one in groups of 5 and 5 | FR-009, ARCH phone rule | S1 | ⚠️ Deferred |
| NM-PHN-02 | golden_en_in_phone_plus_91_form_groups | Golden | Given "+91 98765 43210" (fictitious), when normalised, then "plus nine one" then groups 5 and 5 | FR-009 | S1 | ⚠️ Deferred |
| NM-PHN-03 | golden_en_us_phone_groups_3_3_4 | Golden | Given a US number "(555) 010-1234" style, when normalised, then digits read in groups 3, 3, 4 | FR-009 | S1 | ⚠️ Deferred |
| NM-PHN-04 | golden_hi_phone_digits_use_hindi_digit_words | Golden | Given hi sentence with a mobile number, when normalised, then digits use Hindi words including शून्य | FR-009 | S1 | ⚠️ Deferred |
| NM-PHN-05 | golden_hinglish_phone_with_separators_stripped | Golden | Given a number with spaces or hyphens, when normalised, then grouping is by the rule, not by the input separators | FR-009 | S1 | ⚠️ Deferred |

#### 6.2.5 OTP

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-OTP-01 | golden_en_in_otp_trigger_word_reads_digit_by_digit | Golden | Given "Your OTP is 482916", when normalised, then six digits read individually and pace_hint is 0.85 | FR-009, ARCH OTP rule | S1 | ⚠️ Deferred |
| NM-OTP-02 | golden_hi_otp_devanagari_trigger_kod | Golden | Given "आपका कोड 4829 है", when normalised, then digits read individually with pace_hint 0.85 | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-03 | golden_hinglish_otp_pin_trigger_word | Golden | Given "PIN 1234 daalein", when normalised, then digits read individually | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-04 | golden_en_us_otp_verification_trigger_8_digits | Golden | Given "verification 12345678", when normalised, then eight digits read individually | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-05 | unit_text_otp_four_digits_no_trigger_reads_cardinal | Unit | Given "1234 items" without trigger, when normalised, then it reads as a cardinal | FR-009, ARCH OTP rule | S1 | ⚠️ Deferred |
| NM-OTP-06 | unit_text_otp_four_digits_year_no_trigger_reads_year | Unit | Given "in 1999" without trigger, when normalised, then it reads as a year | FR-009, FR-008 | S1 | ⚠️ Deferred |
| NM-OTP-07 | unit_text_otp_three_and_nine_digits_not_otp | Unit | Given "OTP 123" and "OTP 123456789", when normalised, then neither is treated as an OTP (outside 4 to 8) | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-08 | unit_text_otp_pace_hint_is_0_85_on_segment | Unit | Given an OTP span, when segmented, then the segment carries pace_hint 0.85 | FR-009, FR-013 | S1 | ⚠️ Deferred |
| NM-OTP-09 | golden_hi_otp_postal_pin_code_after_pin_kod | Golden | Given "पिन कोड 560001", when normalised, then six digits read individually | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-10 | golden_en_in_otp_card_tail_ending_4417 | Golden | Given "card ending 4417" and "XXXX1234", when normalised, then tails read digit by digit | FR-009 | S1 | ⚠️ Deferred |
| NM-OTP-11 | golden_en_in_otp_pan_like_pattern_char_by_char | Golden | Given a PAN-like and an Aadhaar-like pattern, when normalised, then they read character by character | FR-009 | S1 | ⚠️ Deferred |

#### 6.2.6 CARDINAL

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-CAR-01 | unit_text_cardinal_hindi_0_to_99_table_complete | Unit | Given 0..99 in hi, when normalised, then each matches the irregular-form table (not a rule) | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-02 | golden_hi_cardinal_lakh_crore_arab | Golden | Given 12,34,56,789 and larger, when normalised in hi, then lakh, crore, arab are used | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-03 | golden_hinglish_cardinal_indian_grouping | Golden | Given hinglish numbers with Indian grouping, when normalised, then lakh and crore are used | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-04 | golden_en_in_cardinal_lakh_crore | Golden | Given en-IN "2,50,000", when normalised, then "two lakh fifty thousand" | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-05 | golden_en_us_cardinal_million_billion | Golden | Given en-US "2,500,000", when normalised, then "two million five hundred thousand" | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-06 | unit_text_cardinal_upper_bound_10_pow_15_handled | Unit | Given 10^15, when normalised, then it reads without panic or truncation | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-07 | golden_en_us_cardinal_decimals_negatives_fractions | Golden | Given "-3.14" and "1/2", when normalised, then "minus three point one four" and "one half" | FR-006 | S1 | ⚠️ Deferred |
| NM-CAR-08 | golden_hi_cardinal_decimals_hindi_point | Golden | Given hi "3.5", when normalised, then it reads with दशमलव or साढ़े per the golden form | FR-006 | S1 | ⚠️ Deferred |

#### 6.2.7 ORDINAL

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-ORD-01 | golden_en_us_ordinal_1st_2nd_3rd_4th | Golden | Given "1st 2nd 3rd 4th", when normalised, then first, second, third, fourth | FR-006 | S1 | ⚠️ Deferred |
| NM-ORD-02 | golden_en_in_ordinal_11th_12th_13th_exceptions | Golden | Given "11th 12th 13th", when normalised, then eleventh, twelfth, thirteenth | FR-006 | S1 | ⚠️ Deferred |
| NM-ORD-03 | golden_hi_ordinal_pehla_doosra_form | Golden | Given hi ordinal markers, when normalised, then पहला, दूसरा, तीसरा and regular forms from 5 up | FR-006 | S1 | ⚠️ Deferred |
| NM-ORD-04 | golden_hinglish_ordinal_in_mixed_sentence | Golden | Given a hinglish sentence with "3rd floor", when normalised, then the ordinal reads in the sentence's language | FR-006, FR-004 | S1 | ⚠️ Deferred |

#### 6.2.8 PERCENT

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-PCT-01 | golden_en_us_percent_integer | Golden | Given "15%", when normalised, then "fifteen percent" | FR-011 | S1 | ⚠️ Deferred |
| NM-PCT-02 | golden_en_in_percent_decimal | Golden | Given "8.5%", when normalised, then "eight point five percent" | FR-011 | S1 | ⚠️ Deferred |
| NM-PCT-03 | golden_hi_percent_hindi_word | Golden | Given hi "15%", when normalised, then "पंद्रह प्रतिशत" | FR-011 | S1 | ⚠️ Deferred |
| NM-PCT-04 | golden_hinglish_percent_p_a_suffix | Golden | Given "9% p.a.", when normalised, then percent and per annum are read | FR-011 | S1 | ⚠️ Deferred |

#### 6.2.9 UNIT

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-UNT-01 | golden_en_us_unit_kg_km_plural_agreement | Golden | Given "1 kg" and "5 km", when normalised, then "one kilogram" and "five kilometers" | FR-011 | S1 | ⚠️ Deferred |
| NM-UNT-02 | golden_en_in_unit_gb_mbps | Golden | Given "50 GB" and "100 Mbps", when normalised, then gigabytes and megabits per second | FR-011 | S1 | ⚠️ Deferred |
| NM-UNT-03 | golden_hi_unit_kg_in_hindi_sentence | Golden | Given hi sentence with "2 kg", when normalised, then "दो किलोग्राम" | FR-011 | S1 | ⚠️ Deferred |
| NM-UNT-04 | golden_hinglish_unit_unknown_unit_passes_through | Golden | Given an unrecognised suffix, when normalised, then it is left unchanged and the number still reads | FR-011 | S1 | ⚠️ Deferred |

#### 6.2.10 ACRONYM

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-ACR-01 | golden_en_in_acronym_kyc_emi_letter_by_letter | Golden | Given "KYC" and "EMI", when normalised, then each reads letter by letter | FR-010 | S1 | ⚠️ Deferred |
| NM-ACR-02 | golden_hi_acronym_pan_as_word | Golden | Given "PAN" in Indian usage, when normalised, then it reads as a word per the lexicon | FR-010, ARCH acronym rule | S1 | ⚠️ Deferred |
| NM-ACR-03 | unit_text_acronym_lexicon_has_at_least_300_entries | Unit | Given the built-in lexicon, when counted, then it has at least 300 entries covering banking, insurance, telecom, government | FR-010 | S1 | ⚠️ Deferred |
| NM-ACR-04 | unit_text_acronym_listed_set_all_present | Unit | Given EMI, KYC, UPI, PAN, IFSC, NEFT, GST, ATM, OTP, when looked up, then every one has an entry | FR-010 | S1 | ⚠️ Deferred |
| NM-ACR-05 | unit_text_acronym_tenant_override_wins | Unit | Given a tenant lexicon mapping a term to a spoken form, when normalised, then the override beats the built-in | FR-010 | S1 | ⚠️ Deferred |
| NM-ACR-06 | unit_text_acronym_tenant_override_cap_500 | Unit | Given 501 override entries, when loaded, then the 501st is rejected with a clear error | FR-010, ARCH acronym rule | S1 | ⚠️ Deferred |
| NM-ACR-07 | unit_text_acronym_crate_does_no_io | Unit | Given the crate, when overrides are needed, then they are passed in as a parameter and no file or network access occurs | FR-010 | S1 | ⚠️ Deferred |
| NM-ACR-08 | golden_en_us_acronym_unknown_uppercase_token_spelled | Golden | Given an unknown all-caps token, when normalised, then it is spelled letter by letter | FR-010 | S1 | ⚠️ Deferred |

#### 6.2.11 EMAIL

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-EML-01 | golden_en_us_email_at_dot_spoken | Golden | Given "support@example.com", when normalised, then "support at example dot com" | FR-011 | S1 | ⚠️ Deferred |
| NM-EML-02 | golden_hi_email_in_hindi_sentence_reads_at_dot | Golden | Given an email inside hi text, when normalised, then "एट" and "डॉट" are used | FR-011 | S1 | ⚠️ Deferred |
| NM-EML-03 | golden_en_in_email_underscore_hyphen_digits | Golden | Given "a_b-c1@example.in", when normalised, then underscore, dash, and digits are spoken | FR-011 | S1 | ⚠️ Deferred |

#### 6.2.12 URL

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-URL-01 | golden_en_us_url_dot_slash_spoken | Golden | Given "https://example.com/pay", when normalised, then "example dot com slash pay" with scheme handled per rule | FR-011 | S1 | ⚠️ Deferred |
| NM-URL-02 | golden_hi_url_in_hindi_sentence | Golden | Given a URL in hi text, when normalised, then "डॉट" and "स्लैश" are used | FR-011 | S1 | ⚠️ Deferred |
| NM-URL-03 | golden_en_in_url_query_string_trimmed_by_rule | Golden | Given a URL with a long query string, when normalised, then the documented reading rule applies | FR-011 | S1 | ⚠️ Deferred |

#### 6.2.13 RANGE

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-RNG-01 | golden_en_in_range_10_15_days | Golden | Given "10-15 days", when normalised, then "ten to fifteen days" | FR-011 | S1 | ⚠️ Deferred |
| NM-RNG-02 | golden_hi_range_hindi_se | Golden | Given hi "10-15 दिन", when normalised, then "दस से पंद्रह दिन" | FR-011 | S1 | ⚠️ Deferred |
| NM-RNG-03 | golden_en_us_range_money_range | Golden | Given "$5-$10", when normalised, then "five to ten dollars" | FR-011, FR-007 | S1 | ⚠️ Deferred |
| NM-RNG-04 | golden_hinglish_range_hyphenated_word_not_range | Golden | Given "e-mail" or "T-shirt", when normalised, then it is not treated as a range | FR-011 | S1 | ⚠️ Deferred |

#### 6.2.14 Cross-cutting: language, determinism, options

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| NM-LNG-01 | golden_hi_mixed_all_classes_in_hindi_sentence | Golden | Given a hi sentence with money, date, time, and OTP, when normalised, then every span is verbalised in Hindi | FR-004, FR-006..FR-011 | S1 | ⚠️ Deferred |
| NM-LNG-02 | golden_en_mixed_all_classes_in_english_sentence | Golden | Given an en-IN and an en-US sentence with the same classes, when normalised, then each is verbalised in English under its locale | FR-004, FR-006..FR-011 | S1 | ⚠️ Deferred |
| NM-LNG-03 | golden_hinglish_roman_hindi_transliterated_where_engine_needs | Golden | Given Roman Hindi, when the engine requires Devanagari, then the span is transliterated | FR-005, ARCH pipeline | S1 | ⚠️ Deferred |
| NM-DET-01 | prop_text_normalise_same_input_same_output | Property | Given arbitrary Unicode and fixed options, when normalised twice, then outputs are identical | NFR-011, ARCH determinism | S1 | ⚠️ Deferred |
| NM-DET-02 | prop_text_normalise_never_panics_on_arbitrary_unicode | Property | Given arbitrary Unicode including control characters, when normalised, then no panic occurs | FR-001, NFR-011 | S1 | ⚠️ Deferred |
| NM-DET-03 | prop_text_normalise_no_ascii_digits_when_normalize_true | Property | Given `normalize = true`, when normalised, then the output contains no ASCII digits | FR-006 | S1 | ⚠️ Deferred |
| NM-DET-04 | unit_text_normalise_nfc_and_control_char_strip | Unit | Given decomposed Devanagari and control characters, when normalised, then NFC applies and control characters are removed | ARCH pipeline | S1 | ⚠️ Deferred |
| NM-DET-05 | unit_text_normalise_normalize_false_passes_text_through | Unit | Given `normalize = false`, when processed, then semiotic verbalisation is skipped | FR-001, ARCH API contract | S1 | ⚠️ Deferred |
| NM-GLD-01 | golden_all_corpus_rows_pass_100_percent | Golden | Given the full corpus, when the harness runs, then every row passes | NFR-011 | S1 | ⚠️ Deferred |
| NM-GLD-02 | golden_corpus_size_gate_400_rows_at_s1_1500_at_v1 | Golden | Given the corpus, when counted, then at least 400 rows at Sprint 1 and at least 1,500 by v1.0.0 | NFR-011 | S1 | ⚠️ Deferred |
| NM-GLD-03 | fuzz_text_normalise_weekly_10_minute_budget_no_crash | Property | Given the cargo fuzz target, when run weekly for 10 minutes, then no crash is found | NFR-011 | S1 | ⚠️ Deferred |

### 6.3 Language tagging

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| LT-01 | unit_text_tag_devanagari_span_script_deva | Unit | Given Devanagari text, when tagged, then script is Deva and lang is hi | FR-005 | S1 | ⚠️ Deferred |
| LT-02 | unit_text_tag_latin_span_script_latn | Unit | Given English text, when tagged, then script is Latn and lang is en | FR-005 | S1 | ⚠️ Deferred |
| LT-03 | unit_text_tag_digits_and_symbols_script_classes | Unit | Given digits and symbols, when tagged, then they are tagged Digit and Symbol | FR-005 | S1 | ⚠️ Deferred |
| LT-04 | unit_text_tag_roman_hindi_lexicon_word_detected | Unit | Given "kya haal hai", when tagged, then the words are lang hi in Latn script via the lexicon | FR-005, FR-004 | S1 | ⚠️ Deferred |
| LT-05 | unit_text_tag_roman_hindi_unknown_word_ngram_scorer | Unit | Given an out-of-lexicon romanised Hindi word, when tagged, then the n-gram scorer decides | FR-005 | S1 | ⚠️ Deferred |
| LT-06 | unit_text_tag_lexicon_size_at_least_20000_forms | Unit | Given the bundled lexicon, when counted, then it has at least 20,000 forms and a recorded licence | FR-005, NFR-017 | S1 | ⚠️ Deferred |
| LT-07 | unit_text_tag_auto_infers_matrix_language_hindi | Unit | Given `auto` and a mostly Hindi sentence, when tagged, then sentence-level language is hi or hinglish per the rule | FR-004 | S1 | ⚠️ Deferred |
| LT-08 | unit_text_tag_auto_infers_matrix_language_english | Unit | Given `auto` and an English sentence, when tagged, then it resolves to en | FR-004 | S1 | ⚠️ Deferred |
| LT-09 | unit_text_tag_explicit_language_constrains_tagger | Unit | Given `language: "en-US"` and ambiguous text, when tagged, then the explicit value wins | FR-004 | S1 | ⚠️ Deferred |
| LT-10 | unit_text_tag_code_switch_hinglish_per_span_langs | Unit | Given "Aapka account KYC pending hai", when tagged, then Hindi and English spans carry their own langs | FR-004, FR-005 | S1 | ⚠️ Deferred |
| LT-11 | unit_text_tag_mixed_script_in_one_sentence | Unit | Given Devanagari and Latin in one sentence, when tagged, then spans split on script boundaries | FR-005 | S1 | ⚠️ Deferred |
| LT-12 | unit_text_tag_unsupported_language_value_rejected | Unit | Given `language: "fr"`, when validated, then `unsupported_language` is returned | FR-004, ARCH error codes | S1 | ⚠️ Deferred |
| LT-13 | prop_text_tag_spans_cover_input_exactly | Property | Given arbitrary text, when tagged, then spans are contiguous and cover the whole input | FR-005 | S1 | ⚠️ Deferred |

### 6.4 Segmentation

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| SG-01 | unit_text_segment_first_segment_capped_about_60_cp | Unit | Given a long sentence, when segmented, then the first segment is about 60 code points or fewer | ARCH pipeline, NFR-001 | S1 | ⚠️ Deferred |
| SG-02 | unit_text_segment_later_segments_capped_about_200_cp | Unit | Given long text, when segmented, then later segments are about 200 code points or fewer | ARCH pipeline | S1 | ⚠️ Deferred |
| SG-03 | unit_text_segment_split_on_danda | Unit | Given Hindi text with `।`, when segmented, then splits occur at the danda | FR-005 | S1 | ⚠️ Deferred |
| SG-04 | unit_text_segment_split_on_latin_punctuation | Unit | Given English with period, comma, semicolon, when segmented, then clause boundaries are used | ARCH pipeline | S1 | ⚠️ Deferred |
| SG-05 | unit_text_segment_first_split_at_earliest_safe_boundary | Unit | Given text with no punctuation before 60 cp, when segmented, then the earliest safe boundary is chosen and no word is cut | ARCH pipeline | S1 | ⚠️ Deferred |
| SG-06 | prop_text_segment_char_spans_exact_cover_of_original | Property | Given arbitrary text, when segmented, then `char_span` values tile the original text with no gap or overlap | FR-018, ARCH metering | S1 | ⚠️ Deferred |
| SG-07 | unit_text_segment_char_span_sum_equals_billed_chars | Unit | Given text, when segmented, then the sum of `char_span` lengths equals the code point count after NFC | FR-018 | S1 | ⚠️ Deferred |
| SG-08 | unit_text_segment_otp_segment_carries_pace_hint | Unit | Given an OTP, when segmented, then `pace_hint` is 0.85 on that segment only | FR-009 | S1 | ⚠️ Deferred |
| SG-09 | unit_text_segment_lang_preserved_per_segment | Unit | Given a code-switched sentence, when segmented, then each segment carries a lang | FR-004 | S1 | ⚠️ Deferred |
| SG-10 | unit_text_segment_semiotic_span_never_split_midway | Unit | Given a long number or email near a boundary, when segmented, then the span stays in one segment | FR-006..FR-011 | S1 | ⚠️ Deferred |
| SG-11 | unit_text_segment_empty_and_whitespace_only_yields_none | Unit | Given empty or whitespace-only text, when segmented, then no segments or a defined error | FR-001 | S1 | ⚠️ Deferred |

### 6.5 Engine

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| EN-01 | unit_engine_fake_synthesise_deterministic_output | Unit | Given `FakeEngine` and the same segment, when run twice, then samples are identical | ARCH engine | S1 | ⚠️ Deferred |
| EN-02 | unit_engine_fake_length_proportional_to_text | Unit | Given longer text, when synthesised, then duration grows proportionally | ARCH engine | S1 | ⚠️ Deferred |
| EN-03 | unit_engine_fake_configurable_delay_applied | Unit | Given a configured delay, when synthesised, then the first chunk is delayed by that amount | ARCH engine | S1 | ⚠️ Deferred |
| EN-04 | unit_engine_synthesise_cancel_token_stops_promptly | Unit | Given a cancelled token mid-segment, when synthesising, then it returns promptly and calls the sink no further | ARCH engine, FR-001 | S3 | ⚠️ Deferred |
| EN-05 | unit_engine_synthesise_sink_closed_returns_error | Unit | Given a sink that returns `SinkClosed`, when synthesising, then the engine stops and surfaces it | ARCH engine | S3 | ⚠️ Deferred |
| EN-06 | it_engine_onnx_real_voice_decodable_correct_sample_rate | Integration | Given a real model, when a segment is synthesised, then audio is 24 kHz and decodable, checked by duration not bytes | NFR-017, ARCH engine | S3 | ⚠️ Deferred |
| EN-07 | it_engine_onnx_emits_chunks_before_segment_complete | Integration | Given a streaming-capable model, when synthesising, then the first sink call occurs before the segment finishes | FR-001, NFR-001 | S3 | ⚠️ Deferred |
| EN-08 | it_engine_onnx_intra_op_threads_one | Integration | Given the engine config, when a session is created, then intra-op and inter-op threads are 1 | NFR-002 | S3 | ⚠️ Deferred |
| EN-09 | it_engine_warmup_returns_duration_and_marks_ready | Integration | Given a loaded model, when `warmup` runs, then it returns a duration and `/readyz` can become ready | NFR-012 | S3 | ⚠️ Deferred |
| EN-10 | it_engine_model_file_corrupt_fails_closed_not_ready | Integration | Given a corrupt model file, when starting, then checksum fails, `/readyz` stays 503, no traffic served | ARCH failure modes | S3 | ⚠️ Deferred |
| EN-11 | it_pipeline_worker_panic_stream_errors_worker_replaced | Integration | Given a worker that panics, when streaming, then the stream ends with an error event and the worker is replaced | ARCH failure modes | S3 | ⚠️ Deferred |
| EN-12 | it_pipeline_cpu_work_never_on_tokio_threads | Integration | Given load, when runtime threads are inspected, then synthesis runs only on worker-pool OS threads | ARCH pipeline | S3 | ⚠️ Deferred |
| EN-13 | it_pipeline_slow_client_backpressure_isolated_to_own_stream | Integration | Given one client that stops reading, when others stream, then only the slow stream pauses | ARCH pipeline | S3 | ⚠️ Deferred |
| EN-14 | it_pipeline_client_disconnect_cancels_synthesis | Integration | Given a client disconnect, when detected, then cancellation propagates and workers are released | FR-001, ARCH metering | S3 | ⚠️ Deferred |
| EN-15 | it_voices_registry_all_v1_voices_have_licence_ref | Integration | Given `config/voices.toml`, when loaded, then every voice has a licence reference and a recorded commercial-hosting permission | NFR-017 | S3 | ⚠️ Deferred |
| EN-16 | it_voices_registry_covers_four_languages | Integration | Given the registry, when queried, then at least 6 public voices cover hi, hinglish, en-IN, en-US | FR-003 | S3 | ⚠️ Deferred |
| EN-17 | it_engine_memory_with_all_voices_under_2_gib | Integration | Given all v1 voices loaded, when memory is measured, then it is at most 2 GiB | NFR-013 | S3 | ⚠️ Deferred |
| EN-18 | it_engine_cold_start_ready_within_20s | Integration | Given a cold gateway start, when timed to ready, then it is at most 20 s | NFR-012 | S3 | ⚠️ Deferred |
| EN-19 | unit_audio_pace_clamped_0_5_to_2_0 | Unit | Given pace values outside the range, when applied, then they are rejected at validation or clamped as specified | FR-013 | S3 | ⚠️ Deferred |
| EN-20 | unit_audio_wsola_pace_preserves_pitch_changes_duration | Unit | Given a model without native duration control, when pace is 2.0, then duration halves within tolerance and pitch is preserved | FR-013 | S3 | ⚠️ Deferred |
| EN-21 | it_engine_pace_0_5_and_2_0_duration_ratio | Integration | Given pace 0.5 and 2.0, when synthesising, then duration ratios are near 2x and 0.5x | FR-013 | S3 | ⚠️ Deferred |
| EN-22 | it_engine_bakeoff_adr_015_licence_recorded | Integration | Given the chosen engine, when ADR-015 is read, then it records at least three candidates, measurements, and the licence of the model and the phonemiser | NFR-017 | S1 | ⚠️ Deferred |

### 6.6 Audio encoders

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| AU-01 | unit_audio_opus_encode_24khz_mono_decodes | Unit | Given a sine sweep, when encoded to Opus in Ogg, then it decodes at 24 kHz mono with matching duration | FR-014 | S3 | ⚠️ Deferred |
| AU-02 | unit_audio_opus_frame_size_20ms | Unit | Given PCM, when encoded, then Opus frames are 20 ms | FR-014 | S3 | ⚠️ Deferred |
| AU-03 | unit_audio_opus_default_bitrate_32kbps | Unit | Given default options, when encoded, then bitrate is about 32 kbps | FR-014 | S3 | ⚠️ Deferred |
| AU-04 | unit_audio_opus_ogg_pages_flushed_within_100ms | Unit | Given a streaming encode, when pages are timed, then none is held longer than 100 ms of audio | FR-014, NFR-001 | S3 | ⚠️ Deferred |
| AU-05 | unit_audio_ogg_first_page_has_headers_and_decodes_progressively | Unit | Given the first bytes, when fed to a decoder, then playback can start before the stream ends | FR-001, FR-014 | S3 | ⚠️ Deferred |
| AU-06 | unit_audio_pcm_s16le_samples_exact | Unit | Given f32 samples, when converted, then output is s16le with defined clipping and rounding | FR-014 | S3 | ⚠️ Deferred |
| AU-07 | unit_audio_pcm_clipping_no_wraparound | Unit | Given samples beyond range, when converted, then values clip and never wrap | FR-014 | S3 | ⚠️ Deferred |
| AU-08 | unit_audio_wav_header_streaming_max_data_length | Unit | Given a streamed WAV, when the header is read, then data length is the documented maximum value and RIFF fields are consistent | FR-014 | S3 | ⚠️ Deferred |
| AU-09 | unit_audio_wav_decodes_24khz_mono_16bit | Unit | Given WAV output, when decoded, then it is 24 kHz mono 16-bit | FR-014 | S3 | ⚠️ Deferred |
| AU-10 | unit_audio_all_formats_same_duration | Unit | Given the same input, when encoded to opus, pcm, wav, then durations match within one frame | FR-014 | S3 | ⚠️ Deferred |
| AU-11 | prop_audio_encode_never_panics_on_arbitrary_samples | Property | Given arbitrary f32 including NaN and inf, when encoded, then no panic and output is valid | FR-014 | S3 | ⚠️ Deferred |
| AU-12 | unit_audio_opus_chunk_boundaries_no_click_discontinuity | Unit | Given segment joins, when encoded, then there is no discontinuity above a threshold at joins | FR-014 | S3 | ⚠️ Deferred |
| AU-13 | contract_audio_content_type_per_format | Contract | Given each format, when the response is built, then Content-Type is `audio/ogg; codecs=opus`, `audio/pcm;rate=24000`, or `audio/wav` | FR-014, ARCH API | S3 | ⚠️ Deferred |

### 6.7 REST endpoint

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| RS-01 | it_rest_speech_hindi_opus_streams_chunked | Integration | Given a valid key and Hindi text, when `POST /v1/speech`, then 200 with chunked transfer and Opus audio | FR-001 | S3 | ⚠️ Deferred |
| RS-02 | it_rest_speech_first_bytes_before_synthesis_complete | Integration | Given a long text with `FakeEngine` delay, when streaming, then first audio bytes arrive before the last segment is synthesised | FR-001, NFR-001 | S3 | ⚠️ Deferred |
| RS-03 | it_rest_speech_response_headers_present | Integration | Given a success, when headers are read, then X-Request-Id, X-Yuyin-Voice, X-Yuyin-Chars are present | FR-001 | S3 | ⚠️ Deferred |
| RS-04 | it_rest_speech_trailers_billed_chars_and_ttfa | Integration | Given a success, when the trailers are read, then X-Yuyin-Chars-Billed and X-Yuyin-Ttfa-Ms are present | FR-001, FR-018 | S3 | ⚠️ Deferred |
| RS-05 | it_rest_speech_format_pcm_and_wav_decode | Integration | Given `format` pcm and wav, when requested, then both decode with expected duration | FR-014 | S3 | ⚠️ Deferred |
| RS-06 | it_rest_speech_default_format_is_opus | Integration | Given no `format`, when requested, then audio is Opus | FR-014 | S3 | ⚠️ Deferred |
| RS-07 | it_rest_speech_defaults_language_auto_pace_1_normalize_true | Integration | Given only `text` and `voice`, when requested, then defaults apply | FR-004, FR-013 | S3 | ⚠️ Deferred |
| RS-08 | it_rest_speech_missing_text_returns_400_invalid_request | Integration | Given no `text`, when requested, then 400 `invalid_request` with the error body shape and request_id | FR-001, ARCH errors | S3 | ⚠️ Deferred |
| RS-09 | it_rest_speech_empty_text_returns_400 | Integration | Given empty `text`, when requested, then 400 | FR-001 | S3 | ⚠️ Deferred |
| RS-10 | it_rest_speech_5000_cp_accepted | Integration | Given exactly 5000 code points, when requested, then 200 | FR-001, FR-018 | S3 | ⚠️ Deferred |
| RS-11 | it_rest_speech_5001_cp_returns_413_text_too_long | Integration | Given 5001 code points, when requested, then 413 `text_too_long` and no audio | FR-001, ARCH errors | S3 | ⚠️ Deferred |
| RS-12 | it_rest_speech_unknown_voice_returns_422 | Integration | Given an unknown voice id, when requested, then 422 `unknown_voice` | FR-003, ARCH errors | S3 | ⚠️ Deferred |
| RS-13 | it_rest_speech_unsupported_language_returns_422 | Integration | Given `language: "fr"`, when requested, then 422 `unsupported_language` | FR-004 | S3 | ⚠️ Deferred |
| RS-14 | it_rest_speech_pace_out_of_range_returns_400 | Integration | Given pace 0.4 or 2.1, when requested, then 400 | FR-013 | S3 | ⚠️ Deferred |
| RS-15 | it_rest_speech_pace_bounds_0_5_and_2_0_accepted | Integration | Given pace 0.5 and 2.0, when requested, then 200 | FR-013 | S3 | ⚠️ Deferred |
| RS-16 | it_rest_speech_malformed_json_returns_400 | Integration | Given malformed JSON, when requested, then 400 | FR-001 | S3 | ⚠️ Deferred |
| RS-17 | it_rest_speech_error_status_sent_only_after_admission | Integration | Given pre-audio failure (admission, credit), when it occurs, then a proper error status is returned, not 200 with a broken body | FR-019, ARCH admission | S3 | ⚠️ Deferred |
| RS-18 | it_rest_speech_headers_sent_after_first_chunk_or_300ms | Integration | Given a slow engine, when requested, then the status line is sent at the first chunk or at 300 ms, whichever is first | FR-001, SPRINT_PLAN S3-T07 | S3 | ⚠️ Deferred |
| RS-19 | it_rest_speech_request_id_idempotency_echo | Integration | Given a caller `request_id`, when requested, then X-Request-Id echoes it and a repeat does not double-bill | FR-001, FR-018 | S3 | ⚠️ Deferred |
| RS-20 | it_rest_voices_list_and_filter | Integration | Given voices, when `GET /v1/voices?language=hi&gender=&style=`, then results are filtered | FR-003 | S3 | ⚠️ Deferred |
| RS-21 | it_rest_voices_get_by_id_and_404 | Integration | Given an id, when `GET /v1/voices/{id}`, then the voice or a not-found error is returned | FR-003 | S3 | ⚠️ Deferred |
| RS-22 | it_rest_voices_private_voice_hidden_from_other_tenants | Integration | Given a private voice owned by tenant A, when tenant B lists, then it is absent | FR-003, FR-030, NFR-008 | S12 | ⚠️ Deferred |
| RS-23 | it_rest_normalize_returns_segments_and_chars_no_charge | Integration | Given a key, when `POST /v1/normalize`, then `{segments, chars}` are returned and the balance is unchanged | FR-012 | S3 | ⚠️ Deferred |
| RS-24 | it_rest_normalize_rate_limited_60_per_minute_per_key | Integration | Given 61 calls in a minute, when the 61st arrives, then 429 | FR-012, FR-019 | S3 | ⚠️ Deferred |
| RS-25 | it_rest_normalize_returns_no_audio | Integration | Given normalize, when called, then the response has no audio content | FR-012 | S3 | ⚠️ Deferred |
| RS-26 | it_rest_healthz_200_while_alive | Integration | Given a running gateway, when `GET /healthz`, then 200 | ARCH API | S3 | ⚠️ Deferred |
| RS-27 | it_rest_readyz_200_when_warm_503_when_not | Integration | Given warming then warm, when `GET /readyz`, then 503 then 200 | NFR-012 | S3 | ⚠️ Deferred |
| RS-28 | it_rest_metrics_not_reachable_from_public_listener | Integration | Given the public listener, when `GET /metrics`, then it is not served (internal network only) | ARCH API | S3 | ⚠️ Deferred |
| RS-29 | it_rest_metrics_expose_required_series | Integration | Given traffic, when metrics are scraped, then `yuyin_active_streams`, `yuyin_capacity_streams`, `yuyin_ttfa_seconds`, `yuyin_rtf`, `yuyin_requests_total`, `yuyin_chars_total`, `yuyin_rejected_total`, `yuyin_worker_queue_depth` exist | ARCH observability | S3 | ⚠️ Deferred |
| RS-30 | it_rest_logs_contain_metadata_only_no_text | Integration | Given a request, when logs and `request_log` are inspected, then no request text or audio is present | NFR-007 | S3 | ⚠️ Deferred |
| RS-31 | contract_rest_speech_matches_openapi | Contract | Given the mock server from `api/openapi.yaml`, when requests and responses are validated, then they conform | FR-001, FR-024 | S3 | ⚠️ Deferred |
| RS-32 | contract_rest_error_body_shape_all_endpoints | Contract | Given each error code, when returned, then body is `{error:{code,message,request_id}}` with the documented HTTP status | ARCH errors | S3 | ⚠️ Deferred |
| RS-33 | it_rest_balance_returns_micro_usd_and_grant_remaining | Integration | Given a funded org, when `GET /v1/balance`, then both fields are returned | FR-016, FR-017 | S4 | ⚠️ Deferred |
| RS-34 | it_rest_usage_group_by_day_key_voice_format | Integration | Given requests, when `GET /v1/usage?group_by=...`, then totals match `usage_daily` for each grouping | FR-020 | S4 | ⚠️ Deferred |
| RS-35 | it_rest_usage_invalid_group_by_returns_400 | Integration | Given `group_by=foo`, when requested, then 400 | FR-020 | S4 | ⚠️ Deferred |

### 6.8 WebSocket endpoint

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| WS-01 | it_ws_stream_start_text_end_yields_started_audio_done | Integration | Given a valid key, when start, text, end are sent, then `started`, binary frames, `segment`, `done` arrive in order | FR-002 | S3 | ⚠️ Deferred |
| WS-02 | it_ws_stream_started_carries_request_id_and_sample_rate_24000 | Integration | Given a start message, when `started` is read, then request_id and sample_rate 24000 are present | FR-002 | S3 | ⚠️ Deferred |
| WS-03 | it_ws_stream_word_by_word_text_yields_continuous_audio | Integration | Given text sent one word at a time, when streaming, then audio flows without gaps beyond a threshold | FR-002 | S3 | ⚠️ Deferred |
| WS-04 | it_ws_stream_partial_word_held_until_whitespace_or_punct | Integration | Given token-style partial words, when sent, then a partial word is not synthesised until whitespace or punctuation | FR-002 | S3 | ⚠️ Deferred |
| WS-05 | it_ws_stream_flush_synthesises_buffered_text_now | Integration | Given buffered partial sentence, when `flush` is sent, then it is synthesised immediately | FR-002 | S3 | ⚠️ Deferred |
| WS-06 | it_ws_stream_segment_event_has_chars_and_ttfa | Integration | Given a segment, when finished, then `segment` has `chars` and `ttfa_ms` | FR-002 | S3 | ⚠️ Deferred |
| WS-07 | it_ws_stream_done_chars_billed_matches_ledger | Integration | Given a completed stream, when `done` is read, then `chars_billed` equals the ledger debit chars | FR-002, FR-018 | S4 | ⚠️ Deferred |
| WS-08 | it_ws_stream_auth_header_accepted | Integration | Given an Authorization header, when connecting, then the connection is accepted | FR-002, FR-015 | S3 | ⚠️ Deferred |
| WS-09 | it_ws_stream_first_message_auth_for_browsers | Integration | Given no header and first message `{type:auth, api_key}`, when sent, then the connection proceeds | FR-002 | S3 | ⚠️ Deferred |
| WS-10 | it_ws_stream_invalid_key_error_event_and_close | Integration | Given a bad key, when connecting, then an `error` with `invalid_api_key` is sent and the socket closes with no audio | FR-002, FR-015 | S3 | ⚠️ Deferred |
| WS-11 | it_ws_stream_origin_check_rejects_disallowed_origin | Integration | Given a disallowed Origin, when connecting, then it is rejected | NFR-016, SPRINT_PLAN S6-T06 | S6 | ⚠️ Deferred |
| WS-12 | it_ws_stream_limit_20000_cp_per_connection | Integration | Given text beyond 20,000 code points total, when the limit is crossed, then an error event with the documented code is sent and the connection closes after in-flight audio completes | FR-002 | S3 | ⚠️ Deferred |
| WS-13 | it_ws_stream_max_duration_10_minutes | Integration | Given a connection at 10 minutes, when the limit is reached, then it is closed cleanly (test uses a scaled clock) | FR-002 | S3 | ⚠️ Deferred |
| WS-14 | it_ws_stream_idle_timeout_30s | Integration | Given no client frames for 30 s, when the timer fires, then the connection closes (scaled clock) | FR-002 | S3 | ⚠️ Deferred |
| WS-15 | it_ws_stream_unknown_message_type_error_not_crash | Integration | Given an unknown `type`, when sent, then an `error` event and the stream survives or closes per spec | FR-002 | S3 | ⚠️ Deferred |
| WS-16 | it_ws_stream_text_before_start_error | Integration | Given `text` before `start`, when sent, then an error event | FR-002 | S3 | ⚠️ Deferred |
| WS-17 | it_ws_stream_unknown_voice_error_event_422_semantics | Integration | Given unknown voice in `start`, when sent, then an error event with `unknown_voice` and no audio | FR-003 | S3 | ⚠️ Deferred |
| WS-18 | it_ws_stream_client_stops_reading_pauses_then_closes_after_30s | Integration | Given a client that stops reading, when 30 s pass, then synthesis paused and then the stream closes; only that stream is affected | FR-002, ARCH pipeline | S3 | ⚠️ Deferred |
| WS-19 | it_ws_stream_client_disconnect_bills_only_delivered_segments | Integration | Given a mid-stream disconnect, when settled, then only fully written segments are billed | FR-018 | S4 | ⚠️ Deferred |
| WS-20 | it_ws_stream_error_event_includes_retry_after_on_capacity | Integration | Given a full node, when connecting, then `error` carries `at_capacity` and `retry_after` | FR-019 | S3 | ⚠️ Deferred |
| WS-21 | it_ws_stream_binary_frames_ogg_pages_for_opus | Integration | Given `format: opus`, when audio arrives, then each binary frame is Ogg page data and concatenation decodes | FR-014 | S3 | ⚠️ Deferred |
| WS-22 | contract_ws_protocol_messages_match_spec_schema | Contract | Given recorded sessions, when validated against the message schemas, then all conform | FR-002 | S3 | ⚠️ Deferred |
| WS-23 | it_ws_stream_per_key_concurrent_stream_limit_10 | Integration | Given 11 concurrent streams on one key, when the 11th starts, then it is rejected with 429 semantics | FR-019 | S4 | ⚠️ Deferred |

### 6.9 Auth

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| AK-01 | it_keys_create_returns_secret_once_with_format | Integration | Given a developer, when a key is created, then the format is `yy_live_{8 char prefix}_{32 byte base62}` and the secret is shown once | FR-015 | S4 | ⚠️ Deferred |
| AK-02 | it_keys_store_only_sha256_hash_and_prefix | Integration | Given a created key, when the row is read, then only hash and prefix exist, never the secret | NFR-009 | S4 | ⚠️ Deferred |
| AK-03 | it_keys_list_shows_prefix_and_last_used | Integration | Given keys, when listed, then prefix and last_used_at are shown and the secret is not | FR-015 | S4 | ⚠️ Deferred |
| AK-04 | it_keys_rename_updates_name_only | Integration | Given a key, when renamed, then only the name changes | FR-015 | S4 | ⚠️ Deferred |
| AK-05 | it_keys_restrict_voice_allowlist_403_key_restricted | Integration | Given a key limited to voice A, when it requests voice B, then 403 `key_restricted` with no audio | FR-015, ARCH errors | S4 | ⚠️ Deferred |
| AK-06 | it_keys_monthly_cap_exceeded_402_distinct_message | Integration | Given a key over its monthly cap, when it requests, then 402 with a cap-specific message | FR-015, FR-019 | S4 | ⚠️ Deferred |
| AK-07 | it_keys_revoke_rejected_within_10s_fleet_wide | Integration | Given two gateway instances and a revoked key, when requests are sent to both, then both return 401 within 10 s | FR-015, NFR-010 | S4 | ⚠️ Deferred |
| AK-08 | it_keys_last_used_updates_after_request | Integration | Given a successful request, when listing keys, then last_used_at advances | FR-015 | S4 | ⚠️ Deferred |
| AK-09 | it_auth_missing_header_returns_401 | Integration | Given no Authorization header, when requested, then 401 `invalid_api_key` | FR-015 | S3 | ⚠️ Deferred |
| AK-10 | it_auth_malformed_key_returns_401 | Integration | Given a key with wrong shape, when requested, then 401 | FR-015 | S3 | ⚠️ Deferred |
| AK-11 | it_auth_unknown_prefix_returns_401_same_body_as_wrong_secret | Integration | Given an unknown prefix and a wrong secret, when requested, then identical status and body | NFR-009, SPRINT_PLAN S6-T06 | S4 | ⚠️ Deferred |
| AK-12 | unit_auth_hash_compare_constant_time | Unit | Given two hashes, when compared, then a constant-time comparison is used | NFR-009 | S4 | ⚠️ Deferred |
| AK-13 | it_auth_key_enumeration_timing_indistinguishable | Integration | Given valid-prefix and invalid-prefix attempts, when timed over many samples, then distributions are statistically indistinguishable | NFR-009 | S6 | ⚠️ Deferred |
| AK-14 | it_auth_cache_60s_then_redis_then_postgres_fallthrough | Integration | Given cache states, when a key is used, then lookup falls through Redis to Postgres and caches for 60 s | FR-015 | S4 | ⚠️ Deferred |
| AK-15 | it_auth_suspended_org_403_org_suspended | Integration | Given a suspended org, when its key is used, then 403 `org_suspended` within 10 s of suspension | FR-026, NFR-010 | S4 | ⚠️ Deferred |
| AK-16 | it_auth_dev_key_accepted_only_when_env_dev | Integration | Given `YUYIN_DEV_API_KEY`, when `YUYIN_ENV` is not `dev`, then it is rejected | SPRINT_PLAN S3-T14 | S3 | ⚠️ Deferred |
| AK-17 | it_auth_release_build_excludes_dev_key_path | Integration | Given a release build, when the binary is inspected, then the dev-key path is compiled out | SPRINT_PLAN S3-T14, NFR-016 | S3 | ⚠️ Deferred |
| AK-18 | it_auth_test_mode_key_yy_test_isolated_from_live_balance | Integration | Given a `yy_test_` key, when used, then it never debits the live balance | FR-015 | S4 | ⚠️ Deferred |
| AK-19 | it_tenant_isolation_every_query_path_returns_own_rows_only | Integration | Given two tenants, when each queries every console and gateway path, then only own rows are returned | NFR-008 | S4 | ⚠️ Deferred |
| AK-20 | it_tenant_isolation_forged_tenant_id_in_body_ignored | Integration | Given a forged `tenant_id` in a request body, when processed, then it is ignored and the caller's tenant is used | NFR-008 | S4 | ⚠️ Deferred |
| AK-21 | it_roles_owner_admin_developer_billing_permissions | Integration | Given each role, when performing console actions, then permissions match the role matrix (for example billing cannot create keys) | FR-021 | S4 | ⚠️ Deferred |
| AK-22 | it_auth_rate_limit_20_rps_per_key_429 | Integration | Given 21 requests in one second, when the 21st arrives, then 429 `rate_limited` | FR-019 | S4 | ⚠️ Deferred |
| AK-23 | it_secrets_scan_repo_has_no_secret_material | Integration | Given the repository, when scanned, then no secrets exist and runtime secrets come from the secret store | NFR-016 | S0 | ⚠️ Deferred |

### 6.10 Metering and ledger

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| ML-01 | unit_meter_count_chars_ascii | Unit | Given ASCII text, when counted, then count equals code points | FR-018 | S4 | ⚠️ Deferred |
| ML-02 | unit_meter_count_chars_devanagari_combining_marks_by_scalar | Unit | Given Devanagari with matras and conjuncts, when counted after NFC, then each Unicode scalar counts once | FR-018 | S4 | ⚠️ Deferred |
| ML-03 | unit_meter_count_chars_nfc_applied_before_count | Unit | Given decomposed and composed forms of the same text, when counted, then counts follow NFC | FR-018 | S4 | ⚠️ Deferred |
| ML-04 | unit_meter_count_chars_emoji_and_astral_one_scalar | Unit | Given astral characters, when counted, then each is one scalar | FR-018 | S4 | ⚠️ Deferred |
| ML-05 | unit_meter_count_chars_whitespace_and_punctuation_counted | Unit | Given whitespace and punctuation, when counted, then they are included | FR-018 | S4 | ⚠️ Deferred |
| ML-06 | unit_meter_count_chars_counted_before_normalisation | Unit | Given "₹1,25,000", when counted, then the count is 8 regardless of the spoken expansion | FR-018, ARCH metering | S4 | ⚠️ Deferred |
| ML-07 | contract_meter_wasm_count_matches_rust_count | Contract | Given a corpus of strings, when counted by the WASM build and the Rust crate, then results are identical | FR-018, FR-022 | S4 | ⚠️ Deferred |
| ML-08 | unit_meter_cost_ceil_chars_price_over_1000 | Unit | Given chars and price, when costed, then `ceil(chars * price / 1000)` micro-USD | FR-018 | S4 | ⚠️ Deferred |
| ML-09 | prop_meter_cost_never_below_exact_fraction_no_overflow | Property | Given arbitrary chars and prices, when costed, then cost is at least the exact value and does not overflow | FR-018 | S4 | ⚠️ Deferred |
| ML-10 | it_meter_reserve_atomic_under_concurrency_never_negative | Integration | Given 200 concurrent reservations against a small balance, when the Lua script runs, then the balance never goes below zero | FR-018, ARCH metering | S4 | ⚠️ Deferred |
| ML-11 | it_meter_reserve_insufficient_returns_402_no_audio | Integration | Given insufficient balance, when requested, then 402 `insufficient_credits`, zero audio bytes, zero debit | FR-019 | S4 | ⚠️ Deferred |
| ML-12 | it_meter_settle_releases_difference_on_early_end | Integration | Given a reservation larger than delivered, when the stream ends, then the difference is released | FR-018 | S4 | ⚠️ Deferred |
| ML-13 | it_meter_failure_before_any_audio_bills_zero | Integration | Given an engine failure before the first byte, when settled, then the ledger debit is zero | FR-018 | S4 | ⚠️ Deferred |
| ML-14 | it_meter_client_disconnect_bills_only_delivered_segments | Integration | Given a disconnect after 2 of 5 segments, when settled, then billed chars equal the sum of `char_span` of fully written segments | FR-018 | S4 | ⚠️ Deferred |
| ML-15 | it_meter_reservation_ttl_releases_crashed_gateway_hold | Integration | Given a gateway killed mid-stream, when the TTL elapses, then the reserved credit is released | FR-018 | S4 | ⚠️ Deferred |
| ML-16 | it_meter_balance_cache_hydrated_from_ledger_on_miss | Integration | Given an empty Redis, when a request arrives, then balance is rebuilt from the ledger sum | FR-016, ARCH metering | S4 | ⚠️ Deferred |
| ML-17 | it_ledger_batcher_flushes_at_500ms_or_200_events | Integration | Given events, when the batcher runs, then it flushes at 500 ms or 200 events, whichever first | ARCH metering | S4 | ⚠️ Deferred |
| ML-18 | it_ledger_duplicate_request_id_is_noop | Integration | Given a repeated `request_id`, when written twice, then one row exists | FR-018, ARCH metering | S4 | ⚠️ Deferred |
| ML-19 | it_ledger_postgres_outage_spools_to_disk_and_replays | Integration | Given Postgres down for 60 s, when events occur, then they spool (bounded at 100 MB) and replay with no loss or duplicates | ARCH failure modes, NFR-006 | S4 | ⚠️ Deferred |
| ML-20 | it_ledger_append_only_update_delete_denied_by_grants | Integration | Given the application role, when UPDATE or DELETE on `ledger` is attempted, then it is denied by permissions and trigger | NFR-006, ARCH data model | S4 | ⚠️ Deferred |
| ML-21 | it_ledger_usage_daily_maintained_by_batcher | Integration | Given events, when flushed, then `usage_daily` rows aggregate by day, key, voice, format | FR-020 | S4 | ⚠️ Deferred |
| ML-22 | it_recon_daily_job_zero_difference_after_normal_traffic | Integration | Given normal traffic, when the job runs, then ledger, Redis, and `usage_daily` agree and a report row is written | NFR-006 | S4 | ⚠️ Deferred |
| ML-23 | it_recon_detects_injected_difference_and_alerts | Integration | Given a deliberately altered Redis balance, when the job runs, then it alerts and the report shows the difference | NFR-006 | S4 | ⚠️ Deferred |
| ML-24 | it_recon_after_chaos_node_kill_redis_failover_pg_outage | Integration | Given the Sprint 6 chaos steps, when each completes, then reconciliation difference is zero | NFR-006 | S6 | ⚠️ Deferred |
| ML-25 | it_grant_first_n_orgs_receive_grant_on_email_verification | Integration | Given `grant_limit` N, when orgs 1..N verify, then each gets a `grant` row and org N+1 does not | FR-017 | S4 | ⚠️ Deferred |
| ML-26 | it_grant_consumed_before_paid_balance | Integration | Given grant and paid balance, when a request settles, then grant chars are drawn first | FR-017 | S4 | ⚠️ Deferred |
| ML-27 | it_grant_one_per_org_and_per_normalised_owner_email | Integration | Given plus-tag and dot variants of one address, when orgs verify, then only one grant is issued | FR-017 | S4 | ⚠️ Deferred |
| ML-28 | it_redis_down_recent_cache_serves_up_to_60s_then_fails_closed | Integration | Given Redis down and a recent cached balance, when requests continue, then they are served for up to 60 s then rejected | ARCH failure modes | S4 | ⚠️ Deferred |
| ML-29 | it_redis_down_no_cached_balance_fails_closed_immediately | Integration | Given Redis down and no recent cache, when a request arrives, then it is rejected before any audio | ARCH failure modes | S4 | ⚠️ Deferred |
| ML-30 | it_retention_request_log_30_day_purge | Integration | Given rows older than 30 days, when the retention job runs, then they are deleted | NFR-007 | S6 | ⚠️ Deferred |
| ML-31 | it_account_delete_removes_personal_data_keeps_ledger | Integration | Given an account deletion, when executed, then personal data is removed and financial ledger rows remain | NFR-007, SPRINT_PLAN S6-T09 | S6 | ⚠️ Deferred |
| ML-32 | it_clock_skew_ledger_timestamps_use_server_time | Integration | Given a skewed client clock, when events are written, then timestamps come from the server | ARCH failure modes | S4 | ⚠️ Deferred |

### 6.11 Admission control

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| AD-01 | it_admission_under_capacity_admits | Integration | Given capacity N and fewer than N active, when a request arrives, then it is admitted | FR-019, NFR-003 | S3 | ⚠️ Deferred |
| AD-02 | it_admission_at_capacity_returns_503_at_capacity | Integration | Given capacity 1 and one active stream, when a second request arrives, then 503 `at_capacity` | FR-019 | S3 | ⚠️ Deferred |
| AD-03 | it_admission_503_has_retry_after_clamped_1_to_10 | Integration | Given rejection, when headers are read, then `Retry-After` is the median remaining duration of active streams clamped to 1..10 s | FR-019, ARCH admission | S3 | ⚠️ Deferred |
| AD-04 | unit_gateway_retry_after_clamp_bounds | Unit | Given remaining durations of 0.1 s and 90 s, when computed, then results are 1 and 10 | ARCH admission | S3 | ⚠️ Deferred |
| AD-05 | it_admission_first_stream_completes_when_second_rejected | Integration | Given capacity 1, when a second request is rejected, then the first stream completes with all audio | FR-019, NFR-004 | S3 | ⚠️ Deferred |
| AD-06 | it_admission_acquire_is_non_blocking | Integration | Given a full node, when a request arrives, then rejection is immediate (no queueing delay above a small bound) | ARCH admission | S3 | ⚠️ Deferred |
| AD-07 | it_admission_never_weaken_rejected_request_gets_zero_audio_bytes | Integration | NEVER-WEAKEN. Given any rejection (401, 402, 403, 413, 422, 429, 503), when the response is read, then the body contains no audio bytes and no 200 status was sent | ARCH admission | S3 | ⚠️ Deferred |
| AD-08 | it_admission_never_weaken_ws_rejected_connection_gets_zero_binary_frames | Integration | NEVER-WEAKEN. Given a rejected WebSocket session, when frames are counted, then zero binary frames were sent | ARCH admission, FR-002 | S3 | ⚠️ Deferred |
| AD-09 | it_admission_order_auth_then_credit_then_admission_then_status_line | Integration | Given instrumented ordering, when a request is processed, then the order is auth, credit reservation, admission, status line | ARCH admission | S3 | ⚠️ Deferred |
| AD-10 | it_admission_rejection_after_reserve_releases_reservation | Integration | Given a 503 after credit reservation, when rejected, then the reservation is fully released and nothing is billed | FR-018, FR-019 | S3 | ⚠️ Deferred |
| AD-11 | it_admission_permit_released_on_stream_end_error_disconnect | Integration | Given each end condition, when streams finish, then the permit is released and `yuyin_active_streams` returns to zero | NFR-003 | S3 | ⚠️ Deferred |
| AD-12 | it_admission_capacity_loaded_from_config_by_instance_class | Integration | Given `config/capacity.toml`, when started with an instance class, then capacity is the keyed value | NFR-003, SPRINT_PLAN S3-T09 | S3 | ⚠️ Deferred |
| AD-13 | it_admission_env_override_cannot_exceed_measured_value | Integration | Given an env override above the measured capacity, when started, then startup refuses or clamps and logs why | NFR-003 | S3 | ⚠️ Deferred |
| AD-14 | it_admission_rejected_metric_incremented_by_reason | Integration | Given a rejection, when metrics are scraped, then `yuyin_rejected_total{reason="at_capacity"}` increases | ARCH observability | S3 | ⚠️ Deferred |
| AD-15 | it_admission_overload_never_cuts_active_streams | Integration | NEVER-WEAKEN. Given load far above capacity, when new requests are rejected, then no admitted stream is terminated | NFR-004 | S3 | ⚠️ Deferred |
| AD-16 | it_admission_utilisation_metric_ratio_for_hpa | Integration | Given streams, when metrics are scraped, then `yuyin_active_streams / yuyin_capacity_streams` is computable and correct | NFR-004, ARCH scaling | S3 | ⚠️ Deferred |

### 6.12 Draining

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| DR-01 | it_drain_sigterm_flips_readyz_to_503 | Integration | Given a running node, when SIGTERM is received, then `/readyz` returns 503 | NFR-004, ARCH admission | S3 | ⚠️ Deferred |
| DR-02 | it_drain_new_requests_rejected_after_sigterm_zero_audio | Integration | Given SIGTERM received, when a new request arrives, then it is rejected with no audio | NFR-004 | S3 | ⚠️ Deferred |
| DR-03 | it_drain_never_weaken_in_progress_stream_completes | Integration | NEVER-WEAKEN. Given a 60 s stream in flight, when SIGTERM arrives, then the stream finishes with every segment delivered | NFR-004 | S3 | ⚠️ Deferred |
| DR-04 | it_drain_waits_up_to_120s_for_active_streams | Integration | Given active streams, when SIGTERM arrives, then the process waits up to 120 s (scaled clock in CI) and exits as soon as streams end | NFR-004 | S3 | ⚠️ Deferred |
| DR-05 | it_drain_exit_zero_after_all_streams_complete | Integration | Given all streams complete during drain, when the last ends, then the process exits 0 | NFR-004 | S3 | ⚠️ Deferred |
| DR-06 | it_drain_timeout_exceeded_logs_streams_still_active | Integration | Given streams outlasting the drain timeout, when it elapses, then the event is logged with count and the behaviour matches ARCHITECTURE | NFR-004 | S3 | ⚠️ Deferred |
| DR-07 | it_drain_ledger_flushed_before_exit | Integration | Given pending ledger events, when draining, then the batcher flushes before the process exits | NFR-006 | S3 | ⚠️ Deferred |
| DR-08 | it_drain_websocket_stream_completes_during_drain | Integration | Given an open WebSocket stream, when drain begins, then it completes through `done` | NFR-004, FR-002 | S3 | ⚠️ Deferred |
| DR-09 | it_drain_helm_termination_grace_150_and_prestop_present | Integration | Given the chart, when rendered, then `terminationGracePeriodSeconds` is 150 and a `preStop` hook exists | NFR-004 | S3 | ⚠️ Deferred |
| DR-10 | it_drain_helm_rolling_update_max_unavailable_0 | Integration | Given the chart, when rendered, then rolling update has `maxUnavailable: 0` | NFR-004 | S6 | ⚠️ Deferred |
| DR-11 | smoke_drain_rolling_restart_during_60s_stream_completes | Smoke | Given a 60 s stream on kind, when a rolling upgrade runs, then the stream completes | NFR-004 | S3 | ⚠️ Deferred |
| DR-12 | it_drain_scale_in_never_cuts_active_stream | Integration | NEVER-WEAKEN. Given scale-in or HPA down, when a node is removed, then its active streams finish first | NFR-004 | S6 | ⚠️ Deferred |
| DR-13 | it_drain_node_kill_under_load_ledger_reconciles | Integration | Given a node killed during load (an unplanned loss, not a drain), when settled, then reservations release and reconciliation is zero | NFR-004, NFR-006 | S6 | ⚠️ Deferred |
| DR-14 | it_drain_probe_exit_healthcheck_command_exit_code | Integration | Given `yuyin-gateway healthcheck`, when ready and when draining, then exit 0 then non-zero | NFR-004 | S3 | ⚠️ Deferred |

### 6.13 Console flows

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| CN-01 | e2e_console_signup_verify_email_lands_on_onboarding | E2E | Given a new user, when signing up and verifying email, then onboarding opens | FR-021, FR-017 | S2 | ⚠️ Deferred |
| CN-02 | e2e_console_unauthenticated_redirects_to_sign_in | E2E | Given no session, when visiting a console route, then redirect to sign in | FR-021 | S2 | ⚠️ Deferred |
| CN-03 | e2e_console_operator_route_blocked_for_non_allowlisted_user | E2E | Given a normal user, when visiting `(operator)`, then access is denied | FR-026 | S2 | ⚠️ Deferred |
| CN-04 | e2e_console_create_key_shows_secret_once | E2E | Given a developer, when creating a key, then the secret displays once in KeyReveal and not on reload | FR-015 | S4 | ⚠️ Deferred |
| CN-05 | e2e_console_revoke_key_rejected_within_10s | E2E | Given a key, when revoked, then API use returns 401 within 10 s | FR-015, NFR-010 | S4 | ⚠️ Deferred |
| CN-06 | e2e_console_rename_and_restrict_key | E2E | Given a key, when renamed and voice-restricted, then list shows it and API enforces it | FR-015 | S4 | ⚠️ Deferred |
| CN-07 | e2e_console_topup_test_mode_reflects_in_balance | E2E | Given test-mode Checkout, when paid, then balance updates after webhook | FR-016 | S4 | ⚠️ Deferred |
| CN-08 | e2e_console_topup_below_minimum_rejected | E2E | Given a custom amount under the minimum, when submitted, then validation blocks it | FR-016 | S4 | ⚠️ Deferred |
| CN-09 | e2e_console_usage_view_matches_requests_just_made | E2E | Given requests made via API, when opening Usage, then day, key, voice, format totals match | FR-020 | S4 | ⚠️ Deferred |
| CN-10 | e2e_console_billing_ledger_and_receipts_listed | E2E | Given credits and debits, when opening Billing, then ledger rows and receipt links appear | FR-016 | S4 | ⚠️ Deferred |
| CN-11 | e2e_console_roles_billing_role_cannot_create_key | E2E | Given a billing-role member, when opening Keys, then create is unavailable | FR-021 | S4 | ⚠️ Deferred |
| CN-12 | e2e_console_org_invite_and_role_change | E2E | Given an owner, when inviting a member and changing a role, then the member's access changes | FR-021 | S4 | ⚠️ Deferred |
| CN-13 | e2e_console_playground_codepoint_counter_matches_wasm_count | E2E | Given Devanagari text, when typing, then the counter equals the metering count | FR-022, FR-018 | S5 | ⚠️ Deferred |
| CN-14 | e2e_console_playground_play_shows_waveform_and_ttfa | E2E | Given text, when pressing play, then the pulse line animates and a TTFA readout labelled "measured in this browser" appears | FR-022 | S5 | ⚠️ Deferred |
| CN-15 | e2e_console_playground_show_normalised_text_toggle | E2E | Given the toggle on, when playing, then normalised text from `/v1/normalize` is shown | FR-022, FR-012 | S5 | ⚠️ Deferred |
| CN-16 | e2e_console_playground_copy_as_curl_ts_python | E2E | Given settings, when copying snippets, then curl, TypeScript, Python reflect the settings | FR-022 | S5 | ⚠️ Deferred |
| CN-17 | e2e_console_playground_uses_short_lived_credential_not_user_key | E2E | Given the playground, when network calls are inspected, then no long-lived key is exposed to the page | FR-022, NFR-016 | S5 | ⚠️ Deferred |
| CN-18 | e2e_console_lexicon_add_edit_delete_entries | E2E | Given the lexicon screen, when adding an entry, then the next request uses it; at 500 entries add is blocked | FR-010 | S4 | ⚠️ Deferred |
| CN-19 | e2e_site_home_live_demo_200_cp_limit_and_rate_limit | E2E | Given the public demo, when text exceeds 200 code points or the per-IP limit is hit, then it is refused with a clear message | FR-023 | S5 | ⚠️ Deferred |
| CN-20 | e2e_site_pricing_reads_config_pricing_toml | E2E | Given `config/pricing.toml`, when opening Pricing, then displayed prices match it | FR-023 | S2 | ⚠️ Deferred |
| CN-21 | e2e_site_benchmarks_page_states_no_data_when_no_result_file | E2E | Given no `bench/results/` file for the instance class, when opening Benchmarks, then it says so and shows no numbers | FR-023, NFR-001 | S5 | ⚠️ Deferred |
| CN-22 | e2e_site_benchmarks_page_renders_latest_result_with_method | E2E | Given a result file, when opening Benchmarks, then hardware, corpus, percentiles, RTF, capacity, date, and method link render | FR-023 | S5 | ⚠️ Deferred |
| CN-23 | e2e_site_legal_pages_show_draft_banner_when_flag_set | E2E | Given the env flag, when opening legal pages, then the draft banner is visible | FR-023 | S6 | ⚠️ Deferred |
| CN-24 | e2e_docs_search_and_api_reference_from_openapi | E2E | Given the docs site, when searching and opening the API reference, then entries match `api/openapi.yaml` | FR-024 | S2 | ⚠️ Deferred |
| CN-25 | e2e_docs_changelog_built_from_changelog_md | E2E | Given `CHANGELOG.md`, when opening the changelog page, then it lists the same entries | FR-024 | S5 | ⚠️ Deferred |
| CN-26 | e2e_a11y_axe_no_violations_every_route | E2E | Given each route in both themes, when axe runs, then there are no WCAG 2.2 AA violations | NFR-015 | S2 | ⚠️ Deferred |
| CN-27 | e2e_a11y_devanagari_fixture_page_snapshot | E2E | Given 50 Devanagari strings with conjuncts and matras, when rendered, then snapshot matches in both themes | NFR-015 | S2 | ⚠️ Deferred |
| CN-28 | e2e_a11y_keyboard_navigation_and_focus_visible | E2E | Given key screens, when navigating by keyboard only, then all controls are reachable with visible focus | NFR-015 | S2 | ⚠️ Deferred |
| CN-29 | e2e_visual_snapshots_12_key_screens_both_themes | E2E | Given 12 key screens, when snapshotted dark and light, then they match baselines | NFR-015 | S2 | ⚠️ Deferred |
| CN-30 | e2e_status_page_incident_banner_from_operator | E2E | Given an operator sets a banner, when opening the console or status page, then the banner shows and clears when removed | FR-032 | S5 | ⚠️ Deferred |
| CN-31 | e2e_status_page_prober_feed_reflects_health | E2E | Given a failing health probe, when the status page renders, then it shows the degraded component | FR-032 | S5 | ⚠️ Deferred |
| CN-32 | e2e_console_onboarding_three_steps_skippable | E2E | Given a new org, when onboarding, then create key, curl command, and sample play are shown and skippable | FR-022 | S5 | ⚠️ Deferred |
| CN-33 | e2e_site_abuse_report_form_submits_and_queues | E2E | Given the public form, when submitted, then an abuse item appears in the operator queue | FR-031 | S6 | ⚠️ Deferred |
| CN-34 | e2e_console_signup_requires_aup_acceptance | E2E | Given sign-up, when the policy box is unchecked, then sign-up is blocked | FR-031 | S6 | ⚠️ Deferred |
| CN-35 | e2e_console_component_library_unit_tests_per_component | E2E | Given each design-system component, when its preview route and unit test run, then both pass | NFR-015 | S2 | ⚠️ Deferred |

### 6.14 Stripe webhooks

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| SW-01 | it_stripe_webhook_invalid_signature_rejected_400 | Integration | Given a bad signature, when posted, then it is rejected and nothing is written | FR-016 | S4 | ⚠️ Deferred |
| SW-02 | it_stripe_webhook_checkout_completed_writes_credit_and_bumps_balance | Integration | Given `checkout.session.completed`, when handled, then a `credit` ledger row is written and the Redis balance rises through the same script | FR-016, ARCH metering | S4 | ⚠️ Deferred |
| SW-03 | it_stripe_webhook_duplicate_event_id_idempotent | Integration | Given the same event id delivered twice, when handled, then exactly one credit exists | FR-016 | S4 | ⚠️ Deferred |
| SW-04 | it_stripe_webhook_concurrent_duplicates_single_credit | Integration | Given the same event delivered concurrently, when handled, then the unique constraint yields one credit | FR-016 | S4 | ⚠️ Deferred |
| SW-05 | it_stripe_webhook_charge_refunded_writes_refund_row | Integration | Given `charge.refunded`, when handled, then a `refund` row is written and balance adjusts | FR-016 | S4 | ⚠️ Deferred |
| SW-06 | it_stripe_webhook_dispute_created_flags_org_and_alerts | Integration | Given `charge.dispute.created`, when handled, then the org is flagged for operator review and an alert is raised | FR-016, FR-026 | S4 | ⚠️ Deferred |
| SW-07 | it_stripe_webhook_unknown_event_type_ignored_200 | Integration | Given an unhandled event type, when posted, then 200 and no state change | FR-016 | S4 | ⚠️ Deferred |
| SW-08 | it_stripe_webhook_delayed_balance_updates_when_arrives | Integration | Given a delayed webhook, when it finally arrives, then credit applies once and the console shows pending until then | ARCH failure modes | S4 | ⚠️ Deferred |
| SW-09 | it_stripe_webhook_out_of_order_refund_before_credit_handled | Integration | Given a refund event before its credit, when processed, then the end state is consistent | FR-016 | S4 | ⚠️ Deferred |
| SW-10 | it_stripe_checkout_session_payment_mode_with_min_amount | Integration | Given a top-up request, when the session is created, then mode is payment and amounts below the minimum are refused | FR-016 | S4 | ⚠️ Deferred |
| SW-11 | it_stripe_webhook_credit_reconciles_with_ledger_sum | Integration | Given a series of top-ups and usage, when reconciled, then the balance equals the ledger sum | NFR-006 | S4 | ⚠️ Deferred |
| SW-12 | it_stripe_webhook_missing_tenant_metadata_logged_not_credited | Integration | Given an event without a tenant reference, when handled, then no credit is applied and it is flagged | FR-016 | S4 | ⚠️ Deferred |
| SW-13 | it_stripe_webhook_no_card_data_stored | Integration | Given any webhook, when the database is inspected, then no card data is stored | NFR-007 | S4 | ⚠️ Deferred |
| SW-14 | it_stripe_webhook_failures_surface_in_dashboard_metric | Integration | Given handler failures, when metrics are scraped, then the webhook failure counter rises | FR-016, SPRINT_PLAN S6-T08 | S6 | ⚠️ Deferred |

### 6.15 Operator admin

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| OP-01 | e2e_operator_org_list_and_detail | E2E | Given an operator, when opening organizations, then list and detail render with balance and keys (prefix only) | FR-026 | S6 | ⚠️ Deferred |
| OP-02 | it_operator_suspend_blocks_api_within_10s | Integration | Given a suspension, when the org's key is used, then 403 `org_suspended` within 10 s | FR-026, NFR-010 | S6 | ⚠️ Deferred |
| OP-03 | it_operator_unsuspend_restores_access | Integration | Given an unsuspension, when the key is used, then requests succeed | FR-026 | S6 | ⚠️ Deferred |
| OP-04 | it_operator_manual_credit_requires_reason_and_writes_ledger | Integration | Given a manual credit, when submitted without a reason, then it is rejected; with a reason, an `adjustment` row exists | FR-026 | S6 | ⚠️ Deferred |
| OP-05 | it_operator_manual_debit_requires_reason_and_writes_ledger | Integration | Given a manual debit, when submitted, then reason is required and a ledger row is appended | FR-026 | S6 | ⚠️ Deferred |
| OP-06 | it_operator_refund_trigger_follows_policy_and_writes_refund | Integration | Given a refund trigger, when executed, then it calls the payment provider within policy and writes a `refund` row | FR-026, FR-016 | S6 | ⚠️ Deferred |
| OP-07 | it_operator_every_action_writes_audit_log | Integration | Given each operator action, when executed, then an `audit_log` row records actor, action, target, metadata | FR-026 | S6 | ⚠️ Deferred |
| OP-08 | it_operator_audit_log_append_only | Integration | Given the app role, when UPDATE or DELETE on `audit_log` is attempted, then it is denied | FR-026 | S6 | ⚠️ Deferred |
| OP-09 | it_operator_non_allowlisted_user_gets_403_on_api_routes | Integration | Given a non-operator user, when calling operator API routes, then 403 | FR-026 | S6 | ⚠️ Deferred |
| OP-10 | e2e_operator_incident_banner_set_and_clear | E2E | Given an operator, when setting and clearing a banner, then public pages follow and the action is audited | FR-032, FR-026 | S6 | ⚠️ Deferred |
| OP-11 | e2e_operator_abuse_queue_triage_to_suspend | Integration | Given an abuse report, when triaged to suspension, then the org is suspended and audited | FR-031, FR-026 | S6 | ⚠️ Deferred |
| OP-12 | e2e_operator_fleet_capacity_view_matches_metrics | E2E | Given nodes, when opening fleet capacity, then active and capacity values match metrics | FR-026 | S6 | ⚠️ Deferred |
| OP-13 | it_abuse_new_account_otp_card_pin_instruction_pattern_blocked | Integration | Given a new account, when it submits text matching the high-risk fraud patterns, then the request is blocked with a defined error and flagged | FR-031 | S6 | ⚠️ Deferred |
| OP-14 | it_abuse_velocity_alert_on_new_account_volume_spike | Integration | Given a sudden spike from a new org, when thresholds are crossed, then an alert is raised | FR-031 | S6 | ⚠️ Deferred |
| OP-15 | it_operator_no_tenant_text_or_audio_visible | Integration | Given operator views, when inspected, then no request text or audio is shown (metadata only) | NFR-007 | S6 | ⚠️ Deferred |

### 6.16 SDKs

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| SK-01 | it_sdk_ts_speak_returns_readable_stream_of_audio | Integration | Given the mock server, when `speak()` is called, then a `ReadableStream` yields chunks as they arrive | FR-025, FR-001 | S5 | ⚠️ Deferred |
| SK-02 | it_sdk_ts_speak_to_file_writes_decodable_file_node | Integration | Given Node, when `speakToFile()` runs, then a decodable file is written | FR-025 | S5 | ⚠️ Deferred |
| SK-03 | it_sdk_ts_stream_write_flush_end_async_iteration | Integration | Given a WebSocket session, when `write`, `flush`, `end` are used, then audio chunks iterate asynchronously | FR-025, FR-002 | S5 | ⚠️ Deferred |
| SK-04 | unit_sdk_ts_typed_error_per_error_code | Unit | Given each API error code, when raised, then a distinct typed error is thrown with code and request_id | FR-025 | S5 | ⚠️ Deferred |
| SK-05 | unit_sdk_ts_retry_honours_retry_after_on_503_and_429 | Unit | Given 503 and 429 with Retry-After, when retrying, then delay follows the header with backoff | FR-025, FR-019 | S5 | ⚠️ Deferred |
| SK-06 | unit_sdk_ts_never_retries_402 | Unit | Given 402, when received, then no retry occurs | FR-025, FR-019 | S5 | ⚠️ Deferred |
| SK-07 | unit_sdk_ts_no_retry_after_audio_started | Unit | Given a failure after audio bytes were delivered, when it occurs, then the SDK does not silently replay the request | FR-025 | S5 | ⚠️ Deferred |
| SK-08 | contract_sdk_ts_types_match_generated_from_openapi | Contract | Given `api/openapi.yaml`, when types regenerate, then there is no drift | FR-025, FR-024 | S5 | ⚠️ Deferred |
| SK-09 | it_sdk_ts_runs_on_node_bun_deno_browser | Integration | Given the four runtimes, when the smoke test runs, then each succeeds | FR-025 | S5 | ⚠️ Deferred |
| SK-10 | it_sdk_py_sync_speak_returns_audio_bytes_iterator | Integration | Given the sync client, when `speak` is called, then audio chunks iterate | FR-025 | S5 | ⚠️ Deferred |
| SK-11 | it_sdk_py_async_client_same_surface_as_sync | Integration | Given the async client, when the same calls are made, then results match the sync surface | FR-025 | S5 | ⚠️ Deferred |
| SK-12 | it_sdk_py_websocket_stream_session | Integration | Given the Python WebSocket client, when streaming text, then audio arrives incrementally | FR-025, FR-002 | S5 | ⚠️ Deferred |
| SK-13 | unit_sdk_py_retry_and_error_mapping_matches_ts | Unit | Given the same error scenarios as SK-04..SK-06, when run in Python, then behaviour is identical | FR-025 | S5 | ⚠️ Deferred |
| SK-14 | contract_sdk_py_types_match_openapi_and_py_typed_present | Contract | Given the package, when inspected, then `py.typed` exists and models match the spec | FR-025 | S5 | ⚠️ Deferred |
| SK-15 | contract_sdk_fixtures_validate_against_mock_server | Contract | Given `scripts/validate-fixtures.sh`, when run, then every SDK fixture matches OpenAPI response shapes | FR-025 | S5 | ⚠️ Deferred |
| SK-16 | it_sdk_never_logs_api_key | Integration | Given debug logging, when requests run, then the key never appears in logs or error messages | NFR-016 | S5 | ⚠️ Deferred |
| SK-17 | it_sdk_cancel_stream_stops_reading_and_closes_socket | Integration | Given an abort signal, when fired, then the stream stops and the connection closes | FR-025 | S5 | ⚠️ Deferred |

### 6.17 CLI

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| CL-01 | unit_cli_args_speak_flags_parsed | Unit | Given `-v -l -f -p -o --play`, when parsed, then values map correctly | FR-028 | S8 | ⚠️ Deferred |
| CL-02 | it_cli_speak_writes_file_with_output_flag | Integration | Given the local gateway, when `yuyin speak "text" -o out.ogg`, then a decodable file is written | FR-028 | S8 | ⚠️ Deferred |
| CL-03 | it_cli_speak_reads_stdin_when_no_text_arg | Integration | Given piped stdin, when `echo "text" \| yuyin speak -o out.ogg`, then audio is produced | FR-028 | S8 | ⚠️ Deferred |
| CL-04 | it_cli_stream_speaks_lines_as_they_arrive | Integration | Given stdin lines over time, when `yuyin stream`, then audio starts after the first line | FR-028, FR-002 | S8 | ⚠️ Deferred |
| CL-05 | it_cli_voices_json_and_table_output | Integration | Given `--json`, when `yuyin voices`, then valid JSON; otherwise a table | FR-028, FR-003 | S8 | ⚠️ Deferred |
| CL-06 | it_cli_normalize_balance_usage_json | Integration | Given `--json` on each read command, when run, then valid JSON matching the API | FR-028 | S8 | ⚠️ Deferred |
| CL-07 | unit_cli_exit_code_2_usage_error | Unit | Given bad flags, when run, then exit code 2 | FR-028 | S8 | ⚠️ Deferred |
| CL-08 | unit_cli_exit_code_3_auth_error | Unit | Given a 401, when mapped, then exit code 3 | FR-028 | S8 | ⚠️ Deferred |
| CL-09 | unit_cli_exit_code_4_insufficient_credits | Unit | Given a 402, when mapped, then exit code 4 | FR-028 | S8 | ⚠️ Deferred |
| CL-10 | unit_cli_exit_code_5_at_capacity | Unit | Given a 503, when mapped, then exit code 5 | FR-028 | S8 | ⚠️ Deferred |
| CL-11 | unit_cli_exit_code_6_network_error | Unit | Given an unreachable host, when run, then exit code 6 | FR-028 | S8 | ⚠️ Deferred |
| CL-12 | it_cli_login_stores_key_in_keychain_fallback_0600_file | Integration | Given no keychain, when logging in, then the config file has mode 0600 | FR-028, NFR-016 | S8 | ⚠️ Deferred |
| CL-13 | it_cli_config_get_api_key_prints_prefix_only | Integration | Given a stored key, when `yuyin config get api_key`, then only the prefix prints | FR-028, NFR-016 | S8 | ⚠️ Deferred |
| CL-14 | it_cli_never_prints_api_key_in_any_output_or_error | Integration | Given verbose and error paths, when run, then the secret never appears | NFR-016 | S8 | ⚠️ Deferred |
| CL-15 | it_cli_play_flag_missing_player_clear_message | Integration | Given no `afplay`, `aplay`, `paplay`, or PowerShell, when `--play`, then a clear message is shown | FR-028 | S8 | ⚠️ Deferred |
| CL-16 | it_cli_no_network_calls_on_version_and_no_update_check | Integration | Given `yuyin --version`, when run, then no network request is made; update check runs only on `yuyin update --check` | FR-028 | S8 | ⚠️ Deferred |
| CL-17 | smoke_cli_matrix_macos_linux_windows_speak_works | Smoke | Given the `cli-matrix` job, when run on all three OSes, then speak against staging succeeds | FR-028 | S8 | ⚠️ Deferred |
| CL-18 | smoke_cli_devanagari_stdin_plays | Smoke | Given `echo "नमस्ते" \| yuyin speak --play`, when run, then audio plays | FR-028, FR-005 | S8 | ⚠️ Deferred |
| CL-19 | it_cli_checksums_published_and_match_binaries | Integration | Given release artifacts, when checksums are verified, then all match | FR-028 | S8 | ⚠️ Deferred |
| CL-20 | it_cli_binary_size_and_startup_time_recorded | Integration | Given a build, when measured, then size and startup time are written to the build report | FR-028 | S8 | ⚠️ Deferred |

### 6.18 MCP

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| MC-01 | it_mcp_stdio_transport_lists_tools | Integration | Given stdio, when `tools/list` is called, then speak, list_voices, normalize, status, recommend_voice, estimate_cost are returned | FR-029 | S9 | ⚠️ Deferred |
| MC-02 | it_mcp_streamable_http_transport_lists_tools | Integration | Given streamable HTTP, when `tools/list` is called, then the same tools return | FR-029 | S9 | ⚠️ Deferred |
| MC-03 | contract_mcp_tool_input_schemas_strict_reject_unknown_fields | Contract | Given an unknown field, when a tool is called, then it is rejected | FR-029 | S9 | ⚠️ Deferred |
| MC-04 | contract_mcp_tool_descriptions_state_cost_implications | Contract | Given tool metadata, when read, then `speak` states that it spends credits | FR-029 | S9 | ⚠️ Deferred |
| MC-05 | it_mcp_speak_writes_audio_file_returns_path_and_metadata | Integration | Given a valid call, when run, then a file exists and the result has path, duration, chars | FR-029 | S9 | ⚠️ Deferred |
| MC-06 | it_mcp_speak_per_call_limit_2000_cp | Integration | Given 2,001 code points, when called, then a tool error is returned and no credits are spent | FR-029 | S9 | ⚠️ Deferred |
| MC-07 | it_mcp_session_spend_limit_default_20000_chars | Integration | Given `YUYIN_MCP_MAX_CHARS_PER_SESSION` default, when a looping agent exceeds 20,000 chars, then further calls fail with a tool error | FR-029 | S9 | ⚠️ Deferred |
| MC-08 | it_mcp_session_spend_limit_env_override_respected | Integration | Given a lower env value, when exceeded, then calls fail at that value | FR-029 | S9 | ⚠️ Deferred |
| MC-09 | it_mcp_path_safety_rejects_traversal_and_outside_root | Integration | Given `../` or an absolute path outside the allowed root, when `speak` is called, then it is rejected | FR-029 | S9 | ⚠️ Deferred |
| MC-10 | it_mcp_errors_map_to_tool_errors_preserving_api_code | Integration | Given a 402, when raised, then the tool error carries `insufficient_credits` | FR-029 | S9 | ⚠️ Deferred |
| MC-11 | it_mcp_results_never_contain_key_or_raw_audio_bytes | Integration | Given any tool result, when inspected, then no API key or raw audio bytes appear | FR-029, NFR-016 | S9 | ⚠️ Deferred |
| MC-12 | it_mcp_list_voices_and_normalize_match_api | Integration | Given the mock server, when called, then outputs match API shapes | FR-029 | S9 | ⚠️ Deferred |
| MC-13 | it_mcp_estimate_cost_matches_meter_and_pricing | Integration | Given text and format, when estimated, then cost equals `ceil(chars * price / 1000)` using the same char count | FR-029, FR-018 | S9 | ⚠️ Deferred |
| MC-14 | it_mcp_recommend_voice_returns_voice_with_language_match | Integration | Given a language, when recommended, then the voice supports it | FR-029 | S9 | ⚠️ Deferred |
| MC-15 | smoke_harness_pi_goose_opencode_claude_code_produce_audio | Smoke | Given the `harness-smoke-tests` job, when each harness calls the MCP server, then an audio file is produced | FR-029 | S10 | ⚠️ Deferred |
| MC-16 | it_pi_extension_slash_commands_and_context_hook | Integration | Given the Pi extension, when `/speak`, `/voices`, `/yuyin-status` run, then results and progress updates appear and the session-start hook injects default voice and balance summary | FR-029 | S10 | ⚠️ Deferred |
| MC-17 | smoke_mcp_docker_image_starts_and_lists_tools | Smoke | Given the image, when started, then tools list over stdio | FR-029 | S9 | ⚠️ Deferred |

### 6.19 Self-host licence

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| SH-01 | unit_licence_verify_valid_signature_accepts | Unit | Given a validly signed licence, when verified with the compiled-in public key, then accepted | FR-027 | S7 | ⚠️ Deferred |
| SH-02 | unit_licence_verify_tampered_field_rejects | Unit | Given a changed field, when verified, then rejected | FR-027 | S7 | ⚠️ Deferred |
| SH-03 | unit_licence_verify_wrong_key_signature_rejects | Unit | Given a signature from another key, when verified, then rejected | FR-027 | S7 | ⚠️ Deferred |
| SH-04 | unit_licence_expired_within_14_day_grace_warns_and_serves | Unit | Given a licence expired 3 days ago, when starting and admitting, then a warning log and header appear and streams are admitted | FR-027 | S7 | ⚠️ Deferred |
| SH-05 | unit_licence_expired_beyond_grace_refuses_new_streams | Unit | Given a licence expired 15 days ago, when a request arrives, then new streams are refused | FR-027 | S7 | ⚠️ Deferred |
| SH-06 | it_licence_expiry_never_cuts_active_streams | Integration | NEVER-WEAKEN. Given a stream in progress, when the licence crosses expiry plus grace, then the stream completes | FR-027, NFR-004 | S7 | ⚠️ Deferred |
| SH-07 | it_licence_limits_max_concurrent_streams_enforced | Integration | Given a licence with max streams M, when M+1 start, then the extra is rejected with 503 and zero audio | FR-027, FR-019 | S7 | ⚠️ Deferred |
| SH-08 | it_licence_voices_list_limits_catalogue | Integration | Given a licence listing voices, when `/v1/voices` is called, then only those voices appear | FR-027, FR-003 | S7 | ⚠️ Deferred |
| SH-09 | it_licence_max_nodes_enforced_or_reported | Integration | Given nodes above the limit, when detected, then behaviour matches ARCHITECTURE (refuse or report) | FR-027 | S7 | ⚠️ Deferred |
| SH-10 | it_licence_clock_rollback_does_not_extend_validity | Integration | Given the system clock moved back, when validated, then the licence does not become valid again beyond the recorded high-water mark | FR-027, ARCH failure modes | S7 | ⚠️ Deferred |
| SH-11 | it_selfhost_admin_keys_create_list_revoke_yy_self_prefix | Integration | Given the admin CLI, when creating, listing, revoking, then keys use `yy_self_` and revocation applies | FR-027 | S7 | ⚠️ Deferred |
| SH-12 | it_selfhost_usage_report_signed_json_no_text_or_audio | Integration | Given usage, when `admin usage-report --month YYYY-MM`, then signed JSON with chars by day and peak concurrency is written and contains no text or audio | FR-027, NFR-007 | S7 | ⚠️ Deferred |
| SH-13 | it_selfhost_usage_report_signature_verifies | Integration | Given the report, when verified, then the signature validates and tampering fails | FR-027 | S7 | ⚠️ Deferred |
| SH-14 | it_selfhost_runs_in_netns_without_default_route | Integration | Given a network namespace with no route, when synthesising, managing keys, and scraping metrics, then all work | FR-027 | S7 | ⚠️ Deferred |
| SH-15 | it_selfhost_packet_capture_zero_outbound_packets | Integration | Given a packet capture during use, when analysed, then zero outbound packets except configured peers | FR-027 | S7 | ⚠️ Deferred |
| SH-16 | it_selfhost_mode_selected_by_env_no_cfg_forks_in_handlers | Integration | Given `YUYIN_MODE`, when switching hosted and self-host, then behaviour changes through the trait implementations with the same handlers | FR-027 | S7 | ⚠️ Deferred |
| SH-17 | it_selfhost_credit_unlimited_within_licence_limits | Integration | Given self-host mode, when requests run, then no credit check blocks them | FR-027 | S7 | ⚠️ Deferred |
| SH-18 | smoke_selfhost_tarball_contents_and_checksums | Smoke | Given the tarball, when unpacked, then binary, models, sample config, systemd unit, EULA, third-party licences, and checksums exist and verify | FR-027 | S7 | ⚠️ Deferred |
| SH-19 | it_selfhost_private_voice_included_by_licence | Integration | Given a licence with a private voice, when listing, then the voice is available | FR-027, FR-030 | S12 | ⚠️ Deferred |

### 6.20 Custom voice intake

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| CV-01 | e2e_voice_intake_form_collects_org_speaker_use_languages | E2E | Given the form, when submitted with valid data, then a `custom_voice_requests` row with status `submitted` exists | FR-030 | S12 | ⚠️ Deferred |
| CV-02 | it_voice_intake_recording_script_sized_for_about_30_minutes | Integration | Given requested languages, when the script is generated, then it is original, phonetically varied, and sized for about 30 minutes of speech | FR-030 | S12 | ⚠️ Deferred |
| CV-03 | it_voice_consent_record_has_three_parts | Integration | Given a consent submission, when stored, then it has a signed statement, a spoken clip with the speaker name, customer name, and one-time phrase, and operator identity verification before `consent_verified` | FR-030 | S12 | ⚠️ Deferred |
| CV-04 | it_voice_consent_one_time_phrase_cannot_be_reused | Integration | Given a used phrase, when presented again, then it is rejected | FR-030 | S12 | ⚠️ Deferred |
| CV-05 | it_voice_upload_presigned_multipart_direct_to_object_store | Integration | Given an upload, when started, then presigned URLs target the encrypted bucket and the gateway never handles the audio bytes | FR-030, NFR-007 | S12 | ⚠️ Deferred |
| CV-06 | it_voice_upload_quality_check_rejects_wrong_sample_rate | Integration | Given a low-rate file, when checked, then it fails with a plain explanation per file | FR-030 | S12 | ⚠️ Deferred |
| CV-07 | it_voice_upload_quality_check_rejects_clipping_noise_silence | Integration | Given clipped, noisy, or mostly silent files, when checked, then each fails with its specific reason | FR-030 | S12 | ⚠️ Deferred |
| CV-08 | it_voice_upload_quality_check_rejects_short_total_duration | Integration | Given too little audio, when checked, then it fails with the shortfall stated | FR-030 | S12 | ⚠️ Deferred |
| CV-09 | it_voice_upload_speaker_consistency_mismatch_flagged | Integration | Given recordings from a different speaker than the consent clip, when checked, then they are flagged | FR-030 | S12 | ⚠️ Deferred |
| CV-10 | it_voice_status_transitions_valid_states_only | Integration | Given the states submitted, consent_verified, in_training, review, ready, rejected, withdrawn, when transitions are attempted, then only valid transitions succeed | FR-030 | S12 | ⚠️ Deferred |
| CV-11 | e2e_voice_status_and_messages_visible_in_console | E2E | Given a status change and operator message, when the customer opens the console, then both show | FR-030 | S12 | ⚠️ Deferred |
| CV-12 | it_voice_ready_registered_private_with_owner_tenant | Integration | Given a ready voice, when registered, then `visibility` is private with `owner_tenant_id` | FR-030, NFR-008 | S12 | ⚠️ Deferred |
| CV-13 | it_voice_private_usable_only_by_owner_tenant_keys | Integration | Given tenant B's key, when requesting tenant A's private voice, then 422 `unknown_voice` and it never lists | FR-030, NFR-008 | S12 | ⚠️ Deferred |
| CV-14 | it_voice_withdrawal_disables_voice_requests_422_audited | Integration | Given withdrawal by speaker or customer, when requested, then the voice is disabled, requests return 422, an audit row exists, and the retention schedule for recordings starts | FR-030 | S12 | ⚠️ Deferred |
| CV-15 | it_voice_withdrawal_in_flight_stream_completes | Integration | NEVER-WEAKEN. Given a stream in progress, when the voice is withdrawn, then the stream completes and only new requests are refused | FR-030, NFR-004 | S12 | ⚠️ Deferred |
| CV-16 | it_voice_object_store_object_lock_and_kms_encryption_enforced | Integration | Given the bucket config, when inspected, then encryption and Object Lock are enabled | FR-030, NFR-016 | S12 | ⚠️ Deferred |
| CV-17 | it_voice_intake_tenant_isolation_requests_and_consents | Integration | Given two tenants, when each lists requests and consent records, then only own rows return | FR-030, NFR-008 | S12 | ⚠️ Deferred |
| CV-18 | it_voice_intake_operator_actions_audited | Integration | Given operator verification and status changes, when performed, then each writes an `audit_log` row | FR-030, FR-026 | S12 | ⚠️ Deferred |
| CV-19 | it_voice_consent_policy_page_present_and_linked_from_form | Integration | Given the intake form, when rendered, then it links the Voice Consent Policy | FR-030, FR-031 | S12 | ⚠️ Deferred |
| CV-20 | it_voice_intake_licence_ref_recorded_for_trained_voice | Integration | Given a trained voice, when registered, then `licence_ref` is set and checked against the engine licence | FR-030, NFR-017 | S12 | ⚠️ Deferred |

## 7. Regression tests

Every fixed bug adds a row here before the fix merges, in the form `regression_{gh_issue_number}_{what_was_broken}`, stored in `tests/regression/`. Regression tests are never deleted. A customer-reported wrong reading also adds a golden row.

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| RG-00 | reg_template_issue_number_what_was_broken | Regression | Placeholder showing the format. Replace on the first bug. | Appendix J | any | ⚠️ Deferred |

## 8. Performance test method

Performance numbers are measurements, not claims. They are published only from `bench/results/` produced by the harness.

1. Tool: `bench/loadgen` (Rust) drives REST and WebSocket at fixed concurrency levels with the public corpus `bench/corpus/*.txt` (original sentences in hi, hinglish, en-IN, en-US).
2. Environment: the production instance class, a 4 vCPU node, warm (model loaded and warmed), with engine threads and worker pool as configured. The result file records hardware, instance class, corpus hash, commit, date.
3. Metrics recorded per run: client-side and server-side time to first audio (p50, p95, p99), real-time factor per stream, error rates by code, CPU, memory.
4. Capacity search: ramp concurrency until p95 real-time factor exceeds 0.8. The highest passing level is the measured capacity and is written to `config/capacity.toml` for that instance class. Capacity is never hand-edited above the measured value (NFR-003).
5. Targets to compare against (not claims): server-side TTFA p50 <= 60 ms and p95 <= 150 ms on a 4 vCPU node at 50% capacity with a 60-character sentence in Opus (NFR-001); real-time factor <= 0.25 per stream on one core for the default voice (NFR-002); cold start to ready <= 20 s (NFR-012); memory <= 2 GiB with all v1 voices loaded (NFR-013).
6. Runs: a short run nightly with the real models, a full ramp on each release candidate, and the Sprint 6 programme (ramp to measured capacity, 2 hour soak at 60% capacity with random client disconnects, node kill under load, Redis failover, 60 s Postgres outage). The ledger must reconcile to zero after each.
7. Repeatability: each configuration is run at least three times. Results with a spread above 10% between runs are flagged and rerun.
8. Regression gate: a nightly run whose p95 TTFA or RTF is worse than the last release baseline by more than 15% opens an issue.
9. Reporting: client-side numbers include network and are labelled as such. Server-side numbers run from request fully received to first audio byte written.

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| PF-01 | perf_gateway_ttfa_p50_p95_60char_opus_warm_node | Perf | Given a warm 4 vCPU node at 50% capacity, when a 60-character sentence is requested in Opus, then p50 <= 60 ms and p95 <= 150 ms (target) | NFR-001 | S3 | ⚠️ Deferred |
| PF-02 | perf_engine_rtf_default_voice_one_core | Perf | Given one core, when the default voice synthesises, then RTF <= 0.25 (target) | NFR-002 | S3 | ⚠️ Deferred |
| PF-03 | perf_gateway_capacity_search_writes_config | Perf | Given the ramp, when p95 RTF crosses 0.8, then the highest passing concurrency is written to `config/capacity.toml` | NFR-003 | S3 | ⚠️ Deferred |
| PF-04 | perf_gateway_cold_start_to_ready_20s | Perf | Given a cold start, when timed, then ready within 20 s | NFR-012 | S3 | ⚠️ Deferred |
| PF-05 | perf_gateway_memory_all_voices_2gib | Perf | Given all v1 voices loaded under load, when memory peaks, then at most 2 GiB | NFR-013 | S3 | ⚠️ Deferred |
| PF-06 | perf_gateway_soak_2h_60pct_capacity_zero_cut_streams | Perf | Given 2 hours at 60% capacity with random client disconnects, when complete, then zero server-terminated streams and reconciliation difference zero | NFR-004, NFR-006 | S6 | ⚠️ Deferred |
| PF-07 | perf_gateway_overload_ramp_rejects_cleanly_no_cut_streams | Perf | Given load above capacity, when ramping, then excess requests get 503 with zero audio and admitted streams finish | NFR-004, FR-019 | S6 | ⚠️ Deferred |
| PF-08 | perf_gateway_redis_failover_and_pg_outage_during_load | Perf | Given load, when Redis fails over and Postgres is down for 60 s, then behaviour follows the failure-mode policy and the ledger reconciles | NFR-005, NFR-006 | S6 | ⚠️ Deferred |
| PF-09 | perf_gateway_revocation_propagation_within_10s_under_load | Perf | Given load across nodes, when a key is revoked, then all nodes reject it within 10 s | NFR-010 | S6 | ⚠️ Deferred |
| PF-10 | perf_bench_results_file_schema_and_publish_gate | Perf | Given a result file, when the Benchmarks page builds, then fields validate and a missing file yields the "no data" state | FR-023 | S5 | ⚠️ Deferred |

## 9. Smoke checklist

Run on staging at every sprint end from Sprint 3. Record the date, commit, and result in `docs/RETROSPECTIVES.md`.

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

Automated counterparts live in `tests/smoke/` with names `smoke_{feature}_{minimal_assertion}`. The "correct reading by ear" item is manual and is not replaced by automated checks.

## 10. Test data hygiene

1. Phone numbers, card tails, OTPs, and emails in fixtures are fictitious and use reserved example domains.
2. Sample texts avoid anything that reads like a real bank message with real-looking numbers.
3. No test or log output contains a live key. Test keys use `yy_test_` and the dev key exists only when `YUYIN_ENV=dev`.
4. Real customer text and audio are never used as test data (NFR-007).

## 11. Manual listening protocol

Automated tests cannot judge how speech sounds. Every release includes a human listening pass.

**Preparation (agent).** `scripts/listening-sheet.sh` renders 40 utterances per voice to `out/listening/{voice}/` and writes a CSV score sheet with one row per utterance. Audio is generated with the release candidate build and the production model files.

**Utterance set per voice (40 total).**

| Group | Count | Coverage |
|---|---|---|
| hi | 10 | Money, dates, OTPs, names, code-switching |
| hinglish | 10 | Money, dates, OTPs, names, code-switching |
| en-IN | 10 | Money, dates, OTPs, names, code-switching |
| en-US | 10 | Money, dates, OTPs, names, code-switching |

Within each group of 10, the set covers at minimum: 2 money (including lakh or crore forms for hi, hinglish, en-IN, and thousands with cents for en-US), 2 dates and times, 2 OTP or PIN or phone readings, 2 personal and place names, and 2 code-switching sentences (for en-US, loanword and name pronunciation instead). Texts are original and not modelled on real bank messages.

**Scoring (human).** A listener who reads and speaks the language scores each utterance 1 to 5 on two axes.

| Score | Intelligibility | Naturalness |
|---|---|---|
| 5 | Every word and number clear on first listen | Indistinguishable from careful human speech |
| 4 | Clear, one minor slip | Natural with minor artefacts |
| 3 | Understandable with effort | Noticeably synthetic but acceptable |
| 2 | Parts unclear or a number misread | Distracting artefacts |
| 1 | Not understandable or wrong reading | Unusable |

Any wrong reading of a number, date, OTP digit, or amount is recorded as a defect regardless of score. It becomes a golden row and a regression test.

**Ship rule.** The voice score is the mean of all 40 utterance scores (both axes averaged). A voice with a mean below 3.5 does not ship. The result is recorded in the release notes and the sheet is archived with the release.

**Cadence.** Every release, every new voice, every engine or phonemiser change, and every change to normalisation rules that alter spoken output. At least two listeners score each hi and hinglish voice where available; disagreement above one point on any utterance is discussed and rescored.

| ID | Test name | Type | Given / When / Then | Spec ref | Sprint | Status |
|---|---|---|---|---|---|---|
| LS-01 | smoke_listening_sheet_generates_40_rows_per_voice | Smoke | Given a voice, when `scripts/listening-sheet.sh` runs, then 40 audio files and a CSV with 10 rows per language exist | ARCH release gate | S3 | ⚠️ Deferred |
| LS-02 | smoke_listening_sheet_all_audio_decodes | Smoke | Given the output directory, when decoded, then every file is playable | ARCH release gate | S3 | ⚠️ Deferred |
| LS-03 | smoke_listening_mean_below_3_5_blocks_release | Smoke | Given a completed sheet with mean below 3.5, when the release checklist script reads it, then the release is blocked | ARCH release gate | S6 | ⚠️ Deferred |
| LS-04 | smoke_listening_each_voice_scored_before_release | Smoke | Given a release candidate, when the checklist runs, then every public voice has a completed sheet | ARCH release gate | S6 | ⚠️ Deferred |
