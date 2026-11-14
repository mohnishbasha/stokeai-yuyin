#!/usr/bin/env bash
# SC-35: README links the owner checklist and the five spec docs, every relative Markdown
# link in README resolves, and the checklist names every owner action S0-T11 lists.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
for doc in docs/OWNER_CHECKLIST.md docs/PRD.md docs/ARCHITECTURE.md docs/DESIGN.md docs/SPRINT_PLAN.md docs/TEST_PLAN.md; do
  grep -q "]($doc)" README.md || { echo "FAIL: README does not link $doc"; exit 1; }
done
for link in $(grep -oE '\]\([^)#:]+\)' README.md | sed -E 's/^\]\((.*)\)$/\1/'); do
  [[ -e "$link" ]] || { echo "FAIL: README link $link does not resolve"; exit 1; }
done
for item in 'yuyin.openstoke.com' 'STOKE_KUBECONFIG' 'Stripe account' 'npm' 'PyPI' 'GHCR' 'Pricing decision' \
  'Voice name approval' 'Attorney review' 'YUYIN_LICENCE_SIGNING_KEY' 'AWS' 'Clerk' 'NileDB' 'Vercel' 'trademark'; do
  grep -q "$item" docs/OWNER_CHECKLIST.md || { echo "FAIL: OWNER_CHECKLIST.md does not mention $item"; exit 1; }
done
echo "ok: unit_docs_ownerchecklist_linkedfromreadme_linkresolves"
