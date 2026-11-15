#!/usr/bin/env python3
"""Engine bake-off harness for S1-T10 (ADR-015).

Measures, per candidate voice and language:
  - load_s: time to construct the engine (model and voices loaded)
  - ttfa_s: time to first audio for a single 60-character segment (first callback)
  - segment_s: time to synthesise that whole segment
  - rtf: real-time factor, synthesis time divided by audio duration, over the RTF corpus
  - peak_rss_mib: peak resident memory of the measuring process

Each (candidate, language code, thread count) runs in a fresh child process so that load time
and peak memory belong to one model only.

The `--fake` flag swaps the engine for a deterministic stand-in that needs only the Python
standard library. It exists so CI can check that the harness runs and writes a report without
downloading model weights (test unit_bench_bakeoff_script_runsonfakeinput_producesreport).
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import math
import os
import platform
import resource
import statistics
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_VERSION = 1


# ---------------------------------------------------------------------------------------------
# Inputs


def read_tsv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def load_candidates(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["candidates"]


# ---------------------------------------------------------------------------------------------
# Engines


class FakeTts:
    """Deterministic stand-in: 24 kHz sine, 60 ms of audio per character, chunked output."""

    sample_rate = 24000

    def __init__(self, load_delay: float = 0.01, per_char_delay: float = 0.0002):
        time.sleep(load_delay)
        self.per_char_delay = per_char_delay
        self.num_speakers = 1

    def generate(self, text: str, sid: int = 0, speed: float = 1.0, callback=None):
        n = int(len(text) * 0.06 * self.sample_rate / max(speed, 0.1))
        chunk = 4800
        samples: list[float] = []
        for start in range(0, n, chunk):
            time.sleep(self.per_char_delay * len(text) * chunk / max(n, 1))
            part = [math.sin(2 * math.pi * 220 * i / self.sample_rate) * 0.1 for i in range(start, min(n, start + chunk))]
            samples.extend(part)
            if callback is not None and callback(part, min(1.0, (start + chunk) / max(n, 1))) == 0:
                break
        return _Audio(samples, self.sample_rate)


class _Audio:
    def __init__(self, samples, sample_rate):
        self.samples = samples
        self.sample_rate = sample_rate


def build_engine(cand: dict, models_dir: Path, lang_code: str | None, threads: int):
    """Constructs a sherpa-onnx OfflineTts for the candidate. Imported lazily."""
    import sherpa_onnx as so  # noqa: PLC0415

    base = models_dir / cand["dir"]
    f = cand["files"]
    p = lambda k: str((base / f[k]).resolve()) if f.get(k) else ""  # noqa: E731
    kind = cand["kind"]
    if kind == "kokoro":
        model = so.OfflineTtsModelConfig(
            kokoro=so.OfflineTtsKokoroModelConfig(
                model=p("model"),
                voices=p("voices"),
                tokens=p("tokens"),
                lexicon=p("lexicon"),
                data_dir=p("data_dir"),
                lang=lang_code or "",
            ),
            num_threads=threads,
            provider="cpu",
        )
    elif kind == "vits":
        model = so.OfflineTtsModelConfig(
            vits=so.OfflineTtsVitsModelConfig(model=p("model"), tokens=p("tokens"), data_dir=p("data_dir")),
            num_threads=threads,
            provider="cpu",
        )
    elif kind == "matcha":
        model = so.OfflineTtsModelConfig(
            matcha=so.OfflineTtsMatchaModelConfig(
                acoustic_model=p("acoustic_model"),
                vocoder=p("vocoder"),
                tokens=p("tokens"),
                data_dir=p("data_dir"),
            ),
            num_threads=threads,
            provider="cpu",
        )
    else:
        raise SystemExit(f"unknown candidate kind {kind}")
    cfg = so.OfflineTtsConfig(model=model, max_num_sentences=1)
    if not cfg.validate():
        raise SystemExit(f"invalid sherpa-onnx config for {cand['id']}")
    return so.OfflineTts(cfg)


# ---------------------------------------------------------------------------------------------
# Measurement (child process)


def peak_rss_mib() -> float:
    ru = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # Linux reports KiB, macOS reports bytes.
    return ru / (1024 * 1024) if sys.platform == "darwin" else ru / 1024


def measure(spec: dict) -> dict:
    rss_before = peak_rss_mib()
    t0 = time.perf_counter()
    if spec["fake"]:
        tts = FakeTts()
    else:
        tts = build_engine(spec["candidate"], Path(spec["models_dir"]), spec["lang_code"], spec["threads"])
    load_s = time.perf_counter() - t0
    sr = tts.sample_rate

    results = []
    for v in spec["voices"]:
        sid = v["sid"]
        tts.generate("Warm up.", sid=sid, speed=1.0)  # excluded from timings
        for lang in v["langs"]:
            seg = spec["segments"][lang]
            ttfas, segs = [], []
            for _ in range(spec["runs"]):
                first: list[float] = []
                start = time.perf_counter()

                def cb(_samples, _progress, first=first, start=start):
                    if not first:
                        first.append(time.perf_counter() - start)
                    return 1

                audio = tts.generate(seg, sid=sid, speed=1.0, callback=cb)
                total = time.perf_counter() - start
                segs.append(total)
                ttfas.append(first[0] if first else total)
            seg_audio_s = len(audio.samples) / sr

            synth, dur = [], []
            for _ in range(spec["runs"]):
                s_total, d_total = 0.0, 0.0
                for text in spec["rtf_corpus"][lang]:
                    start = time.perf_counter()
                    a = tts.generate(text, sid=sid, speed=1.0)
                    s_total += time.perf_counter() - start
                    d_total += len(a.samples) / sr
                synth.append(s_total)
                dur.append(d_total)
            rtfs = [s / d for s, d in zip(synth, dur) if d > 0]
            results.append(
                {
                    "candidate": spec["candidate"]["id"],
                    "family": spec["candidate"]["family"],
                    "voice": v["voice"],
                    "lang": lang,
                    "lang_code": spec["lang_code"],
                    "threads": spec["threads"],
                    "sample_rate": sr,
                    "load_s": round(load_s, 4),
                    "ttfa_s_median": round(statistics.median(ttfas), 4),
                    "segment_s_median": round(statistics.median(segs), 4),
                    "segment_chars": len(seg),
                    "segment_audio_s": round(seg_audio_s, 3),
                    "first_audio_before_segment_end": statistics.median(ttfas) < 0.9 * statistics.median(segs),
                    "rtf_median": round(statistics.median(rtfs), 4) if rtfs else None,
                    "rtf_spread_pct": round(100 * (max(rtfs) - min(rtfs)) / statistics.median(rtfs), 1) if rtfs else None,
                    "rtf_audio_s": round(statistics.median(dur), 2),
                    "runs": spec["runs"],
                }
            )
    peak = peak_rss_mib()
    for r in results:
        r["peak_rss_mib"] = round(peak, 1)
        r["baseline_rss_mib"] = round(rss_before, 1)
    return {"rows": results}


# ---------------------------------------------------------------------------------------------
# Orchestration (parent process)


def cgroup_cpus() -> str:
    try:
        quota, period = Path("/sys/fs/cgroup/cpu.max").read_text().split()
        return "unlimited" if quota == "max" else f"{int(quota) / int(period):g}"
    except (OSError, ValueError):
        return "unknown"


def host_info(label: str, fake: bool) -> dict:
    info = {
        "label": label,
        "date_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "machine": platform.machine(),
        "system": platform.system(),
        "python": platform.python_version(),
        "os_cpu_count": os.cpu_count(),
        "cgroup_cpu_limit": cgroup_cpus(),
        "engine": "fake" if fake else "sherpa-onnx",
    }
    if not fake:
        import sherpa_onnx  # noqa: PLC0415

        info["sherpa_onnx"] = getattr(sherpa_onnx, "__version__", "unknown")
    return info


def plan(
    candidates: list[dict], only: set[str] | None, fake: bool, bench: bool = False
) -> list[tuple[dict, str | None, list[dict]]]:
    """Groups voices by the lang_code the engine must be built with. With `bench`, voices marked
    `"bench": false` (listening only) are skipped."""
    jobs = []
    for c in candidates:
        if only and c["id"] not in only:
            continue
        groups: dict[str | None, list[dict]] = {}
        for v in c["voices"]:
            if bench and v.get("bench", True) is False:
                continue
            for lang in v["langs"]:
                code = None if fake else v.get("lang_code", {}).get(lang)
                g = groups.setdefault(code, [])
                existing = next((x for x in g if x["voice"] == v["voice"]), None)
                if existing:
                    existing["langs"].append(lang)
                else:
                    g.append({"voice": v["voice"], "sid": v["sid"], "langs": [lang]})
        for code, voices in groups.items():
            jobs.append((c, code, voices))
    return jobs


def write_report(out: Path, host: dict, rows: list[dict], errors: list[dict]) -> None:
    out.mkdir(parents=True, exist_ok=True)
    data = {"schema_version": SCHEMA_VERSION, "host": host, "rows": rows, "errors": errors}
    (out / "results.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        f"# Engine bake-off results: {host['label']}",
        "",
        f"- Date (UTC): {host['date_utc']}",
        f"- Machine: {host['machine']} ({host['system']}), cgroup CPU limit {host['cgroup_cpu_limit']}, "
        f"os.cpu_count {host['os_cpu_count']}",
        f"- Engine runtime: {host['engine']} {host.get('sherpa_onnx', '')}".rstrip(),
        "- RTF is synthesis time divided by audio duration (lower is better). TTFA is time to the first "
        "audio callback for one segment of about 60 characters. Peak RSS is per process, one model loaded.",
        "",
        "| Candidate | Voice | Lang | Threads | Load s | TTFA ms | RTF | RTF spread % | Peak RSS MiB | Chunked inside segment |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in sorted(rows, key=lambda r: (r["candidate"], r["voice"], r["lang"], r["threads"])):
        lines.append(
            f"| {r['candidate']} | {r['voice']} | {r['lang']} | {r['threads']} | {r['load_s']:.2f} | "
            f"{r['ttfa_s_median'] * 1000:.0f} | {r['rtf_median']} | {r['rtf_spread_pct']} | "
            f"{r['peak_rss_mib']:.0f} | {'yes' if r['first_audio_before_segment_end'] else 'no'} |"
        )
    if errors:
        lines += ["", "## Errors", ""] + [f"- {e['candidate']} ({e['lang_code']}): {e['error']}" for e in errors]
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def cmd_bench(args: argparse.Namespace) -> int:
    candidates = load_candidates(args.candidates)
    segments = {r["lang"]: r["text"] for r in read_tsv(args.texts / "segments-60.tsv")}
    corpus: dict[str, list[str]] = {}
    for r in read_tsv(args.texts / "rtf-corpus.tsv"):
        corpus.setdefault(r["lang"], []).append(r["text"])
    only = set(args.only.split(",")) if args.only else None
    threads = [int(t) for t in args.threads.split(",")]
    host = host_info(args.label, args.fake)

    rows, errors = [], []
    for cand, code, voices in plan(candidates, only, args.fake, bench=True):
        for t in threads:
            spec = {
                "candidate": cand,
                "lang_code": code,
                "voices": voices,
                "threads": t,
                "runs": args.runs,
                "fake": args.fake,
                "models_dir": str(args.models_dir),
                "segments": segments,
                "rtf_corpus": corpus,
            }
            print(f"measuring {cand['id']} lang_code={code} threads={t}", file=sys.stderr, flush=True)
            proc = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()), "_measure"],
                input=json.dumps(spec),
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                errors.append({"candidate": cand["id"], "lang_code": code, "error": proc.stderr.strip()[-500:]})
                print(proc.stderr, file=sys.stderr)
                continue
            rows.extend(json.loads(proc.stdout.strip().splitlines()[-1])["rows"])
    write_report(args.out, host, rows, errors)
    print(f"wrote {args.out / 'report.md'} ({len(rows)} rows, {len(errors)} errors)")
    return 1 if errors and not rows else 0


def cmd_measure(_args: argparse.Namespace) -> int:
    spec = json.loads(sys.stdin.read())
    print(json.dumps(measure(spec)))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bench", help="run the measurements and write results.json and report.md")
    b.add_argument("--candidates", type=Path, default=HERE / "candidates.json")
    b.add_argument("--texts", type=Path, default=HERE / "texts")
    b.add_argument("--models-dir", type=Path, default=HERE / "models")
    b.add_argument("--out", type=Path, default=HERE / "out" / "bench")
    b.add_argument("--label", default="local")
    b.add_argument("--threads", default="1,4", help="comma-separated ONNX intra-op thread counts")
    b.add_argument("--runs", type=int, default=3)
    b.add_argument("--only", default="", help="comma-separated candidate ids")
    b.add_argument("--fake", action="store_true", help="use the stdlib fake engine (no models needed)")
    b.set_defaults(func=cmd_bench)
    m = sub.add_parser("_measure", help=argparse.SUPPRESS)
    m.set_defaults(func=cmd_measure)
    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
