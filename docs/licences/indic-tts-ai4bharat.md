# AI4Bharat Indic-TTS and Indic Parler-TTS licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/AI4Bharat/Indic-TTS: code, checkpoint release
- https://github.com/AI4Bharat/Indic-TTS/releases/tag/v1-checkpoints-release: checkpoint sizes
- https://www.iitm.ac.in/donlab/indictts/downloads/license.pdf: IITM database licence (fetch timed out three times; content NOT read directly)
- https://aikosh.indiaai.gov.in/home/datasets/details/hindi_female_mono_indictts_phase3.html: AIKosh listing, Hindi female
- https://huggingface.co/rhasspy/piper-voices/raw/main/hi/hi_IN/rohan/medium/MODEL_CARD: Piper voice trained on IITM Hindi male
- https://huggingface.co/ai4bharat/indic-parler-tts: Parler weights
- https://huggingface.co/datasets/ai4bharat/indicvoices_r and https://github.com/AI4Bharat/IndicVoices-R
- https://vaani.iisc.ac.in/dataset/syspindataset: SYSPIN

## Licence
| Item | Licence | Note |
|---|---|---|
| Indic-TTS code | MIT (Copyright 2023 AI4Bhārat) | FastPitch + HiFi-GAN V1 |
| Indic-TTS checkpoints | not stated in README; hi.zip is 1.52 GB (PyTorch/Coqui, not ONNX) | weights licence not verified |
| IITM Indic TTS database | UNCLEAR: AIKosh page says CC BY 4.0 for Hindi female Phase 3; a search summary of license.pdf says royalty-free, derivative works allowed, keep the TTS Consortium copyright notice; license.pdf itself not read | must read PDF before relying |
| Indic Parler-TTS | Apache 2.0 | 0.9B params, model.safetensors 3.75 GB (F32) |
| Parler training data | GLOBE, IndicTTS, LIMMITS, Rasa, about 1,806 h | inherits IndicTTS and Rasa dataset terms, not verified |
| IndicVoices-R | CC-BY-4.0 | Hindi 74.6 h, 399 speakers; HF gated (login and accept terms) |
| SYSPIN S1.0 | CC-BY-4.0 | 920 h, 9 languages incl. Hindi, studio 48 kHz, 18 speakers |

- Phonemiser: not verified (Indic-TTS uses character input per paper, not checked).
- CPU feasibility: Indic Parler-TTS at 0.9B F32 with an autoregressive codec decoder is heavy for CPU and has no ONNX package found. Indic-TTS FastPitch + HiFi-GAN is exportable but no ready ONNX was found.

## Excerpts
> The project is released under the MIT License (Indic-TTS repository).

> "This model is permissively licensed under the Apache 2.0 license." (indic-parler-tts)

> Hindi Female Mono (IndicTTS Phase3): "Attribution 4.0 International (CC BY 4.0)" (AIKosh)

> The Piper rohan card lists the IITM licence as https://www.iitm.ac.in/donlab/indictts/downloads/license.pdf

## Commercial hosted use and container redistribution
Risk: the IITM database licence text was not read, and sources disagree on whether Phase 3 data is CC BY 4.0. Older IITM Phase 1 releases may differ; check per database. Indic Parler-TTS is Apache 2.0 but its training mix includes IndicTTS and other sets whose terms it does not clear for us, and it is too large for practical CPU latency. IndicVoices-R and SYSPIN (CC-BY-4.0, attribution only) are the strongest basis for a self-trained clean Hindi voice, but that means training our own model.
Verdict: UNCLEAR (clean data sources exist: IndicVoices-R and SYSPIN; IITM terms and checkpoint weights licence unverified)
