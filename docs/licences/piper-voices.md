# Piper voices licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/rhasspy/piper: original engine, MIT, archived 2025-10-06, points to successor.
- https://github.com/OHF-Voice/piper1-gpl: current engine, GPL-3.0, embeds espeak-ng.
- https://github.com/rhasspy/piper-phonemize: MIT, archived 2025-07-10.
- https://raw.githubusercontent.com/OHF-Voice/piper1-gpl/main/docs/LICENSING.md: voice licensing policy.
- https://raw.githubusercontent.com/OHF-Voice/piper1-gpl/main/docs/COMMERCIAL_USE.md: voices with a fully permissive chain.
- https://raw.githubusercontent.com/OHF-Voice/piper1-gpl/main/docs/API_PYTHON.md: streaming API.
- https://huggingface.co/rhasspy/piper-voices/raw/main/voices.json: voice index (182 keys).
- https://huggingface.co/rhasspy/piper-voices/raw/main/<lang>/<locale>/<voice>/<quality>/MODEL_CARD: per voice cards (all read 2026-11-14).
- https://huggingface.co/rhasspy/piper-voices/raw/main/en/en_US/hifi_tts_92/medium/MODEL_CARD: new base voice card.
- https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html: Blizzard 2013 Lessac licence.
- https://www.iitm.ac.in/donlab/indictts/downloads/license.pdf: IIT Madras licence (fetches timed out or failed on two attempts plus a retry, NOT read).
- https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models: asset list of sherpa-onnx tts-models.

## Licence
- Code: rhasspy/piper is MIT but archived (read-only since 2025-10-06). Development moved to OHF-Voice/piper1-gpl, GPL-3.0 (LICENSING.md says "GPL-3.0-or-later"). Running it as a hosted network service does not by itself trigger GPL-3.0 source release (it is not AGPL); counsel to confirm. Distributing it in a container image does trigger GPL obligations.
- Phonemiser: piper-phonemize is MIT (archived 2025-07-10) but linked espeak-ng (GPL-3.0; see espeak-ng.md for that evidence). piper1-gpl embeds espeak-ng directly in the Python wheel, which is why the engine is GPL. Any Piper phonemisation pulls in espeak-ng.
- Voices: Piper grants no licence over voice models (LICENSING.md). Rights come from training data, and the chain of fine-tuned bases must be walked. A dataset licence line on a MODEL_CARD covers only the recordings named directly above it.

| Voice id | Language | Dataset | Dataset licence | Verdict | Source URL |
|---|---|---|---|---|---|
| en_US-lessac-medium | en-US | Blizzard 2013 Lessac (cstr.ed.ac.uk), from scratch | Research Licence Agreement, commercial use excluded, incl. "voice synthesis ... products or services" | RESTRICTED | .../en/en_US/lessac/medium/MODEL_CARD |
| en_US-amy-medium | en-US | MycroftAI mimic3-voices | "See URL"; COMMERCIAL_USE.md says amy "has no documented licence". Card says fine-tuned from hifi_tts_92 (CC BY 4.0), not lessac | UNCLEAR | .../en/en_US/amy/medium/MODEL_CARD |
| en_US-ryan-medium | en-US | RyanSpeech (Kaggle) | CC BY-NC-SA 4.0; fine-tuned from rdh (CC0) | RESTRICTED | .../en/en_US/ryan/medium/MODEL_CARD |
| en_US-libritts_r-medium | en-US, 904 spk | LibriTTS-R (openslr.org/141) | Dataset CC BY 4.0, BUT card says "Fine-tuned from English lessac medium", so the Lessac research-only chain carries over; not on COMMERCIAL_USE.md | RESTRICTED (chain) | .../en/en_US/libritts_r/medium/MODEL_CARD |
| en_US-ljspeech-medium | en-US | LJ Speech (keithito.com) | public domain; trained from scratch; listed in COMMERCIAL_USE.md | CLEAN | .../en/en_US/ljspeech/medium/MODEL_CARD |
| en_US-hfc_female-medium | en-US | Hi-Fi Captain (NICT) | CC BY-NC-SA 4.0 (fine-tuned from hifi_tts_92) | RESTRICTED | .../en/en_US/hfc_female/medium/MODEL_CARD |
| en_US-hfc_male-medium | en-US | Hi-Fi Captain (NICT) | CC BY-NC-SA 4.0; fine-tuned from lessac | RESTRICTED | .../en/en_US/hfc_male/medium/MODEL_CARD |
| hi_IN-pratham-medium | Hindi | card links AI4Bharat indicnlp_corpus (a text corpus; audio source not stated) | CC BY-NC-SA 4.0 per card; trained by PravalX | RESTRICTED | .../hi/hi_IN/pratham/medium/MODEL_CARD |
| hi_IN-priyamvada-medium | Hindi | same as pratham | CC BY-NC-SA 4.0 per card | RESTRICTED | .../hi/hi_IN/priyamvada/medium/MODEL_CARD |
| hi_IN-rohan-medium | Hindi | IIT Madras Indic TTS, "Hindi Mono Male" | IITM licence.pdf not read (not verified); a search snippet suggested CC BY 4.0 but this is unconfirmed. Card says fine-tuned from lessac, so Blizzard research-only terms carry over | RESTRICTED (lessac chain) | .../hi/hi_IN/rohan/medium/MODEL_CARD |

No en_IN voice exists in voices.json. The only hi_IN voices are the three above.

Streaming: Piper/VITS synthesises a whole utterance per pass. piper1-gpl `PiperVoice.synthesize` yields one audio chunk per sentence, so there is no incremental output inside one sentence. No sub-sentence streaming variant verified.

sherpa-onnx packaging: the tts-models release has 646 assets. vits-piper-hi_IN-{pratham,priyamvada,rohan}-medium exist, each with plain, -int8 and -fp16 tarballs. All seven requested en_US voices are also packaged (plus int8/fp16). Packaging does not change dataset licences. Whether the tarballs carry the MODEL_CARD, or which checkpoint version they hold: not verified.

## Excerpts
> "The Piper project makes no license grant of its own over voice models." (LICENSING.md, as summarised by the fetch tool; verbatim not verified)
> "excludes ... using the Materials for any commercial purpose, including the development, marketing, commercialisation, sale or licencing of voice synthesis or speech recognition products or services" (Blizzard 2013 licence)
> "`en_US-amy-medium` has been retrained away from lessac, but its recordings have no documented license, so it is not listed." (COMMERCIAL_USE.md)
> "Non-commercial datasets, whatever the base. Examples are hfc_female, hfc_male, ryan ..." (COMMERCIAL_USE.md)
> "Fine-tuned from English lessac medium on train-clean-360." (libritts_r MODEL_CARD)
> "Many voices below were retrained in late 2026 to remove a lessac base from their chain." (COMMERCIAL_USE.md)

## Commercial hosted use and container redistribution
Only en_US-ljspeech-medium is CLEAN among the requested voices; amy is UNCLEAR and every other requested voice, including all Hindi voices, is RESTRICTED. Upstream is retraining voices off lessac in late 2026 without renaming them, so any copy (including sherpa-onnx tarballs, not verified) must have its MODEL_CARD checked for "Finetuned from ... lessac"; the libritts_r card on 2026-11-14 still names lessac. No verified commercially clean Hindi Piper voice was found; rohan needs the IITM licence read and a non-lessac retrain. Engine risk: piper1-gpl is GPL-3.0 with espeak-ng embedded, so shipping it in a container we distribute triggers GPL source obligations, while archived MIT rhasspy/piper gets no fixes. CC BY voices need attribution, and redistributed voices must ship their MODEL_CARD.
