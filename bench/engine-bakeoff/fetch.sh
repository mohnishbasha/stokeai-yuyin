#!/usr/bin/env bash
# Downloads the bake-off model files from the sherpa-onnx release pages into models/ (gitignored)
# and checks them against models.sha256 when that file lists them. Never commit model weights.
# Usage: bench/engine-bakeoff/fetch.sh [model-dir-name ...]
set -euo pipefail
cd "$(dirname "$0")"
BASE="https://github.com/k2-fsa/sherpa-onnx/releases/download"
DEFAULT=(
  kokoro-multi-lang-v1_0
  kokoro-int8-multi-lang-v1_0
  vits-piper-hi_IN-rohan-medium
  vits-piper-hi_IN-pratham-medium
  vits-piper-hi_IN-priyamvada-medium
  vits-piper-en_US-lessac-medium
  vits-piper-en_US-ljspeech-medium
  matcha-icefall-en_US-ljspeech
)
names=("$@")
[[ ${#names[@]} -gt 0 ]] || names=("${DEFAULT[@]}")
mkdir -p models
for n in "${names[@]}"; do
  if [[ -d "models/$n" ]]; then
    echo "have $n"
    continue
  fi
  echo "fetching $n"
  curl -fsSL "$BASE/tts-models/$n.tar.bz2" | tar -xjf - -C models
done
[[ -f models/vocos-22khz-univ.onnx ]] || curl -fsSL -o models/vocos-22khz-univ.onnx "$BASE/vocoder-models/vocos-22khz-univ.onnx"

# Verify the files the engine loads. models.sha256 is committed; a missing entry is reported,
# a mismatch fails.
cd models
status=0
while read -r sum path; do
  [[ -z "$sum" || "$sum" == \#* ]] && continue
  if [[ ! -f "$path" ]]; then
    echo "not downloaded: $path"
    continue
  fi
  actual="$( (sha256sum "$path" 2>/dev/null || shasum -a 256 "$path") | awk '{print $1}')"
  if [[ "$actual" != "$sum" ]]; then
    echo "CHECKSUM MISMATCH: $path"
    status=1
  fi
done <../models.sha256
[[ $status -eq 0 ]] && echo "checksums ok"
exit $status
