// MK-04 unit_site_legal_pages_draftbanner_onunlessoff
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPage, visibleText } from "../support/pages";

const LEGAL = ["/terms", "/privacy", "/acceptable-use", "/refunds"];
afterEach(() => vi.unstubAllEnvs());

describe("legal pages", () => {
  it.each(LEGAL)("test_site_legal_%s_unset_showsdraftbanner", (path) => {
    vi.stubEnv("LEGAL_DRAFT_BANNER", "");
    expect(visibleText(renderPage(path))).toContain("Draft, pending legal review");
  });

  it.each(LEGAL)("test_site_legal_%s_on_showsdraftbanner", (path) => {
    vi.stubEnv("LEGAL_DRAFT_BANNER", "on");
    expect(visibleText(renderPage(path))).toContain("Draft, pending legal review");
  });

  it.each(LEGAL)("test_site_legal_%s_off_hidesdraftbanner", (path) => {
    vi.stubEnv("LEGAL_DRAFT_BANNER", "off");
    expect(visibleText(renderPage(path))).not.toContain("Draft, pending legal review");
  });

  it("test_site_legal_nonlegalpages_nevershowbanner", () => {
    vi.stubEnv("LEGAL_DRAFT_BANNER", "on");
    for (const path of ["/", "/pricing", "/faq", "/about"]) {
      expect(visibleText(renderPage(path))).not.toContain("Draft, pending legal review");
    }
  });
});
