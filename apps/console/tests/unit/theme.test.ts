// CN-37 unit_console_tokens_themes_darkdefaultlightavailable (theme selection logic)
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  nextTheme,
  parseTheme,
  themeCookie,
} from "../../src/lib/theme";

describe("theme", () => {
  it("test_theme_default_isdark", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("test_theme_parse_knownvalues_returnedunknownundefined", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("sepia")).toBeUndefined();
    expect(parseTheme(undefined)).toBeUndefined();
    expect(parseTheme(null)).toBeUndefined();
  });

  it("test_theme_next_flipsbetweenlightanddark", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });

  it("test_theme_cookie_hasnamevaluepathsamesiteandmaxage", () => {
    const cookie = themeCookie("light");
    expect(cookie).toContain(`${THEME_COOKIE}=light`);
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("samesite=lax");
    expect(cookie).toMatch(/max-age=\d+/);
  });
});
