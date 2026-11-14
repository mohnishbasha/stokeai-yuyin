#!/usr/bin/env bash
# SC-32: no model weight files are tracked in git.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
bad="$(git ls-files | grep -iE '\.(onnx|pt|pth|safetensors|ckpt|gguf|bin)$' || true)"
[[ -z "$bad" ]] || { echo "FAIL: tracked weight-like files: $bad"; exit 1; }
echo "ok: smoke_legal_no_model_weights_tracked"
