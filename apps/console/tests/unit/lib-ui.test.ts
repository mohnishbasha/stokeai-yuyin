// CN-46 (counting helper) unit_console_textarea_counter_codepoints_matchesexpected
import { describe, expect, it } from "vitest";
import { countCodePoints } from "../../src/lib/count";
import { formatMicroUsd, percentOf } from "../../src/lib/money";
import { buildSpeechSnippets } from "../../src/lib/snippets";
import { cx } from "../../src/lib/cx";
import { tf } from "../../src/lib/messages";

describe("countCodePoints", () => {
  it("test_count_devanagari_matchesprdexamples", () => {
    expect(countCodePoints("नमस्ते")).toBe(6);
    expect(countCodePoints("आपकी EMI ₹12,450 है")).toBe(19);
  });

  it("test_count_astralandemoji_countsscalarvaluesnotutf16units", () => {
    expect("😀".length).toBe(2);
    expect(countCodePoints("😀")).toBe(1);
    expect(countCodePoints("a😀b")).toBe(3);
  });

  it("test_count_decomposedform_isnormalisedtonfcfirst", () => {
    expect(countCodePoints("e\u0301")).toBe(1);
    expect(countCodePoints("\u00e9")).toBe(1);
    // U+0958 is a composition exclusion: NFC keeps it as U+0915 U+093C, so it counts as two.
    expect(countCodePoints("\u0958")).toBe(2);
  });

  it("test_count_whitespaceandempty_arecounted", () => {
    expect(countCodePoints("")).toBe(0);
    expect(countCodePoints(" \n\t")).toBe(3);
  });
});

describe("formatMicroUsd", () => {
  it("test_money_wholecents_showstwodecimals", () => {
    expect(formatMicroUsd(12_500_000)).toBe("$12.50");
    expect(formatMicroUsd(0)).toBe("$0.00");
  });

  it("test_money_subcent_exactmodeshowssixdecimals", () => {
    expect(formatMicroUsd(1_234_567, { exact: true })).toBe("$1.234567");
    expect(formatMicroUsd(1_234_567)).toBe("$1.23");
  });

  it("test_money_negativeandbigint_areformatted", () => {
    expect(formatMicroUsd(-2_500_000)).toBe("-$2.50");
    expect(formatMicroUsd(9_007_199_254_740_993n)).toBe("$9,007,199,254.74");
  });

  it("test_money_nonintegerorunsafe_isrejected", () => {
    expect(() => formatMicroUsd(1.5)).toThrow(RangeError);
    expect(() => formatMicroUsd(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });

  it("test_money_percentof_isintegerandclamped", () => {
    expect(percentOf(25, 100)).toBe(25);
    expect(percentOf(150, 100)).toBe(100);
    expect(percentOf(-5, 100)).toBe(0);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe("buildSpeechSnippets", () => {
  it("test_snippets_build_threelanguagesusingenvplaceholder", () => {
    const snippets = buildSpeechSnippets();
    expect(snippets.map((s) => s.id)).toEqual(["curl", "typescript", "python"]);
    for (const s of snippets) {
      expect(s.code).toContain("YUYIN_API_KEY");
      expect(s.code).toContain("/v1/speech");
      expect(s.code).not.toMatch(/yy_(live|test)_/);
    }
  });
});

describe("small helpers", () => {
  it("test_cx_joins_truthyclassesonly", () => {
    expect(cx("a", false, undefined, "b", null, "")).toBe("a b");
  });

  it("test_tf_substitutes_namedparams", () => {
    expect(tf("count.over", { n: 3 })).toBe("3 over the limit");
  });
});
