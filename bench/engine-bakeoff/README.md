# Engine bake-off (S1-T10, ADR-015)

This harness measures open-weights CPU TTS candidates and renders a listening sample for each one. The decision it feeds is recorded in [ADR-015](../../docs/adr/ADR-015-engine-selection.md). Licence evidence lives in [docs/licences/](../../docs/licences/). The harness is a spike tool: it is not shipped and is not part of the gateway build.

## What is measured

The bake-off measures each candidate voice and language as follows. Every (candidate, language code, thread count) runs in its own process.

| Metric | Definition |
|---|---|
| Load s | Time to construct the engine: the model, voices, and phonemiser data are loaded. |
| TTFA ms | Time to first audio for one segment of about 60 characters (`texts/segments-60.tsv`). This is the time from the `generate` call to the first audio callback, measured warm (one warm-up call first). The median over `--runs` is reported. |
| RTF | Real-time factor: synthesis time divided by audio duration, over `texts/rtf-corpus.tsv` (three sentences per language). The median over `--runs` is reported, with the spread between runs. |
| Peak RSS MiB | Peak resident memory of the measuring process (`ru_maxrss`), with one model loaded. |
| Chunked inside segment | `yes` if the first audio callback arrives clearly before the segment finishes (TTFA below 90% of segment time). |

ONNX intra-op threads are set by `--threads` (default `1,4`). One thread matches NFR-002, which sets RTF per core. Four threads show the single-stream latency on a 4 vCPU node.

## Runtime

The candidates run through the `sherpa-onnx` Python package, pinned in `pyproject.toml` and `uv.lock`. Version 1.13.8 is used because it is the last release that still contains the espeak-ng frontend that the Hindi and Piper voices need. That frontend is GPL-3.0, and ADR-015 explains why the shipped engine must not link it. These measurements are for comparison only.

## Run it

You need Docker and about 1.2 GB of free disk for the model files.

```bash
bench/engine-bakeoff/fetch.sh                  # downloads into models/ (gitignored), checks models.sha256
bench/engine-bakeoff/run-docker.sh arm64       # linux/arm64 container, --cpus 4, writes out/bench-arm64/
bench/engine-bakeoff/run-docker.sh amd64       # linux/amd64; under emulation on an arm64 host (see below)
bench/engine-bakeoff/run-docker.sh arm64-listen  # renders the listening sample to out/listening/
```

Pass extra arguments through to the harness, for example `run-docker.sh arm64 --only kokoro-v1.0-fp32 --runs 5`.

To run without Docker, use `uv run --project bench/engine-bakeoff python bench/engine-bakeoff/bakeoff.py bench`.

Fake mode needs only the Python standard library and no model files. CI runs it through `tests/scaffold/unit_bench_bakeoff_script_runsonfakeinput_producesreport.sh`:

```bash
python3 bench/engine-bakeoff/bakeoff.py bench --fake --runs 1 --threads 1
python3 bench/engine-bakeoff/listen.py --fake
```

## Listening sample

The listening sample has 20 utterances per language:

- `texts/listening-hi.txt` (Hindi in Devanagari)
- `texts/listening-en-IN.txt` (Indian English)
- `texts/listening-en-US.txt` (US English)

Each list covers money, dates and times, OTP and phone readings, names and places, and everyday service sentences. Numbers are already written out as words, because normalisation belongs to `yuyin-text` and not to the engine.

No candidate has an Indian English voice. The en-IN list is therefore rendered with each candidate's Hindi voices reading English text.

`listen.py` writes `out/listening/<candidate>/<voice>/<lang>/NN.wav` and `out/listening/score-sheet.csv`. Score each row 1 to 5 for intelligibility and for naturalness, as in docs/TEST_PLAN.md section 11. Audio is never committed, because the repository is public and the weights' outputs are not ours to publish without review.

## Hosts

| Host | Status |
|---|---|
| ARM, 4 vCPU | Measured in a `linux/arm64` Docker container with `--cpus 4 --memory 6g` on an Apple silicon Mac (10 cores). These numbers are representative of an ARM node only in shape. A container on a laptop is not a cloud instance. |
| x86, 4 vCPU, native | Pending. No x86 cloud instance is available until owner item O4 (AWS account) is done. |
| x86 under emulation | Any `amd64` number from this host runs under emulation. It shows only that the harness works on x86 and is not representative of x86 performance. |

Committed results are in `results/`, one directory per host label.

## Files

| File | Purpose |
|---|---|
| `bakeoff.py` | The measurement harness. `bench` runs it and `--fake` runs it without models. |
| `listen.py` | Renders the listening sample and the score sheet. |
| `candidates.json` | Candidates, model files, voices, and speaker ids. Voices with `"bench": false` are rendered for listening only. |
| `fetch.sh` | Downloads the model files from the sherpa-onnx release pages and verifies `models.sha256`. |
| `run-docker.sh` | Runs the harness in a container limited to 4 CPUs. |
| `texts/` | The 60-character segments, the RTF corpus, and the listening lists. |
| `results/` | Committed result files (`results.json`, `report.md`) per host. |
