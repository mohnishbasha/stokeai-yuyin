// CN-68 unit_operator_mockdata_layer_implementsinterfaces
import { describe, expect, it } from "vitest";
import { getConsoleData, loadScreen } from "../../src/lib/data";
import { MOCK_ERROR_CODE } from "../../src/lib/data/mock";
import { DataError, type OperatorApi } from "../../src/lib/data/types";
import { OPERATOR_SAMPLE_ORG_ID, OPERATOR_SCREENS, SCREEN_STATES } from "../../src/lib/screens";

describe("mock operator data", () => {
  it("test_operatordata_layer_implementsoperatorapi", () => {
    const operator: OperatorApi = getConsoleData("default", "organizations").operator;
    expect(Object.keys(operator).sort()).toEqual(
      ["abuse", "audit", "customVoices", "fleet", "ledger", "orgs"].sort(),
    );
  });

  it("test_operatordata_default_returnsrowsforeveryscreen", async () => {
    const { operator } = getConsoleData("default", "organizations");
    expect((await operator.orgs.list()).length).toBeGreaterThan(5);
    expect((await operator.ledger.overview()).recent.length).toBeGreaterThan(0);
    expect((await operator.abuse.cases()).length).toBeGreaterThan(0);
    expect((await operator.customVoices.queue()).length).toBeGreaterThan(0);
    expect((await operator.fleet.capacity()).nodes.length).toBeGreaterThan(0);
    expect((await operator.audit.entries()).length).toBeGreaterThan(0);
  });

  it("test_operatordata_empty_returnsnorows", async () => {
    const { operator } = getConsoleData("empty", "organizations");
    expect(await operator.orgs.list()).toEqual([]);
    expect(await operator.abuse.cases()).toEqual([]);
    expect(await operator.customVoices.queue()).toEqual([]);
    expect(await operator.audit.entries()).toEqual([]);
  });

  it("test_operatordata_money_isintegermicrousd", async () => {
    const { operator } = getConsoleData("default", "organizations");
    const ledger = await operator.ledger.overview();
    const amounts = [
      ...(await operator.orgs.list()).map((o) => o.balanceMicroUsd),
      ...ledger.recent.map((r) => r.amountMicroUsd),
    ];
    for (const amount of amounts) expect(Number.isSafeInteger(amount)).toBe(true);
  });

  it("test_operatordata_keys_exposeprefixandlast4only", async () => {
    const detail = await getConsoleData("default", "organization").operator.orgs.get(
      OPERATOR_SAMPLE_ORG_ID,
    );
    expect(detail?.keys.length).toBeGreaterThan(0);
    for (const key of detail?.keys ?? []) {
      expect(key.prefix).toMatch(/^yy_live_[a-z0-9]{8}$/);
      expect(Object.keys(key)).not.toContain("secret");
      expect(Object.keys(key)).not.toContain("hash");
    }
  });

  it("test_operatordata_unknownorganization_readsasnotfound", async () => {
    const { operator } = getConsoleData("default", "organization");
    expect(await operator.orgs.get("org_missing")).toBeNull();
    expect(
      await getConsoleData("not-found", "organization").operator.orgs.get(OPERATOR_SAMPLE_ORG_ID),
    ).toBeNull();
  });

  it("test_operatordata_suspendedflag_suspendsthesampleorganization", async () => {
    const detail = await getConsoleData("suspended", "organization").operator.orgs.get(
      OPERATOR_SAMPLE_ORG_ID,
    );
    expect(detail?.org.status).toBe("suspended");
  });

  it("test_operatordata_error_throwsdataerrorwithcodeandtrace", async () => {
    const layer = getConsoleData("error", "audit");
    const failure = await layer.operator.audit.entries().catch((caught: unknown) => caught);
    expect(failure).toBeInstanceOf(DataError);
    expect((failure as DataError).code).toBe(MOCK_ERROR_CODE);
    expect((await loadScreen("error", layer, (d) => d.operator.audit.entries())).status).toBe(
      "error",
    );
  });

  it("test_operatordata_screens_everyregisteredstateisaknownstate", () => {
    for (const def of OPERATOR_SCREENS) {
      expect(def.states).toContain("default");
      expect(def.states).toContain("error");
      for (const state of def.states) expect(SCREEN_STATES).toContain(state);
    }
  });
});
