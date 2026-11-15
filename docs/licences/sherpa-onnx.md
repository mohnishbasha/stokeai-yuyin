# sherpa-onnx licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/k2-fsa/sherpa-onnx (GitHub licence API: Apache-2.0; master as of 2026-11-13)
- Commit 0b36476 "Remove espeak-ng and piper-phonemize from sherpa-onnx (#4055)", 2026-10-20
- CHANGELOG.md (2.0.0, 2.0.1); releases v2.0.0 (2026-10-23), v2.0.1 (2026-10-26), v1.13.8 (2026-09-10)
- sherpa-onnx/csrc/offline-tts-kokoro-impl.h, offline-tts-impl.h, offline-tts-vits-model-config.h
- tts-models release asset kokoro-multi-lang-v1_0.tar.bz2 (file listing and LICENSE)

## Licence
- Code: Apache-2.0.
- Weights: depend on the model bundle. kokoro-multi-lang-v1_0 includes a LICENSE file that is the Apache-2.0 text (see kokoro-82m.md for the upstream weights statement).
- Voices: kokoro-multi-lang-v1_0 ships voices.bin, lexicon-us-en.txt, lexicon-gb-en.txt, lexicon-zh.txt and tokens.txt; voice list per voice not verified here.
- Phonemiser: Previously (up to v1.13.8) espeak-ng was built statically into sherpa-onnx via piper-phonemize. Since PR #4055 (included in v2.0.0 onward) it is not. Text frontends are now "lexicon" (built in) or "phonemize" (caller supplies phonemes or tokens, e.g. via GPL piper-phonemize). `data_dir` on VITS and Kokoro configs is "Deprecated. Ignored since v2.0.0: espeak-ng is no longer used." Consequence: for Kokoro, Hindi (which needs espeak-ng `hi` in the reference stack) now has no built-in frontend; Hindi text must be phonemised outside sherpa-onnx (how well this matches Kokoro training phonemes is not verified). The kokoro-multi-lang-v1_0 tarball still contains an espeak-ng-data directory (GPL data, for older versions).
- Training data: not applicable (see kokoro-82m.md).

## Streaming and callback
- C++ API: `OfflineTts::Generate(text, GenerationConfig, GeneratedAudioCallback callback = nullptr)`. The older `Generate(text, sid, speed, callback)` is marked deprecated. In the Kokoro implementation the callback is invoked with (samples, n, progress) after each generated chunk (sentence-level batches) and its return value can stop generation; a final call with progress 1.0 is made. Granularity is per sentence or segment, not within one forward pass. Bindings exist for C, Python, Java, Kotlin, Go, Rust, C#, Swift, Dart, JS, WASM.
- `GenerationConfig` gained `phoneme_codepoints` and `tokens` as alternatives to `text`.

## Excerpts
> espeak-ng and piper-phonemize are no longer built into sherpa-onnx. ... That library is GPL, so it stays optional: sherpa-onnx is GPL-free after this PR.
> Deprecated. Ignored since v2.0.0: espeak-ng is no longer used.

## Commercial hosted use and container redistribution
sherpa-onnx 2.0.x is Apache-2.0 and GPL-free, which is suitable for hosted use and image redistribution (ship Apache notice, and ONNX Runtime MIT notice). Flags: versions at or below 1.13.8 statically link GPL-3.0 espeak-ng, so pin to 2.0.0 or later and verify the built artefacts (wheels, prebuilt libs) contain no espeak symbols; the espeak-ng-data in model tarballs is GPL-licensed data and should be removed from our image unless needed; Hindi quality depends on an external phonemiser we would have to supply (a GPL one would re-introduce the issue). Project is moving fast (major version in October 2026), so API stability is a risk.
