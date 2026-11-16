// CN-57 unit_console_mockdata_layer_implementsinterfaces
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getConsoleData, loadScreen } from "../../src/lib/data";
import { buildMockKey, createMockData, MOCK_ERROR_CODE } from "../../src/lib/data/mock";
import { DataError, type ConsoleData } from "../../src/lib/data/types";
import { CONSOLE_SCREENS, SCREEN_STATES } from "../../src/lib/screens";

describe("mock data layer", () => {
  it("test_mockdata_layer_implementsconsoledata", () => {
    // The annotation is the check: the mock must satisfy the interface the real layer will.
    const layer: ConsoleData = createMockData("default", "keys");
    expect(Object.keys(layer).sort()).toEqual(
      [
        "billing",
        "keys",
        "lexicon",
        "onboarding",
        "playground",
        "settings",
        "team",
        "usage",
        "viewer",
        "voices",
      ].sort(),
    );
  });

  it("test_mockdata_default_returnsrows", async () => {
    const layer = getConsoleData("default", "keys");
    expect((await layer.keys.list()).length).toBeGreaterThan(0);
    expect((await layer.voices.list()).length).toBeGreaterThan(0);
    expect((await layer.team.list()).length).toBeGreaterThan(1);
  });

  it("test_mockdata_empty_returnsnorows", async () => {
    const layer = getConsoleData("empty", "keys");
    expect(await layer.keys.list()).toEqual([]);
    expect((await layer.usage.summary()).series["30d"]).toEqual([]);
    expect((await layer.billing.overview()).ledger).toEqual([]);
    expect((await layer.lexicon.overview()).entries).toEqual([]);
    expect(await layer.voices.custom()).toEqual([]);
    expect(await layer.team.list()).toHaveLength(1);
  });

  it("test_mockdata_error_throwsdataerrorwithcodeandtrace", async () => {
    const layer = getConsoleData("error", "keys");
    const failure = await layer.keys.list().catch((caught: unknown) => caught);
    expect(failure).toBeInstanceOf(DataError);
    expect((failure as DataError).code).toBe(MOCK_ERROR_CODE);
    expect((failure as DataError).traceId).toMatch(/^tr_/);
  });

  it("test_mockdata_loadscreen_mapsstatestoresults", async () => {
    const layer = getConsoleData("default", "keys");
    expect((await loadScreen("loading", layer, (d) => d.keys.list())).status).toBe("loading");
    expect((await loadScreen("default", layer, (d) => d.keys.list())).status).toBe("ok");
    const failing = getConsoleData("error", "keys");
    expect(await loadScreen("error", failing, (d) => d.keys.list())).toEqual({
      status: "error",
      code: MOCK_ERROR_CODE,
      traceId: expect.stringMatching(/^tr_/) as unknown,
    });
  });

  it("test_mockdata_forbidden_usesaroleoutsidethepermission", async () => {
    expect((await getConsoleData("forbidden", "keys").viewer.get()).canManageKeys).toBe(false);
    expect((await getConsoleData("forbidden", "billing").viewer.get()).canTopUp).toBe(false);
    expect((await getConsoleData("forbidden", "team").viewer.get()).canManageMembers).toBe(false);
    expect((await getConsoleData("forbidden", "lexicon").viewer.get()).canManageLexicon).toBe(
      false,
    );
    expect((await getConsoleData("default", "keys").viewer.get()).canManageKeys).toBe(true);
  });

  it("test_mockdata_money_isintegermicrousd", async () => {
    const billing = await getConsoleData("default", "billing").billing.overview();
    const amounts = [
      billing.balanceMicroUsd,
      billing.capacityMicroUsd,
      billing.lowThresholdMicroUsd,
      billing.minTopUpMicroUsd,
      ...billing.topUpPresetsMicroUsd,
      ...billing.ledger.flatMap((row) => [row.amountMicroUsd, row.balanceMicroUsd]),
      ...billing.invoices.map((row) => row.amountMicroUsd),
    ];
    for (const amount of amounts) expect(Number.isSafeInteger(amount)).toBe(true);
    const usage = await getConsoleData("default", "usage").usage.summary();
    expect(Number.isSafeInteger(usage.totals["30d"].spendMicroUsd)).toBe(true);
  });

  it("test_mockdata_usage_totalsmatchseries", async () => {
    const usage = await getConsoleData("default", "usage").usage.summary();
    for (const range of ["7d", "30d", "90d"] as const) {
      const sum = usage.series[range].reduce((total, point) => total + point.value, 0);
      expect(usage.totals[range].characters).toBe(sum);
    }
    expect(usage.series["7d"]).toHaveLength(7);
  });

  it("test_mockdata_screens_everyregisteredstateisaknownstate", () => {
    for (const screen of CONSOLE_SCREENS) {
      expect(screen.states).toContain("default");
      expect(screen.states).toContain("error");
      for (const state of screen.states) expect(SCREEN_STATES).toContain(state);
    }
  });
});

describe("mock keys", () => {
  it("test_mockdata_buildmockkey_hasthelivekeyshape", () => {
    const { prefix, secret } = buildMockKey(3);
    expect(prefix).toMatch(/^yy_live_[a-z0-9]{8}$/);
    expect(secret).toMatch(/^yy_live_[a-z0-9]{8}_[a-z0-9]{32}$/);
    expect(secret.startsWith(prefix)).toBe(true);
  });

  it("test_mockdata_source_holdsnokeyliteral", () => {
    // Built at runtime so this file holds no literal that matches the secret scanner.
    const pattern = new RegExp(["yy_(live|test)_", "[A-Za-z0-9_-]{16,}"].join(""));
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
    const roots = [join(import.meta.dirname, "../../src"), import.meta.dirname];
    for (const file of roots.flatMap(walk).filter((path) => /\.(ts|tsx|json)$/.test(path))) {
      expect(pattern.test(readFileSync(file, "utf8")), file).toBe(false);
    }
  });
});
