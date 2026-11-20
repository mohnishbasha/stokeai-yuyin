// CN-37 unit_console_tokens_themes_darkdefaultlightavailable
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(import.meta.dirname, "../../src/styles/tokens.css"), "utf8");

/** Returns the declarations of the first block whose selector text equals `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out[m[1] as string] = (m[2] as string).trim();
  }
  return out;
}

const DARK: Record<string, string> = {
  "--bg-0": "#0B0D10",
  "--bg-1": "#12151A",
  "--bg-2": "#1A1E25",
  "--bg-3": "#242A33",
  "--line": "#2B323C",
  "--line-strong": "#6B7686",
  "--text-0": "#F2F4F7",
  "--text-1": "#B4BCC8",
  "--text-2": "#7C8696",
  "--accent": "#F5A524",
  "--accent-ink": "#1A1200",
  "--accent-dim": "#F5A52433",
  "--ok": "#3DD68C",
  "--warn": "#F5A524",
  "--err": "#F2555A",
  "--info": "#5AA9F2",
};

const LIGHT: Record<string, string> = {
  "--bg-0": "#FBFAF7",
  "--bg-1": "#FFFFFF",
  "--bg-2": "#F3F1EC",
  "--bg-3": "#E9E6DF",
  "--line": "#DAD6CC",
  "--line-strong": "#7A828E",
  "--text-0": "#14171C",
  "--text-1": "#474E5A",
  "--text-2": "#5F6775",
  "--accent": "#9A5A00",
  "--accent-ink": "#FFFFFF",
  "--accent-dim": "#9A5A0026",
  "--ok": "#1A7F4E",
  "--warn": "#8A5A00",
  "--err": "#B02E33",
  "--info": "#2A6FB8",
};

const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96];

describe("design tokens", () => {
  it("test_tokens_root_darkisdefault_matchesdesign21", () => {
    expect(block(":root")).toMatchObject(DARK);
  });

  it("test_tokens_datathemelight_lightisavailable_matchesdesign22", () => {
    expect(block(':root[data-theme="light"]')).toEqual(LIGHT);
  });

  it("test_tokens_datathemedark_explicitdark_matchesdefault", () => {
    expect(block(':root[data-theme="dark"]')).toMatchObject(DARK);
  });

  it("test_tokens_osprefersLight_appliesonlywhenthemeunchosen", () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme\]\) \{/,
    );
    const media = css.slice(css.indexOf("@media (prefers-color-scheme: light)"));
    for (const [name, value] of Object.entries(LIGHT)) {
      expect(media).toContain(`${name}: ${value};`);
    }
  });

  it("test_tokens_spacingscale_matchesdesign41", () => {
    const root = block(":root");
    SPACE.forEach((px, i) => {
      expect(root[`--space-${String(i + 1)}`]).toBe(`${String(px)}px`);
    });
    expect(root["--radius-control"]).toBe("6px");
    expect(root["--radius-panel"]).toBe("10px");
  });

  it("test_tokens_typescale_matchesdesign32", () => {
    const root = block(":root");
    expect(root["--text-display-size"]).toBe("44px");
    expect(root["--text-display-line"]).toBe("52px");
    expect(root["--text-body-size"]).toBe("15px");
    expect(root["--text-body-line"]).toBe("24px");
    expect(root["--text-small-line"]).toBe("20px");
    expect(root["--line-extra-hi"]).toBe("4px");
    expect(root["--weight-regular"]).toBe("400");
    expect(root["--weight-medium"]).toBe("500");
    expect(root["--weight-semibold"]).toBe("600");
  });

  it("test_tokens_shadows_noneexist", () => {
    expect(css).not.toMatch(/(?:box-shadow|backdrop-filter)\s*:/);
  });
});
