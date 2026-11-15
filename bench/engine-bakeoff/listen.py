#!/usr/bin/env python3
"""Renders the S1-T10 listening sample: 20 utterances per language for every candidate voice.

Output (gitignored): <out>/<candidate>/<voice>/<lang>/NN.wav plus <out>/score-sheet.csv with one
row per utterance for a human listener (scores per docs/TEST_PLAN.md section 11). Audio is never
committed. `--fake` renders tones with the stdlib fake engine so the script can be checked
without model files.
"""

from __future__ import annotations

import argparse
import csv
import sys
import wave
from array import array
from pathlib import Path

from bakeoff import HERE, FakeTts, build_engine, load_candidates, plan

LANGS = ("hi", "en-IN", "en-US")


def write_wav(path: Path, samples, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = array("h", (max(-32768, min(32767, int(s * 32767))) for s in samples))
    if sys.byteorder == "big":
        pcm.byteswap()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.tobytes())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--candidates", type=Path, default=HERE / "candidates.json")
    ap.add_argument("--texts", type=Path, default=HERE / "texts")
    ap.add_argument("--models-dir", type=Path, default=HERE / "models")
    ap.add_argument("--out", type=Path, default=HERE / "out" / "listening")
    ap.add_argument("--only", default="", help="comma-separated candidate ids")
    ap.add_argument("--fake", action="store_true")
    args = ap.parse_args()

    texts = {}
    for lang in LANGS:
        lines = [x.strip() for x in (args.texts / f"listening-{lang}.txt").read_text(encoding="utf-8").splitlines()]
        texts[lang] = [x for x in lines if x]
        if len(texts[lang]) != 20:
            raise SystemExit(f"listening-{lang}.txt must have 20 utterances, found {len(texts[lang])}")

    only = set(args.only.split(",")) if args.only else None
    rows = []
    for cand, code, voices in plan(load_candidates(args.candidates), only, args.fake):
        tts = FakeTts() if args.fake else build_engine(cand, args.models_dir, code, 4)
        for v in voices:
            for lang in v["langs"]:
                for i, text in enumerate(texts[lang], start=1):
                    audio = tts.generate(text, sid=v["sid"], speed=1.0)
                    rel = Path(cand["id"]) / v["voice"] / lang / f"{i:02d}.wav"
                    write_wav(args.out / rel, audio.samples, audio.sample_rate)
                    rows.append(
                        {
                            "file": str(rel),
                            "candidate": cand["id"],
                            "voice": v["voice"],
                            "lang": lang,
                            "n": i,
                            "text": text,
                            "intelligibility_1_5": "",
                            "naturalness_1_5": "",
                            "defect": "",
                            "listener": "",
                        }
                    )
                print(f"rendered {cand['id']} {v['voice']} {lang}", file=sys.stderr, flush=True)
    args.out.mkdir(parents=True, exist_ok=True)
    with (args.out / "score-sheet.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["file"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} utterances and {args.out / 'score-sheet.csv'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
