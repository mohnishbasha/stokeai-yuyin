#!/usr/bin/env bash
# EN-28: the S1-T10 bake-off harness runs on fake input (no model files, stdlib only) and writes
# results.json and report.md covering every candidate voice and language; the listening renderer
# writes 20 WAV files per language and a score sheet.
source "$(dirname "$0")/lib.sh"
cd "$ROOT/bench/engine-bakeoff"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
python3 bakeoff.py bench --fake --runs 1 --threads 1 --out "$out/bench" >/dev/null 2>&1 \
  || { echo "FAIL: bakeoff.py bench --fake exited non-zero"; exit 1; }
[[ -s "$out/bench/report.md" ]] || { echo "FAIL: report.md not written"; exit 1; }
grep -q '^| Candidate | Voice | Lang | Threads | Load s | TTFA ms | RTF ' "$out/bench/report.md" \
  || { echo "FAIL: report.md has no results table"; exit 1; }
python3 - "$out/bench/results.json" candidates.json <<'PY' || exit 1
import json, sys
res = json.load(open(sys.argv[1]))
cands = json.load(open(sys.argv[2]))["candidates"]
assert res["host"]["engine"] == "fake", "engine is not fake"
assert not res["errors"], f"errors: {res['errors']}"
got = {(r["candidate"], r["voice"], r["lang"]) for r in res["rows"]}
want = {(c["id"], v["voice"], l) for c in cands for v in c["voices"] if v.get("bench", True) for l in v["langs"]}
missing = want - got
assert not missing, f"missing rows: {sorted(missing)}"
for r in res["rows"]:
    for k in ("load_s", "ttfa_s_median", "rtf_median", "peak_rss_mib"):
        assert isinstance(r[k], (int, float)) and r[k] >= 0, f"bad {k} in {r}"
PY
for lang in hi en-IN en-US; do
  n="$(grep -c . "texts/listening-$lang.txt")"
  [[ "$n" -eq 20 ]] || { echo "FAIL: texts/listening-$lang.txt has $n utterances, want 20"; exit 1; }
done
python3 listen.py --fake --only kokoro-v1.0-int8 --out "$out/listen" >/dev/null 2>&1 \
  || { echo "FAIL: listen.py --fake exited non-zero"; exit 1; }
for lang in hi en-IN en-US; do
  n="$(find "$out/listen" -path "*/$lang/*.wav" | wc -l | tr -d ' ')"
  [[ "$n" -eq 20 ]] || { echo "FAIL: $n WAV files for $lang, want 20"; exit 1; }
done
[[ "$(wc -l <"$out/listen/score-sheet.csv" | tr -d ' ')" -eq 61 ]] \
  || { echo "FAIL: score sheet does not have 60 utterance rows"; exit 1; }
echo "ok: unit_bench_bakeoff_script_runsonfakeinput_producesreport"
