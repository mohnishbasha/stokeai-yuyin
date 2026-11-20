// CN-45 perf_console_pulseline_mockstream_sustains60fps
// Measures the CPU cost of one frame (sample, push, draw) against a recording canvas context.
// Real frame pacing on a GPU is a manual check, see docs/TEST_PLAN.md CN-45.
import { describe, expect, it } from "vitest";
import {
  POINT_BUDGET,
  createMockAudioStream,
  createWaveform,
  drawWaveform,
  pushSample,
  type DrawContext,
  type Palette,
} from "../../src/lib/pulseline";

function recordingContext(): DrawContext & { calls: number } {
  const ctx = {
    calls: 0,
    strokeStyle: "",
    lineWidth: 1,
    clearRect() {
      ctx.calls += 1;
    },
    beginPath() {
      ctx.calls += 1;
    },
    moveTo() {
      ctx.calls += 1;
    },
    lineTo() {
      ctx.calls += 1;
    },
    stroke() {
      ctx.calls += 1;
    },
  };
  return ctx;
}

const FRAMES = 3600;

describe("PulseLine performance", () => {
  it("test_pulseline_mockstream_oneminuteofframes_p95underbudget", () => {
    const stream = createMockAudioStream();
    const wave = createWaveform();
    const buffer = wave.samples;
    const ctx = recordingContext();
    const palette: Palette = { line: "accent", width: 2 };
    const frameMs = 1000 / 60;
    const costs = new Float64Array(FRAMES);
    for (let i = 0; i < FRAMES; i += 1) {
      const start = performance.now();
      const t = i * frameMs;
      pushSample(wave, stream(t) * Math.sin(t * 0.05));
      drawWaveform(ctx, wave, 600, 32, palette);
      costs[i] = performance.now() - start;
    }
    const sorted = Array.from(costs).sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
    expect(p95).toBeLessThan(4);
    // The buffer is fixed: same object, same length.
    expect(wave.samples).toBe(buffer);
    expect(wave.samples.length).toBe(POINT_BUDGET);
    // One path per frame: clear, begin, move, a line per remaining point, stroke.
    expect(ctx.calls).toBe(FRAMES * (POINT_BUDGET + 3));
  });

  it("test_pulseline_mockstream_deterministicandbounded", () => {
    const a = createMockAudioStream();
    const b = createMockAudioStream();
    for (let t = 0; t < 10000; t += 37) {
      expect(a(t)).toBe(b(t));
      expect(a(t)).toBeGreaterThanOrEqual(0);
      expect(a(t)).toBeLessThanOrEqual(1);
    }
  });
});
