// DC-08 unit_docs_tokens_matchconsole_nodriftorrawvalues
// DC-09 unit_docs_fonts_selfhosted_noexternalrequests
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSource, scanTree } from "../support/rawvalues";

const SRC = join(import.meta.dirname, "../../src");
const TOKENS = join(SRC, "styles/tokens.css");
const CONSOLE_TOKENS = join(import.meta.dirname, "../../../console/src/styles/tokens.css");

describe("docs design tokens", () => {
  it("test_tokens_docscopy_identicaltoconsole", () => {
    expect(readFileSync(TOKENS, "utf8")).toBe(readFileSync(CONSOLE_TOKENS, "utf8"));
  });

  it("test_rawvalues_scantree_srcoutsidetokens_hasnorawvalues", () => {
    expect(scanTree(SRC, TOKENS)).toEqual([]);
  });

  it("test_rawvalues_scansource_deliberateviolation_isrejected", () => {
    expect(scanSource("a.css", "a { color: #F5A524; padding: 13px; }")).toHaveLength(2);
  });
});

describe("docs fonts", () => {
  it("test_fonts_files_allwoff2withofltext", () => {
    const files = readdirSync(join(SRC, "fonts"));
    expect(files.filter((f) => f.endsWith(".woff2")).length).toBeGreaterThanOrEqual(7);
    for (const f of [
      "OFL-IBM-Plex-Sans.txt",
      "OFL-IBM-Plex-Sans-Devanagari.txt",
      "OFL-IBM-Plex-Mono.txt",
    ]) {
      expect(existsSync(join(SRC, "fonts", f))).toBe(true);
    }
  });

  it("test_fonts_source_noremotefonthost", () => {
    const sources = ["app/fonts.ts", "app/layout.tsx", "styles/tokens.css", "styles/globals.css"]
      .map((f) => readFileSync(join(SRC, f), "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/fonts\.googleapis|fonts\.gstatic|next\/font\/google|https?:\/\//);
    expect(readFileSync(join(SRC, "app/fonts.ts"), "utf8")).toContain("next/font/local");
  });
});
