import { describe, expect, it } from "vitest";
import { t } from "../../src/lib/messages";

describe("messages", () => {
  it("test_messages_t_knownkey_returnsenglishstring", () => {
    expect(t("brand.name")).toBe("Yuyin");
  });

  it("test_messages_t_hindisample_containsdevanagari", () => {
    expect(t("home.sampleHi")).toMatch(/\p{Script=Devanagari}/u);
  });

  it("test_messages_t_everyvalue_isnonempty", () => {
    for (const key of ["home.title", "home.lead", "nav.skip", "theme.toggle"] as const) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });
});
