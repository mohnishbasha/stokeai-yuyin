# Bake-off results

One directory per host label. Each holds `report.md` (table) and `results.json` (raw rows).

| Host | Status | Directory |
|---|---|---|
| ARM, 4 vCPU (Docker `linux/arm64`, `--cpus 4`, on a 10-core Apple silicon Mac) | Measured 2026-11-14, sherpa-onnx 1.13.8, 3 runs per row | `docker-arm64-4cpu/` |
| x86, 4 vCPU, native | NOT MEASURED. No x86 instance exists until owner item O4 (AWS account) is done. No number is given. | none |
| x86 under emulation | Not run and not reported. It would not be representative. | none |

Caveats for the ARM numbers:

- A container on a laptop is not a cloud ARM instance. Treat the numbers as comparative between candidates, not as capacity figures.
- The RTF spread between runs is large for several rows (see the spread column). The figures are medians of three runs.
- TTFA is time to the first audio callback for one segment of about 60 characters (59 characters measured). No candidate emitted audio before the segment finished, so TTFA is the whole segment time.
- Peak RSS is per process with one model loaded.
- The pending x86 measurement is required by the issue #23 acceptance criteria and is tracked in the PR description.
