// MK-02 unit_site_pricing_configfile_rendersvalues
// MK-05 unit_site_toml_parse_subsetandmalformed
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMicroUsd } from "../../src/lib/money";
import { loadPricing } from "../../src/lib/pricing";
import { parseToml } from "../../src/lib/toml";
import { renderPage, visibleText } from "../support/pages";

const REAL_CONFIG = join(import.meta.dirname, "../../../../config/pricing.toml");

afterEach(() => vi.unstubAllEnvs());

describe("toml subset", () => {
  it("test_toml_parse_tablesintegersstringscomments_areread", () => {
    const parsed = parseToml(
      [
        "# comment",
        "unit = 1000 # trailing",
        'name = "a # b"',
        "big = 5_000_000",
        "[rates]",
        "opus = 2000",
        "[grant]",
        "chars = 7",
      ].join("\n"),
    );
    expect(parsed).toEqual({
      unit: 1000,
      name: "a # b",
      big: 5000000,
      rates: { opus: 2000 },
      grant: { chars: 7 },
    });
  });

  it.each(["key", "key = ", "[unclosed", "a = 1\na = 2", "x = 1.5", "y = [1]"])(
    "test_toml_parse_malformed_%s_throws",
    (text) => {
      expect(() => parseToml(text)).toThrow();
    },
  );
});

describe("pricing config", () => {
  it("test_pricing_load_realfile_hasratesminimumandgrant", () => {
    const pricing = loadPricing(REAL_CONFIG);
    expect(pricing).toBeDefined();
    expect(pricing?.unitCharacters).toBe(1000);
    expect(Object.keys(pricing?.rates ?? {}).sort()).toEqual(["opus", "pcm", "wav"]);
  });

  it("test_pricing_load_missingfile_returnsundefined", () => {
    expect(loadPricing(join(tmpdir(), "does-not-exist-pricing.toml"))).toBeUndefined();
  });

  it("test_pricing_load_placeholderfile_returnsundefined", () => {
    const dir = mkdtempSync(join(tmpdir(), "yuyin-pricing-"));
    const file = join(dir, "pricing.toml");
    writeFileSync(file, "# Placeholder from Sprint 0.\n");
    expect(loadPricing(file)).toBeUndefined();
  });
});

describe("pricing page", () => {
  it("test_site_pricing_page_rendersevery_value_fromthefile", () => {
    const pricing = loadPricing(REAL_CONFIG);
    if (pricing === undefined) throw new Error("pricing.toml must parse");
    const text = visibleText(renderPage("/pricing"));
    for (const rate of Object.values(pricing.rates)) {
      expect(text).toContain(formatMicroUsd(rate, { exact: true }));
    }
    expect(text).toContain(formatMicroUsd(pricing.minTopUpMicroUsd));
    expect(text).toContain(pricing.launchGrant.characters.toLocaleString("en-US"));
    expect(text).toContain(pricing.launchGrant.verifiedSignups.toLocaleString("en-US"));
  });

  it("test_site_pricing_page_followsachangedfile", () => {
    const dir = mkdtempSync(join(tmpdir(), "yuyin-pricing-"));
    writeFileSync(
      join(dir, "pricing.toml"),
      [
        "unit_characters = 1000",
        "min_topup_micro_usd = 12340000",
        "[rate_micro_usd]",
        "opus = 3333",
        "pcm = 4444",
        "wav = 5555",
        "[launch_grant]",
        "characters = 424242",
        "verified_signups = 77",
      ].join("\n"),
    );
    vi.stubEnv("YUYIN_CONFIG_DIR", dir);
    const text = visibleText(renderPage("/pricing"));
    for (const expected of ["$0.003333", "$0.004444", "$0.005555", "$12.34", "424,242", "77"]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toContain("$0.002000");
  });

  it("test_site_pricing_page_missingconfig_showsnotpublished_andnocards", () => {
    vi.stubEnv("YUYIN_CONFIG_DIR", join(tmpdir(), "no-such-dir"));
    const text = visibleText(renderPage("/pricing"));
    expect(text).toContain("Pricing is not published yet.");
    expect(text).not.toContain("Pay as you go");
    expect(text).not.toMatch(/\$\d/);
  });
});
