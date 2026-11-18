// Pulse line frame rate (S2-T03, CN-80).
// Scenario: e2e_pulseline_streaming_cputhrottle4x_sustains60fps.
// What this measures: the real requestAnimationFrame cadence of headless Chromium while the
// pulse line streams the mock audio stream, plus the page's scripting time per frame from the
// CDP Performance domain. It is not a physical mid-range laptop. To approximate one, the CPU
// is throttled 4x with Emulation.setCPUThrottlingRate (a CI runner core is roughly 3 to 5
// times faster than a mid-range laptop core under sustained load), so a pass means the line
// holds 60 fps with 4x headroom. The numbers are printed so they are recorded in the CI log.
import { ANONYMOUS_STATE, expect, settle, test } from "./fixtures";

const PATH = "/preview/components/pulse-line";
const CPU_THROTTLE_RATE = 4;
const WARMUP_MS = 1000;
const SAMPLE_MS = 3000;
const MIN_MEDIAN_FPS = 58;
const MAX_P95_INTERVAL_MS = 20;
const MAX_SCRIPT_MS_PER_FRAME = 8;

test.use({ storageState: ANONYMOUS_STATE, reducedMotion: "no-preference" });

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
}

test("e2e_pulseline_streaming_cputhrottle4x_sustains60fps", async ({ page, context }) => {
  await page.goto(PATH);
  await settle(page);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE_RATE });
  await cdp.send("Performance.enable");

  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(WARMUP_MS);

  const scriptBefore = await scriptSeconds(cdp);
  const intervals: number[] = await page.evaluate(
    (ms) =>
      new Promise<number[]>((resolve) => {
        const out: number[] = [];
        let prev = 0;
        const begin = performance.now();
        const tick = (now: number) => {
          if (prev !== 0) out.push(now - prev);
          prev = now;
          if (now - begin < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    SAMPLE_MS,
  );
  const scriptMsPerFrame = (((await scriptSeconds(cdp)) - scriptBefore) * 1000) / intervals.length;

  const sorted = [...intervals].sort((a, b) => a - b);
  const medianFps = 1000 / percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const summary =
    `pulseline-fps: throttle=${String(CPU_THROTTLE_RATE)}x frames=${String(intervals.length)} ` +
    `median_fps=${medianFps.toFixed(1)} p95_interval_ms=${p95.toFixed(1)} ` +
    `max_interval_ms=${percentile(sorted, 1).toFixed(1)} ` +
    `script_ms_per_frame=${scriptMsPerFrame.toFixed(2)}`;
  process.stdout.write(`${summary}\n`);
  test.info().annotations.push({ type: "measured", description: summary });

  expect(intervals.length).toBeGreaterThan(100);
  expect(medianFps).toBeGreaterThanOrEqual(MIN_MEDIAN_FPS);
  expect(p95).toBeLessThanOrEqual(MAX_P95_INTERVAL_MS);
  expect(scriptMsPerFrame).toBeLessThanOrEqual(MAX_SCRIPT_MS_PER_FRAME);
});

async function scriptSeconds(cdp: {
  send(m: "Performance.getMetrics"): Promise<{ metrics: { name: string; value: number }[] }>;
}): Promise<number> {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "ScriptDuration")?.value ?? 0;
}
