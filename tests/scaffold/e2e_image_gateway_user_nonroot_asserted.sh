#!/usr/bin/env bash
# SC-14: the gateway images are configured for a numeric non-root user, and the running
# container process is not uid 0. Needs Docker.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
for target in slim full; do
  tag="yuyin-gateway:sc14-$target"
  build_gateway_image "$target" "$tag"
  user="$(docker inspect -f '{{.Config.User}}' "$tag")"
  uid="${user%%:*}"
  [[ "$uid" =~ ^[0-9]+$ && "$uid" -ne 0 ]] || { echo "FAIL: $target image user is '$user'"; exit 1; }
done
name="yuyin-sc14-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" yuyin-gateway:sc14-full >/dev/null
# The image has no shell, so ask the daemon for the process list.
uid="$(docker top "$name" -eo pid,uid | awk 'NR==2 {print $2}')"
[[ -n "$uid" && "$uid" != "0" && "$uid" != "root" ]] || { echo "FAIL: container process uid is '$uid'"; exit 1; }
echo "ok: e2e_image_gateway_user_nonroot_asserted"
