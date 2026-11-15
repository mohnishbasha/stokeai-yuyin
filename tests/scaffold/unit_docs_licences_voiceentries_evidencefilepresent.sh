#!/usr/bin/env bash
# EN-29: every voice in the ADR-015 voice licence register has a licence evidence file in
# docs/licences/ that exists, names the voice, and records a retrieval date; every voice the
# bake-off harness renders is in the register.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
adr=docs/adr/ADR-015-engine-selection.md
[[ -f "$adr" ]] || { echo "FAIL: $adr missing"; exit 1; }
python3 - "$adr" bench/engine-bakeoff/candidates.json <<'PY'
import json, re, sys
from pathlib import Path
adr = Path(sys.argv[1]).read_text(encoding="utf-8")
m = re.search(r"^## Voice licence register\n(.*?)(?=^## |\Z)", adr, re.S | re.M)
assert m, "ADR-015 has no '## Voice licence register' section"
rows = [l for l in m.group(1).splitlines() if l.startswith("| ") and not l.startswith("| Voice") and not l.startswith("|---")]
assert rows, "voice licence register is empty"
voices = set()
for row in rows:
    cells = [c.strip() for c in row.strip("|").split("|")]
    voice = cells[0].strip("`")
    links = re.findall(r"docs/licences/[A-Za-z0-9_.-]+\.md", row)
    assert links, f"voice {voice}: no docs/licences/*.md evidence link"
    for link in links:
        p = Path(link)
        assert p.is_file(), f"voice {voice}: evidence file {link} does not exist"
        text = p.read_text(encoding="utf-8")
        assert voice in text, f"voice {voice}: not named in {link}"
        assert re.search(r"^Retrieved: \d{4}-\d{2}-\d{2}", text, re.M), f"{link}: no 'Retrieved: YYYY-MM-DD' line"
    voices.add(voice)
cands = json.load(open(sys.argv[2]))["candidates"]
for c in cands:
    for v in c["voices"]:
        assert v["voice"] in voices, f"bake-off voice {v['voice']} ({c['id']}) is not in the ADR-015 register"
PY
echo "ok: unit_docs_licences_voiceentries_evidencefilepresent"
