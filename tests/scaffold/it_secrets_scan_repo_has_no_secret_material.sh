#!/usr/bin/env bash
# AK-23: the repository holds no secret material. gitleaks (repo config) finds nothing in the
# full history, and no environment file (other than *.example) or model weight file is tracked.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
gitleaks git --no-banner --log-level error --redact --config .gitleaks.toml . >/dev/null \
  || { echo "FAIL: gitleaks found secrets in the history"; exit 1; }
envs="$(git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -vE '\.example$' || true)"
[[ -z "$envs" ]] || { echo "FAIL: tracked env files: $envs"; exit 1; }
weights="$(git ls-files | grep -E '\.(onnx|safetensors|gguf|pt|ckpt)$' || true)"
[[ -z "$weights" ]] || { echo "FAIL: tracked model weights: $weights"; exit 1; }
echo "ok: it_secrets_scan_repo_has_no_secret_material"
