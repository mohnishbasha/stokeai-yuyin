// CN-39 unit_console_fonts_selfhosted_noexternalrequests
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../src");
const FONTS = join(SRC, "fonts");

describe("self-hosted fonts", () => {
  it("test_fonts_files_allwoff2withofltext", () => {
    const files = readdirSync(FONTS);
    expect(files.filter((f) => f.endsWith(".woff2")).length).toBeGreaterThanOrEqual(7);
    for (const f of [
      "OFL-IBM-Plex-Sans.txt",
      "OFL-IBM-Plex-Sans-Devanagari.txt",
      "OFL-IBM-Plex-Mono.txt",
    ]) {
      expect(readFileSync(join(FONTS, f), "utf8")).toContain("SIL Open Font License, Version 1.1");
    }
  });

  it("test_fonts_devanagari_weights400500600present", () => {
    for (const w of ["400", "500", "600"]) {
      expect(existsSync(join(FONTS, `ibm-plex-sans-devanagari-devanagari-${w}-normal.woff2`))).toBe(
        true,
      );
    }
  });

  it("test_fonts_source_noremotefonthost", () => {
    const sources = [
      readFileSync(join(SRC, "app/fonts.ts"), "utf8"),
      readFileSync(join(SRC, "app/layout.tsx"), "utf8"),
      readFileSync(join(SRC, "styles/tokens.css"), "utf8"),
      readFileSync(join(SRC, "styles/globals.css"), "utf8"),
    ].join("\n");
    expect(sources).not.toMatch(/fonts\.googleapis|fonts\.gstatic|next\/font\/google|https?:\/\//);
    expect(readFileSync(join(SRC, "app/fonts.ts"), "utf8")).toContain("next/font/local");
  });

  it("test_fonts_tokens_devanagarifallsthroughafterlatin", () => {
    const tokens = readFileSync(join(SRC, "styles/tokens.css"), "utf8");
    expect(tokens).toMatch(
      /--font-sans-stack:[^;]*var\(--font-plex-sans\)[^;]*var\(--font-plex-devanagari\)[^;]*Noto Sans Devanagari[^;]*sans-serif/s,
    );
    expect(tokens).toMatch(/--font-mono-stack:[^;]*var\(--font-plex-mono\)[^;]*ui-monospace/s);
  });
});
