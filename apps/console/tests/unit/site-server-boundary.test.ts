// MK-04 unit_site_pages_servercomponents_nofunctionpropstoclient. A server page that hands a
// function (render, rowKey) to a "use client" component makes `next start` answer HTTP 500 on
// every request, which the dev server and jsdom tests do not show. Found by the CI Lighthouse step.
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../src");
const MARKETING = join(SRC, "app/(marketing)");

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

function isClient(file: string): boolean {
  return /^\s*["']use client["']/.test(readFileSync(file, "utf8"));
}

describe("marketing pages are server components", () => {
  it.each(pages(MARKETING))("test_site_%s_importsnoclientcomponentwithfunctions", (page) => {
    const source = readFileSync(page, "utf8");
    expect(isClient(page)).toBe(false);
    const imports = [...source.matchAll(/from "(\.[^"]+)"/g)].map((m) => m[1] as string);
    const clientImports = imports
      .map((spec) => resolve(join(page, ".."), spec))
      .filter((base) =>
        ["tsx", "ts"].some((ext) => {
          try {
            return isClient(`${base}.${ext}`);
          } catch {
            return false;
          }
        }),
      );
    // Client components may be imported only when no function is passed to them.
    if (clientImports.length > 0) {
      expect(source).not.toMatch(/\browKey=|\brender:|\bonClick=|\bonPageChange=/);
    }
  });
});
