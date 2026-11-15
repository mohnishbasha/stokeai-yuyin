# ADR-015 Speech engine selection

- Status: Proposed, blocked on owner decision [#184](https://github.com/mohnishbasha/stokeai-yuyin/issues/184).
- Task: S1-T10 ([#23](https://github.com/mohnishbasha/stokeai-yuyin/issues/23)).
- Spec references: PRD FR-003, FR-004, NFR-001, NFR-002, NFR-017; ARCHITECTURE "Synthesis engine" (section 6) and ADR-015 in the decision log.

## Context

D9 fixes the approach: open-weights neural TTS, ONNX Runtime, CPU. It does not fix the model or the binding. S1-T10 evaluated candidates for licence, language coverage, chunked output, and measured speed and memory. The task rule is: if no candidate has an acceptable Hindi voice with a clean licence, stop and raise a `status: needs-owner` issue, and do not ship a voice with unclear rights.

Evidence is in [docs/licences/](../licences/), retrieved 2026-11-14. The harness is in [bench/engine-bakeoff/](../../bench/engine-bakeoff/). Measurements are in [bench/engine-bakeoff/results/](../../bench/engine-bakeoff/results/).

## Decision

**No Hindi engine is chosen.** No candidate has a Hindi voice that is both acceptable and licence-clean for commercial hosted use and container redistribution. Per the task rule, this ADR does not pick an engine, and the owner decision is raised in [#184](https://github.com/mohnishbasha/stokeai-yuyin/issues/184). `FakeEngine` stays the only engine until the owner decides. Dependency lines for `ort` and `sherpa-onnx` stay conditional.

### Options for the owner (from #184)

1. Accept Kokoro-82M for Hindi with a first-party (non-GPL) Hindi G2P written by us, and accept the training-data provenance risk in writing (counsel review recommended). Still needs RTF work to meet NFR-002.
2. Train a first-party Hindi (and Indian English) voice on CC BY 4.0 data (IndicVoices-R, SYSPIN) on the Stoke GPU nodes, with a Kokoro or VITS sized architecture and a first-party phonemiser. Longest path, cleanest licence.
3. Contact a rights holder (for example IIT Madras Indic TTS, or the Piper hi_IN authors) for a commercial licence.
4. Change the product scope: launch with US English only and add Hindi later.

### Fallback

If the owner chooses option 4 or wants English first: Piper `en_US-ljspeech-medium` (LJ Speech, public domain, trained from scratch, listed in Piper's COMMERCIAL_USE.md) is licence-clean for US English only. Two blockers remain before it can ship, and neither is resolved here:

- Piper phonemisation needs espeak-ng (GPL-3.0). The shipped engine must not link it, so an English-only build needs a non-GPL English phonemiser (a lexicon front end is available in sherpa-onnx 2.x, but the match to this voice's training phonemes is not verified).
- The voice is one speaker, and Indian English is not available from any candidate.

Kokoro `af_heart` (Apache-2.0 weights) is the other US English option on licence, with the training-data provenance risk described below, and it misses NFR-002 on this hardware (RTF 1.0 on one thread).

## Candidates

Licences are read from the evidence files. "UNCLEAR" means the evidence could not be fully read or verified, and the rule is to treat that as not shippable.

| Candidate | Code | Weights | Voices (Hindi / Indian English / US English) | Phonemiser | Training data | Verdict | Evidence |
|---|---|---|---|---|---|---|---|
| Kokoro-82M v1.0 via sherpa-onnx | Apache-2.0 (kokoro, misaki, sherpa-onnx); kokoro-onnx MIT | Apache-2.0 (model card only, no LICENSE file upstream) | Hindi hf_alpha, hf_beta, hm_omega, hm_psi (grade C, minutes of data) / none / af_heart (grade A) and others | Hindi: espeak-ng `hi`, GPL-3.0. English: misaki dictionaries (Apache-2.0 repo, data provenance not verified), espeak-ng fallback | Card states permissive data plus synthetic audio from closed TTS providers (unnamed, unquantified risk) | Licence clean on paper. Hindi blocked by GPL G2P and provenance risk. Too slow on ARM | [kokoro-82m.md](../licences/kokoro-82m.md), [espeak-ng.md](../licences/espeak-ng.md), [sherpa-onnx.md](../licences/sherpa-onnx.md) |
| Piper (VITS) hi_IN voices | rhasspy/piper MIT, archived; successor piper1-gpl GPL-3.0 | No licence from Piper; rights follow the data | Hindi pratham, priyamvada, rohan / none / none | espeak-ng (GPL-3.0) | pratham, priyamvada: CC BY-NC-SA 4.0. rohan: IIT Madras data, fine-tuned from lessac (Blizzard 2013, bans commercial voice synthesis); IITM licence PDF not read | RESTRICTED | [piper-voices.md](../licences/piper-voices.md), [indic-tts-ai4bharat.md](../licences/indic-tts-ai4bharat.md) |
| Piper (VITS) en_US voices | as above | as above | none / none / en_US-ljspeech-medium, en_US-lessac-medium | espeak-ng (GPL-3.0) | ljspeech: public domain, CLEAN. lessac: Blizzard 2013, RESTRICTED | ljspeech CLEAN for US English only. lessac RESTRICTED | [piper-voices.md](../licences/piper-voices.md), [espeak-ng.md](../licences/espeak-ng.md) |
| Matcha-TTS icefall en_US-ljspeech via sherpa-onnx | MIT (Matcha-TTS), Apache-2.0 (sherpa-onnx) | Model licence file not verified; vocoder licence not verified | none / none / matcha-ljspeech | espeak-ng (GPL-3.0) | LJ Speech, public domain | US English only, weights licence UNCLEAR. No Hindi or Indian English model exists | [matcha-tts.md](../licences/matcha-tts.md) |
| Meta MMS-TTS hin | not verified | CC-BY-NC-4.0 | Hindi / none / none | character level, not verified | not verified | RESTRICTED (non-commercial) | [mms-tts.md](../licences/mms-tts.md) |
| AI4Bharat Indic-TTS and Indic Parler-TTS | MIT (Indic-TTS code) | Parler: Apache-2.0. Indic-TTS checkpoints: not stated | Hindi / none / none | not verified | IITM data licence UNCLEAR (PDF not read); Parler inherits IndicTTS and Rasa terms | Parler is about 0.9B parameters, not CPU feasible for NFR-001 and NFR-002. Not measured | [indic-tts-ai4bharat.md](../licences/indic-tts-ai4bharat.md) |
| Supertonic 3 | MIT sample code | OpenRAIL-M (use restrictions pass downstream) | Hindi yes | not verified | not verified | UNCLEAR. Not measured | [other-candidates.md](../licences/other-candidates.md) |
| Pocket TTS Hindi (community) | MIT (Kyutai code) | Community weights: licence "other" | Hindi yes (community) | not verified | IndicVoices, Kathbath | UNCLEAR. Not measured | [other-candidates.md](../licences/other-candidates.md) |
| Kitten TTS nano 0.8 | Apache-2.0 | Apache-2.0 | English only | not verified | not verified | CLEAN on stated licence, US English only. Not measured | [other-candidates.md](../licences/other-candidates.md) |
| ONNX Runtime and `ort` (runtime only) | MIT; `ort` MIT OR Apache-2.0 (2.0 release candidate) | n/a | n/a | n/a | n/a | Acceptable runtime | [onnxruntime.md](../licences/onnxruntime.md) |

Indian English: no candidate has a dedicated Indian English voice. The harness renders the Indian English listening list through each candidate's Hindi voices as a stand-in, which is not an Indian English voice.

### Chunked output inside a segment

No candidate emits audio inside a segment. All were measured with `Chunked inside segment = no` (the first audio callback arrives only when the segment is complete), so TTFA equals segment synthesis time. Streaming in Yuyin is therefore at segment level, which makes the short first segment in `yuyin-text` segmentation the main lever on TTFA. sherpa-onnx calls its generation callback per sentence batch, not within one forward pass.

## Measurements

Source: [results/docker-arm64-4cpu/report.md](../../bench/engine-bakeoff/results/docker-arm64-4cpu/report.md) and `results.json` in the same directory. Host: `linux/arm64` Docker container limited to 4 CPUs on a 10-core Apple silicon Mac, sherpa-onnx 1.13.8, median of 3 runs, measured 2026-11-14. TTFA is for one 59-character segment, warm. RTF is over the three-sentence corpus per language. Peak RSS is per process with one model loaded.

**x86 (4 vCPU): NOT MEASURED.** No x86 instance is available until owner item O4 (AWS account) is done. The acceptance criterion "all recorded measurements on x86 and ARM" is therefore not met, and no x86 number is given. The ARM numbers come from a laptop container, so they compare candidates and are not capacity figures.

Targets for reference (not claims): NFR-001 TTFA p50 <= 60 ms; NFR-002 RTF <= 0.25 on one core.

One thread (the NFR-002 basis):

| Candidate | Voice | Lang | Load s | TTFA ms | RTF | Peak RSS MiB |
|---|---|---|---|---|---|---|
| kokoro-v1.0-fp32 | af_heart | en-US | 2.66 | 3956 | 1.0031 | 683 |
| kokoro-v1.0-fp32 | hf_alpha | hi | 5.43 | 6829 | 1.4621 | 845 |
| kokoro-v1.0-int8 | af_heart | en-US | 1.27 | 3842 | 1.1919 | 504 |
| kokoro-v1.0-int8 | hf_alpha | hi | 0.92 | 5527 | 1.156 | 678 |
| matcha-icefall-en_US-ljspeech | matcha-ljspeech | en-US | 0.81 | 452 | 0.0912 | 257 |
| piper-en_US-ljspeech-medium | en_US-ljspeech-medium | en-US | 0.75 | 281 | 0.09 | 346 |
| piper-en_US-lessac-medium | en_US-lessac-medium | en-US | 0.51 | 306 | 0.0905 | 267 |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | hi | 0.56 | 543 | 0.1078 | 337 |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | hi | 0.67 | 571 | 0.1648 | 386 |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | hi | 0.66 | 618 | 0.2004 | 439 |

Four threads (single-stream latency on a 4 vCPU node):

| Candidate | Voice | Lang | Load s | TTFA ms | RTF | Peak RSS MiB |
|---|---|---|---|---|---|---|
| kokoro-v1.0-fp32 | af_heart | en-US | 1.42 | 1020 | 0.3463 | 683 |
| kokoro-v1.0-fp32 | hf_alpha | hi | 2.09 | 4066 | 0.803 | 843 |
| kokoro-v1.0-int8 | af_heart | en-US | 1.10 | 3246 | 1.1237 | 504 |
| kokoro-v1.0-int8 | hf_alpha | hi | 0.86 | 4694 | 1.1329 | 675 |
| matcha-icefall-en_US-ljspeech | matcha-ljspeech | en-US | 0.94 | 263 | 0.0314 | 242 |
| piper-en_US-ljspeech-medium | en_US-ljspeech-medium | en-US | 0.80 | 131 | 0.0442 | 341 |
| piper-en_US-lessac-medium | en_US-lessac-medium | en-US | 0.87 | 155 | 0.0373 | 302 |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | hi | 0.56 | 214 | 0.0428 | 407 |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | hi | 0.43 | 157 | 0.0347 | 387 |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | hi | 0.57 | 285 | 0.0627 | 360 |

Reading the numbers:

- Kokoro misses NFR-002 by a wide margin on one core (RTF about 1.0 to 1.5) and its TTFA is seconds. The fast Piper and Matcha models meet RTF on one core, but their Hindi voices are not licence-clean.
- Several rows have a large run-to-run spread (the report has the column), so single numbers are indicative only.
- No candidate meets NFR-001 (60 ms) with a 59-character first segment. The shortest TTFA measured is 131 ms (4 threads, Piper ljspeech and priyamvada). Closing that gap is a Sprint 3 benchmark question and is not claimed here.

## Listening sample

The 20-utterance lists per language are in `bench/engine-bakeoff/texts/` (`listening-hi.txt`, `listening-en-IN.txt`, `listening-en-US.txt`), and `listen.py` renders them with a score sheet. Audio is not committed, because the repository is public and output from these weights is not ours to publish before review. The rendered samples and 1 to 5 scores are held locally and were not scored by a human listener in this run, so this ADR makes no quality claim beyond the licence and speed findings.

## Voice licence register

Every voice rendered by the harness is listed here with its evidence file (checked by `tests/scaffold/unit_docs_licences_voiceentries_evidencefilepresent.sh`). Verdicts: CLEAN, RESTRICTED, UNCLEAR. "CLEAN" means the stated licences allow commercial hosted use and container redistribution; it does not clear the phonemiser or provenance risks above.

| Voice | Language | Verdict | Evidence |
|---|---|---|---|
| `hf_alpha` | Hindi (Kokoro) | UNCLEAR: Apache-2.0 weights, but GPL espeak-ng G2P and unquantified training-data provenance | [docs/licences/kokoro-82m.md](../licences/kokoro-82m.md) |
| `hm_omega` | Hindi (Kokoro) | UNCLEAR: same as hf_alpha | [docs/licences/kokoro-82m.md](../licences/kokoro-82m.md) |
| `af_heart` | US English (Kokoro) | CLEAN on stated licence, provenance risk noted | [docs/licences/kokoro-82m.md](../licences/kokoro-82m.md) |
| `am_michael` | US English (Kokoro) | CLEAN on stated licence, provenance risk noted | [docs/licences/kokoro-82m.md](../licences/kokoro-82m.md) |
| `hi_IN-pratham-medium` | Hindi (Piper) | RESTRICTED: CC BY-NC-SA 4.0 | [docs/licences/piper-voices.md](../licences/piper-voices.md) |
| `hi_IN-priyamvada-medium` | Hindi (Piper) | RESTRICTED: CC BY-NC-SA 4.0 | [docs/licences/piper-voices.md](../licences/piper-voices.md) |
| `hi_IN-rohan-medium` | Hindi (Piper) | RESTRICTED: fine-tuned from lessac, IITM licence not read | [docs/licences/piper-voices.md](../licences/piper-voices.md) |
| `en_US-lessac-medium` | US English (Piper) | RESTRICTED: Blizzard 2013 research licence | [docs/licences/piper-voices.md](../licences/piper-voices.md) |
| `en_US-ljspeech-medium` | US English (Piper) | CLEAN: public domain data, trained from scratch (phonemiser GPL, see Fallback) | [docs/licences/piper-voices.md](../licences/piper-voices.md) |
| `matcha-ljspeech` | US English (Matcha) | UNCLEAR: model licence file not verified | [docs/licences/matcha-tts.md](../licences/matcha-tts.md) |

## Consequences

- No engine ships until [#184](https://github.com/mohnishbasha/stokeai-yuyin/issues/184) is decided. `FakeEngine` remains the development and CI engine, and the gateway cannot offer a real Hindi voice.
- The sherpa-onnx versions that still contain espeak-ng (up to 1.13.8) are GPL-tainted for distribution. Version 2.x removed it ([sherpa-onnx.md](../licences/sherpa-onnx.md)), so any shipped build uses 2.x with a non-GPL front end.
- The x86 measurements are still owed, after owner item O4.
- A human listening pass over the rendered samples is still owed before any voice is accepted.
- `config/models.sha256` and `scripts/fetch-models.sh` are written once an engine is decided.

## Status

Proposed, blocked on owner decision [#184](https://github.com/mohnishbasha/stokeai-yuyin/issues/184). This ADR moves to Accepted when the owner picks an option and the chosen engine is measured on x86.
