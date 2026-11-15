# ONNX Runtime licence evidence

Retrieved: 2026-11-14
Retrieved by: agent (S1-T10 engine bake-off)

## Sources
- https://github.com/microsoft/onnxruntime (LICENSE, ThirdPartyNotices.txt, latest release v1.32.0)
- https://github.com/pykeio/ort (Cargo.toml version 2.0.0-rc.15, LICENSE-APACHE, LICENSE-MIT)

## Licence
- Code: ONNX Runtime MIT ("MIT License, Copyright (c) Microsoft Corporation"). ThirdPartyNotices.txt exists (about 335 KB) listing bundled third-party components; contents not reviewed (not verified).
- Rust `ort` crate: `license = "MIT OR Apache-2.0"` in Cargo.toml (GitHub shows Apache License 2.0 plus a separate LICENSE-MIT). Version seen is a release candidate, 2.0.0-rc.15.
- Weights: not applicable.
- Voices: not applicable.
- Phonemiser: not applicable.
- Training data: not applicable.

## Excerpts
> MIT License. Copyright (c) Microsoft Corporation (onnxruntime LICENSE)
> license = "MIT OR Apache-2.0" (ort Cargo.toml)

## Commercial hosted use and container redistribution
Both are permissive and fine for hosted commercial use and for bundling in images, provided the licence text and notices (including ONNX Runtime ThirdPartyNotices) are shipped. Risks: ort is still a 2.0 release candidate (API stability), and ort downloads prebuilt ONNX Runtime binaries by default, whose third-party notices and provenance should be recorded for the container. Execution providers such as CUDA or TensorRT pull NVIDIA runtime libraries under their own licences (not verified).
