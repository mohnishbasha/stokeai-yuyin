# Other CPU ONNX TTS candidates with Hindi licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models: asset names and sizes
- https://huggingface.co/rhasspy/piper-voices (raw MODEL_CARDs for hi_IN pratham, priyamvada, rohan; en_US lessac, ljspeech)
- https://huggingface.co/hexgrad/Kokoro-82M and its VOICES.md
- https://huggingface.co/Supertone/supertonic-3 (README, LICENSE)
- https://huggingface.co/kyutai/pocket-tts and https://huggingface.co/saryps-labs/pocket-tts-hindi
- https://huggingface.co/KittenML/kitten-tts-nano-0.8

## Licence
| Candidate | Code | Weights | Data | Hindi | Verdict |
|---|---|---|---|---|---|
| Piper hi_IN (pratham, priyamvada, rohan), VITS | Piper repo; rhasspy/piper-voices tagged MIT; Piper engine and espeak-ng GPL (not re-verified) | per voice | pratham, priyamvada: CC BY-NC-SA 4.0 (card). rohan: IITM licence PDF, and fine-tuned from lessac, whose Blizzard 2013 licence bans commercial voice synthesis | yes, int8 about 21 MB each | RESTRICTED |
| Kokoro-82M (kokoro-multi-lang-v1_0) | Apache 2.0 | Apache 2.0 | "permissive, non-copyrighted" public domain plus synthetic data from major TTS providers (card claim; provider ToS risk not verified) | yes: hf_alpha, hf_beta, hm_omega, hm_psi (about minutes each, grade C); US English af_*, am_* | CLEAN on licence, quality of Hindi low |
| Supertonic 3 (Supertone) | MIT sample code | OpenRAIL-M (use-based restrictions, must be passed downstream) | not verified | yes, 31 languages incl. hi; about 99M params; 128.8 MB int8 on sherpa-onnx | UNCLEAR |
| Pocket TTS (Kyutai) | MIT | CC-BY-4.0 | VCTK, CommonVoice, Expresso voices (card); official langs en, fr, de, pt, it, es | official: no. Community saryps-labs/pocket-tts-hindi, 219 MB, trained on IndicVoices and Kathbath, licence "other" | UNCLEAR |
| Kitten TTS nano 0.8 | Apache 2.0 | Apache 2.0, 15M params, about 31 MB int8 | not verified | English only (not verified for others) | CLEAN for US English only |

- Indian English: no dedicated Indian English voice found in any candidate (not verified for Kokoro en-IN; none listed in VOICES.md grep).
- Not covered due to limit: Svara-TTS, Veena, Indri (GPU LLM-style, not CPU ONNX; not verified).

## Excerpts
> Kokoro: "Apache 2.0 license" (model card)

> Supertonic 3: "The accompanying model is released under the OpenRAIL-M License."

> Piper pratham card: "License: http://creativecommons.org/licenses/by-nc-sa/4.0/"

> Blizzard 2013: no use "for any commercial purpose, including the development, marketing, commercialisation, sale or licencing of voice synthesis or speech recognition products or services"

## Commercial hosted use and container redistribution
Kokoro is the only candidate with a clear Apache 2.0 licence and Hindi voices in a CPU ONNX package; its risks are low Hindi quality, reliance on the card's data provenance claim, and espeak-ng (GPL) in the phonemisation path. Piper Hindi voices should be avoided: NC-SA data and a Blizzard-tainted base model. Supertonic 3 needs legal review of OpenRAIL-M behavioural restrictions.
Verdict: UNCLEAR (Kokoro CLEAN on stated licences; others restricted or unverified)
