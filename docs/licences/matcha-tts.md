# Matcha-TTS licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/shivammehta25/Matcha-TTS (and raw LICENSE, README): code licence, training instructions
- https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/matcha.html: sherpa-onnx Matcha model list
- https://api.github.com/repos/k2-fsa/sherpa-onnx/releases/tags/tts-models: asset names and sizes
- https://huggingface.co/rhasspy/piper-voices/raw/main/en/en_US/ljspeech/medium/MODEL_CARD: LJSpeech licence statement

## Licence
| Item | Licence | Size / note |
|---|---|---|
| Matcha-TTS code | MIT (Copyright 2023 Shivam Mehta) | n/a |
| matcha-icefall-en_US-ljspeech (sherpa-onnx) | model licence file not verified; trained on LJSpeech | 76.8 MB archive, model-steps-3.onnx 71M |
| vocos-22khz-univ.onnx vocoder | not verified (Vocos upstream is believed MIT, not checked) | 51M |
| matcha-icefall-zh-baker | Data-Baker, non-commercial only | exclude |
| matcha-icefall-zh-en, matcha-tts-fa_en-khadijah / musa | not verified | not needed |

- Bake-off voice id: matcha-ljspeech (the single speaker of matcha-icefall-en_US-ljspeech, sid 0).
- Phonemiser: matcha-icefall-en_US-ljspeech requires espeak-ng (bundled in the download). espeak-ng is GPL-3.0 (from general knowledge, not re-verified here).
- Training data: LJSpeech, "public domain" per the Piper model card citing keithito.com. Baker is non-commercial.
- Hindi / Indian English: no Matcha model for either appears in the sherpa-onnx tts-models release asset list (only en_US, zh, zh-en, fa_en). No clean Hindi or Indian English Matcha model found.
- Chunked output: not verified for Matcha specifically. sherpa-onnx has a generation callback in its TTS API, but I did not verify it for Matcha.

## Excerpts
> MIT License. Copyright (c) 2023 Shivam Mehta

> Dataset: LJ Speech ... License: public domain (Piper ljspeech MODEL_CARD)

> matcha-icefall-zh-baker ... Dataset: Data-Baker (non-commercial use only) (sherpa-onnx docs)

## Commercial hosted use and container redistribution
Code (MIT), LJSpeech data (public domain) and the English model are low risk for US English. Risks: the exact licence of the sherpa-onnx packaged weights and the Vocos vocoder was not verified, and the bundled espeak-ng is GPL-3.0 which matters if shipped inside the container or linked into the service (process-boundary and source-offer obligations). It gives no Hindi and no Indian English, so it only covers one of the three required locales. Do not use the Baker model.
Verdict: UNCLEAR (US English likely clean; weights and vocoder licence files not verified; no Hindi)
