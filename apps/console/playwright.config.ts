// Playwright harness for the console (S2-T09, TEST_PLAN 6.13). It serves the production build
// with `next start` against a real Postgres, seeds an organization, a user and a session with
// scripts/e2e-seed.ts, and drives Chromium. Snapshots are committed and are only valid for
// the Linux Playwright image; see scripts/e2e-docker.sh.
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${String(PORT)}`;
const DEFAULT_DATABASE_URL = "postgres://yuyin:yuyin-ci-only@localhost:5432/yuyin";
// A throwaway secret for the e2e server only; the session cookie is signed with it.
const E2E_SESSION_SECRET = "e2e-only-session-secret-0123456789abcdef";
const WEB_SERVER_TIMEOUT_MS = 120_000;
const PERF_SPEC = /pulseline-fps\.spec\.ts$/;
const IN_CI = process.env.CI !== undefined && process.env.CI !== "";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  // One path for every platform: the committed baselines come from the Linux image.
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: IN_CI,
  retries: IN_CI ? 1 : 0,
  workers: IN_CI ? 2 : "50%",
  reporter: IN_CI ? [["list"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL: BASE_URL,
    storageState: ".auth/state.json",
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", testIgnore: PERF_SPEC, use: { ...devices["Desktop Chrome"] } },
    // Frame-rate measurement (CN-80) runs alone, after the other specs finish: sharing the CPU
    // with parallel workers would measure the runner load, not the pulse line.
    {
      name: "perf",
      testMatch: PERF_SPEC,
      dependencies: ["chromium"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // The seed prints the operator user id, which the server reads as its allowlist.
    command: `sh -c 'OPERATOR_USER_IDS="$(bun scripts/e2e-seed.ts)" && export OPERATOR_USER_IDS && exec bun run start -p ${String(PORT)}'`,
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: false,
    timeout: WEB_SERVER_TIMEOUT_MS,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      SESSION_SECRET: E2E_SESSION_SECRET,
      YUYIN_E2E: "1",
      YUYIN_PREVIEW_ROUTES: "1",
      YUYIN_CONSOLE_URL: BASE_URL,
    },
  },
});
