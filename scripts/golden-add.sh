#!/usr/bin/env bash
# Adds a validated row to the normalisation golden corpus (S1-T01, TEST_PLAN section 5).
#
# Usage: scripts/golden-add.sh <file> <lang> <class> <name> <input> <expected> [notes]
#   file      golden file stem under crates/yuyin-text/golden/, for example money
#   lang      hi | hinglish | en-IN | en-US
#   class     row class, for example money, date, otp
#   name      id suffix; the id becomes golden_{lang}_{class}_{name}
#
# Example:
#   scripts/golden-add.sh money hi money paise "₹250.50" "दो सौ पचास रुपये पचास पैसे" "paise read"
#
# The row is appended only when every field is free of tabs and newlines, the id is new across
# the corpus, and the file exists with the standard header. Run `make golden` afterwards.
set -euo pipefail

usage() { sed -n '4,10p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2; }
die() { echo "golden-add.sh: $*" >&2; exit 1; }

[[ $# -ge 6 && $# -le 7 ]] || usage
file="$1" lang="$2" class="$3" name="$4" input="$5" expected="$6" notes="${7:-}"

root="$(cd "$(dirname "$0")/.." && pwd)"
dir="${GOLDEN_DIR:-$root/crates/yuyin-text/golden}"
path="$dir/$file.tsv"
header=$'id\tlang\tclass\tinput\texpected\tnotes'

case "$lang" in
  hi|hinglish|en-IN|en-US) ;;
  *) die "lang must be hi, hinglish, en-IN, or en-US (got '$lang')" ;;
esac
[[ "$file" =~ ^[a-z][a-z0-9_]*$ ]] || die "file must be a lowercase stem (got '$file')"
[[ "$class" =~ ^[a-z][a-z0-9]*$ ]] || die "class must be lowercase letters and digits (got '$class')"
[[ "$name" =~ ^[a-z0-9][a-z0-9_]*$ ]] || die "name must be lowercase snake_case (got '$name')"

for field in "$input" "$expected" "$notes"; do
  [[ "$field" != *$'\t'* && "$field" != *$'\n'* ]] || die "fields must not contain tabs or newlines"
done
[[ -n "$input" && -n "$expected" ]] || die "input and expected must not be empty"

[[ -f "$path" ]] || die "$path does not exist; create it with the header first"
[[ "$(head -n 1 "$path")" == "$header" ]] || die "$path does not start with the standard header"

id_lang="$(printf '%s' "$lang" | tr 'A-Z-' 'a-z_')"
id="golden_${id_lang}_${class}_${name}"
if cut -f1 "$dir"/*.tsv | grep -qx -- "$id"; then
  die "id $id already exists"
fi

# Make sure the file ends with a newline before appending.
[[ -z "$(tail -c 1 "$path")" ]] || printf '\n' >> "$path"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$id" "$lang" "$class" "$input" "$expected" "$notes" >> "$path"
echo "added $id to $file.tsv"
