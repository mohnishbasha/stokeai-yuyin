// Scans source text for raw colour, type, and spacing values (DESIGN 2 to 4). Only
// src/styles/tokens.css may hold them; everything else references a token.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export interface RawValueFinding {
  readonly file: string;
  readonly line: number;
  readonly kind: "hex-colour" | "colour-function" | "px-literal" | "rem-literal";
  readonly text: string;
}

const RULES: readonly { kind: RawValueFinding["kind"]; pattern: RegExp }[] = [
  { kind: "hex-colour", pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g },
  { kind: "colour-function", pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g },
  { kind: "px-literal", pattern: /(?<![\w.-])-?\d*\.?\d+px\b/g },
  { kind: "rem-literal", pattern: /(?<![\w.-])-?\d*\.?\d+r?em\b/g },
];

/** Returns every raw value found in `source`, with 1-based line numbers. */
export function scanSource(file: string, source: string): RawValueFinding[] {
  const findings: RawValueFinding[] = [];
  source.split("\n").forEach((text, index) => {
    for (const { kind, pattern } of RULES) {
      for (const match of text.matchAll(pattern)) {
        findings.push({ file, line: index + 1, kind, text: match[0] });
      }
    }
  });
  return findings;
}

const SCANNED = /\.(?:css|ts|tsx|js|jsx|mjs)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Scans every style and script file under `root`, skipping the tokens file. */
export function scanTree(root: string, tokensFile: string): RawValueFinding[] {
  return walk(root)
    .filter((path) => SCANNED.test(path) && path !== tokensFile)
    .flatMap((path) =>
      scanSource(relative(root, path).split(sep).join("/"), readFileSync(path, "utf8")),
    );
}
