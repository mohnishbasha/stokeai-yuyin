#!/usr/bin/env bash
# SC-09: extract-changelog.sh prints the [Unreleased] section, and only the section
# for the requested version when several exist.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
grep -q '^## \[Unreleased\]' CHANGELOG.md || { echo "FAIL: CHANGELOG.md has no [Unreleased] section"; exit 1; }
out="$(scripts/extract-changelog.sh Unreleased)"
[[ -n "$out" ]] || { echo "FAIL: [Unreleased] section is empty"; exit 1; }

dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
printf '# Changelog\n\n## [Unreleased]\n\n- next\n\n## [1.1.0] - 2026-01-02\n\n- one-one\n\n## [1.0.0] - 2026-01-01\n\n- one-zero\n' > "$dir/CHANGELOG.md"
got="$(cd "$dir" && "$ROOT/scripts/extract-changelog.sh" 1.1.0)"
grep -q 'one-one' <<<"$got" || { echo "FAIL: 1.1.0 section missing"; exit 1; }
if grep -q -e 'one-zero' -e 'next' <<<"$got"; then echo "FAIL: extracted text leaks other sections"; exit 1; fi
echo "ok: smoke_scripts_extract_changelog_unreleased_section_prints"
