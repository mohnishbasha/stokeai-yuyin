---
name: run-bench
description: Run the benchmark harness against the local gateway with FakeEngine or the real engine.
---

# run-bench

## When to use

When measuring latency or capacity. Published numbers must come from a measured run and are never edited by hand.

## Status

The harness (`bench/loadgen`) arrives in Sprint 3 (S3-T13). Until then `run.sh` prints `run-bench: available from Sprint 3 (S3-T13)` and exits 0.

## Intended usage

```
YUYIN_BENCH_URL=http://localhost:8080 ENGINE=fake bash .agent/skills/run-bench/run.sh
YUYIN_BENCH_URL=http://localhost:8080 ENGINE=onnx bash .agent/skills/run-bench/run.sh
```

- `YUYIN_BENCH_URL`: base URL of the gateway under test. Defaults to the local dev gateway.
- `ENGINE`: `fake` uses `FakeEngine` (deterministic, no models needed, measures the gateway and not the model). `onnx` uses the real engine and needs models in `./models`.

## Exit codes

0 on success. Non-zero if the harness fails or the gateway is unreachable (once the harness exists).
