// CN-38 unit_console_styles_rawvalues_lintrejects
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSource, scanTree } from "../support/rawvalues";

const SRC = join(import.meta.dirname, "../../src");
const TOKENS = join(SRC, "styles/tokens.css");

describe("raw value scanner", () => {
  it("test_rawvalues_scansource_hexcolour_isreported", () => {
    const found = scanSource("a.css", ".a { color: #F5A524; }");
    expect(found).toEqual([{ file: "a.css", line: 1, kind: "hex-colour", text: "#F5A524" }]);
  });

  it("test_rawvalues_scansource_colourfunction_isreported", () => {
    expect(scanSource("a.ts", 'const c = "rgb(1, 2, 3)";').map((f) => f.kind)).toEqual([
      "colour-function",
    ]);
    expect(scanSource("a.ts", 'const c = "hsl(10 20% 30%)";').map((f) => f.kind)).toEqual([
      "colour-function",
    ]);
  });

  it("test_rawvalues_scansource_pxandremliterals_arereported", () => {
    expect(scanSource("a.css", "a { padding: 13px; }").map((f) => f.text)).toEqual(["13px"]);
    expect(scanSource("a.tsx", '<p className="p-[7px]" />').map((f) => f.kind)).toEqual([
      "px-literal",
    ]);
    expect(scanSource("a.css", "a { margin: 1.5rem; }").map((f) => f.kind)).toEqual([
      "rem-literal",
    ]);
  });

  it("test_rawvalues_scansource_tokenreferences_areaccepted", () => {
    const source = [
      ".a { color: var(--text-0); padding: var(--space-4); }",
      'const cls = "bg-bg-1 text-text-0 p-4";',
      "const id = abc123; // anchor #main-content",
    ].join("\n");
    expect(scanSource("a.tsx", source)).toEqual([]);
  });

  it("test_rawvalues_scansource_reportsline_numbers", () => {
    const found = scanSource("a.css", "a {}\nb { color: #fff; }");
    expect(found[0]?.line).toBe(2);
  });
});

describe("console source tree", () => {
  it("test_rawvalues_scantree_srcoutsidetokens_hasnorawvalues", () => {
    expect(scanTree(SRC, TOKENS)).toEqual([]);
  });

  it("test_rawvalues_scantree_tokensfile_isthesourceofrawvalues", () => {
    const own = scanTree(SRC, join(SRC, "nothing.css")).filter(
      (f) => f.file === "styles/tokens.css",
    );
    expect(own.length).toBeGreaterThan(0);
  });
});
