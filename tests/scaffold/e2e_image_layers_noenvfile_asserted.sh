#!/usr/bin/env bash
# SC-15: no .env file exists in any layer of the gateway or console images, even when the
# build context contains one (.dockerignore keeps it out). Needs Docker and python3.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
created=()
for c in .env apps/console/.env.local; do
  if [[ ! -e "$c" ]]; then
    echo "YUYIN_SC15_CANARY=do-not-ship" >"$c"
    created+=("$c")
  fi
done
work="$(mktemp -d)"
cleanup() {
  for c in "${created[@]}"; do rm -f "$c"; done
  rm -rf "$work"
}
trap cleanup EXIT
build_gateway_image full yuyin-gateway:sc15-full
docker build --quiet -f deploy/docker/Dockerfile.console -t yuyin-console:sc15 . >/dev/null
for tag in yuyin-gateway:sc15-full yuyin-console:sc15; do
  if docker history --no-trunc --format '{{.CreatedBy}}' "$tag" | grep -qiE '(COPY|ADD)[^|]*\.env'; then
    echo "FAIL: $tag history copies a .env file"
    exit 1
  fi
  docker save "$tag" -o "$work/image.tar"
  python3 - "$work/image.tar" "$tag" <<'PY'
import io
import sys
import tarfile

outer = tarfile.open(sys.argv[1])
bad = []
for member in outer.getmembers():
    if not member.isfile():
        continue
    data = outer.extractfile(member).read()
    try:
        names = tarfile.open(fileobj=io.BytesIO(data)).getnames()
    except tarfile.TarError:
        continue  # a JSON config or manifest, not a layer
    for name in names:
        base = name.rsplit("/", 1)[-1]
        if base.startswith(".env") and not base.endswith(".example"):
            bad.append(name)
if bad:
    print(f"FAIL: {sys.argv[2]} contains {bad}")
    sys.exit(1)
PY
done
echo "ok: e2e_image_layers_noenvfile_asserted"
