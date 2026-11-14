#!/usr/bin/env bash
# SC-13: the gateway image carries the OCI labels, and version, revision, and source match
# VERSION, the git commit, and the SOURCE build argument. Needs Docker.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
label() { docker inspect -f "{{ index .Config.Labels \"org.opencontainers.image.$2\" }}" "$1"; }
expect() { [[ "$2" == "$3" ]] || { echo "FAIL: $1 is '$2', want '$3'"; exit 1; }; }
for target in slim full; do
  tag="yuyin-gateway:sc13-$target"
  build_gateway_image "$target" "$tag"
  expect "$target version" "$(label "$tag" version)" "$(tr -d '[:space:]' <VERSION)"
  expect "$target revision" "$(label "$tag" revision)" "$(git rev-parse HEAD)"
  expect "$target source" "$(label "$tag" source)" "https://github.com/mohnishbasha/stokeai-yuyin"
  expect "$target licenses" "$(label "$tag" licenses)" "LicenseRef-Proprietary"
  created="$(label "$tag" created)"
  [[ "$created" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || { echo "FAIL: $target created is '$created'"; exit 1; }
done
# The source label follows the build argument (ADR-016), not a hard-coded URL.
SOURCE=https://example.invalid/fork/yuyin build_gateway_image slim yuyin-gateway:sc13-fork
expect "fork source" "$(label yuyin-gateway:sc13-fork source)" "https://example.invalid/fork/yuyin"
echo "ok: e2e_image_gateway_labels_versionandcommit_present"
